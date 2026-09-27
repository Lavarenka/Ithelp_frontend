"""Вход через Google и GitHub (OAuth 2.0, "authorization code").

Как проходит вход:
1. Кнопка на сайте ведёт на GET /auth/oauth/{provider}/login. Здесь мы
   генерируем случайный state (защита от подделки запроса — CSRF), кладём его
   в cookie и перенаправляем человека на страницу Google/GitHub «Разрешить
   доступ?».
2. Google/GitHub возвращают человека на GET /auth/oauth/{provider}/callback с
   одноразовым code и тем же state. Сверяем state с cookie.
3. Меняем code на access token провайдера (для этого нужен client_secret —
   он есть только у бэкенда) и по нему получаем id аккаунта, email и имя.
4. Находим или создаём пользователя сайта (_find_or_create_user), выдаём наш
   обычный JWT и отправляем человека на фронтенд: {frontend}/auth/callback#token=...
   Токен — во фрагменте (#), а не в ?query: фрагмент браузер не отправляет на
   сервер, поэтому токен не попадает в логи сервера и заголовок Referer.
   Ошибки — туда же, как #error=<код> (см. OAuthCallbackPage.jsx).

HTTP-запросы к Google/GitHub — через стандартный urllib, без новых зависимостей.
"""

import base64
import json
import logging
import re
import secrets
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import OAuthAccount, User
from app.security import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/oauth", tags=["oauth"])

STATE_COOKIE = "oauth_state"
STATE_TTL_SECONDS = 10 * 60
HTTP_TIMEOUT_SECONDS = 10
USER_AGENT = "it_hlp"  # GitHub API отклоняет запросы без User-Agent


PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scope": "openid email profile",
        # select_account — всегда показывать выбор аккаунта Google, а не
        # молча входить под последним (удобно, если у человека их несколько).
        "extra_params": {"prompt": "select_account"},
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "scope": "read:user user:email",
        "extra_params": {},
    },
}


class OAuthError(Exception):
    """code уходит на фронтенд (#error=code) — там по нему показывается
    переведённое сообщение (auth.oauthErrors.<code> в локалях)."""

    def __init__(self, code: str, log_message: str | None = None):
        super().__init__(log_message or code)
        self.code = code


def _credentials(provider: str) -> tuple[str, str]:
    if provider == "google":
        return settings.google_client_id, settings.google_client_secret
    return settings.github_client_id, settings.github_client_secret


def _is_configured(provider: str) -> bool:
    client_id, client_secret = _credentials(provider)
    return bool(client_id.strip() and client_secret.strip())


def _redirect_uri(provider: str) -> str:
    return f"{settings.backend_base_url.rstrip('/')}/auth/oauth/{provider}/callback"


def _frontend_redirect(fragment: dict) -> RedirectResponse:
    url = f"{settings.frontend_base_url.rstrip('/')}/auth/callback#{urllib.parse.urlencode(fragment)}"
    response = RedirectResponse(url, status_code=302)
    response.delete_cookie(STATE_COOKIE, path="/auth/oauth")
    return response


def _http_json(url: str, *, data: dict | None = None, token: str | None = None):
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    request = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        details = exc.read()[:500]
        raise OAuthError("oauth_failed", f"{url} -> HTTP {exc.code}: {details!r}") from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise OAuthError("oauth_failed", f"{url} -> {exc}") from exc


def _exchange_code(provider: str, code: str) -> str:
    client_id, client_secret = _credentials(provider)
    result = _http_json(
        PROVIDERS[provider]["token_url"],
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": _redirect_uri(provider),
            "grant_type": "authorization_code",
        },
    )
    access_token = result.get("access_token") if isinstance(result, dict) else None
    if not access_token:
        # GitHub на ошибку отвечает 200 с {"error": "..."} — отсюда явная проверка.
        raise OAuthError("oauth_failed", f"{provider}: нет access_token в ответе: {result!r}")
    return access_token


@dataclass
class ExternalProfile:
    provider_user_id: str
    email: str | None  # только ПОДТВЕРЖДЁННЫЙ провайдером email, иначе None
    username_hint: str
    avatar_url: str | None = None


# --- Аватарка из Google/GitHub ---
# Скачиваем картинку один раз, при первой привязке аккаунта, и храним так же,
# как загруженную вручную: data-URI в users.avatar (см. models/user.py). Ссылку
# на картинку Google/GitHub напрямую не храним — она может протухнуть, а
# браузер посетителя ходил бы за ней на чужой сервер.
AVATAR_TIMEOUT_SECONDS = 5
# Качаем только с серверов картинок самих Google/GitHub: адрес приходит в
# ответе провайдера, но лишняя проверка не даёт заставить наш сервер сходить
# на произвольный адрес.
AVATAR_ALLOWED_HOST_SUFFIXES = (".googleusercontent.com", ".githubusercontent.com")
# Тип определяем по первым байтам файла, а не по заголовку Content-Type —
# так в users.avatar гарантированно попадает только картинка разрешённого
# типа (тот же список, что и у ручной загрузки, см. schemas/user.py).
_IMAGE_SIGNATURES = (
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"\xff\xd8\xff", "jpeg"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
)


def _sniff_image_type(data: bytes) -> str | None:
    for signature, kind in _IMAGE_SIGNATURES:
        if data.startswith(signature):
            return kind
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _download_avatar(url: str | None) -> str | None:
    """data-URI картинки или None. Любая проблема (не тот адрес, сеть,
    слишком большой файл, не картинка) — просто без аватарки: вход из-за этого
    ломаться не должен."""
    if not url:
        return None
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not host.endswith(AVATAR_ALLOWED_HOST_SUFFIXES):
        logger.warning("OAuth: аватарка с неожиданного адреса пропущена: %s", url)
        return None

    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=AVATAR_TIMEOUT_SECONDS) as response:
            data = response.read(settings.avatar_max_bytes + 1)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.warning("OAuth: не удалось скачать аватарку %s: %s", url, exc)
        return None

    if len(data) > settings.avatar_max_bytes:
        logger.warning("OAuth: аватарка больше лимита avatar_max_bytes, пропущена: %s", url)
        return None
    kind = _sniff_image_type(data)
    if kind is None:
        logger.warning("OAuth: по адресу аватарки не картинка, пропущена: %s", url)
        return None
    return f"data:image/{kind};base64,{base64.b64encode(data).decode()}"


def _sized_avatar_url(provider: str, url: str | None) -> str | None:
    """По умолчанию Google отдаёт картинку 96x96 — на странице профиля она
    выглядела бы мыльной. Оба сервиса умеют отдавать нужный размер по адресу."""
    if not url:
        return None
    if provider == "google":
        # .../photo=s96-c → .../photo=s256-c (квадрат 256x256)
        return re.sub(r"=s\d+(-c)?$", "=s256-c", url) if re.search(r"=s\d+(-c)?$", url) else url
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}s=256"


def _fetch_profile(provider: str, access_token: str) -> ExternalProfile:
    if provider == "google":
        info = _http_json("https://openidconnect.googleapis.com/v1/userinfo", token=access_token)
        email = info.get("email") if info.get("email_verified") else None
        hint = (info.get("email") or "").split("@")[0] or info.get("name") or "user"
        return ExternalProfile(str(info["sub"]), email, hint, _sized_avatar_url(provider, info.get("picture")))

    info = _http_json("https://api.github.com/user", token=access_token)
    # Публичный email в профиле GitHub может быть пустым или неподтверждённым —
    # берём основной подтверждённый адрес из отдельного списка.
    emails = _http_json("https://api.github.com/user/emails", token=access_token)
    verified = [e for e in emails if isinstance(e, dict) and e.get("verified")]
    primary = next((e for e in verified if e.get("primary")), verified[0] if verified else None)
    return ExternalProfile(
        str(info["id"]),
        primary["email"] if primary else None,
        info.get("login") or "user",
        _sized_avatar_url(provider, info.get("avatar_url")),
    )


def _unique_username(db: Session, hint: str) -> str:
    """Имя пользователя из логина GitHub / начала email Google: только
    латиница, цифры, _ . - (как у обычной регистрации — без пробелов), не
    короче 3 символов, и с числовым суффиксом, если такое имя уже занято."""
    base = re.sub(r"[^A-Za-z0-9_.-]", "", hint)[:40] or "user"
    if len(base) < 3:
        base = f"{base}user"[:40]
    candidate, n = base, 1
    while db.execute(select(User.id).where(User.username == candidate)).first():
        n += 1
        candidate = f"{base}{n}"
    return candidate


def _find_or_create_user(db: Session, provider: str, profile: ExternalProfile) -> User:
    # 1. Этот аккаунт Google/GitHub уже привязан — входим в привязанного пользователя.
    link = db.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == profile.provider_user_id,
        )
    ).scalar_one_or_none()
    if link is not None:
        return link.user

    # Дальше нужен подтверждённый email: без него нельзя ни безопасно привязать
    # к существующему аккаунту, ни завести новый (email у нас обязателен).
    if not profile.email:
        raise OAuthError("oauth_no_email")

    # 2. Есть пользователь с таким email (например, зарегистрировался по
    #    паролю) — привязываем к нему. Безопасно, потому что email подтвердил
    #    сам Google/GitHub; по той же причине считаем почту подтверждённой.
    user = db.execute(
        select(User).where(func.lower(User.email) == profile.email.lower())
    ).scalar_one_or_none()

    # 3. Нет такого — создаём нового, без пароля.
    if user is None:
        is_first_user = db.execute(select(User.id).limit(1)).scalar_one_or_none() is None
        user = User(
            username=_unique_username(db, profile.username_hint),
            email=profile.email,
            hashed_password="",
            role="admin" if is_first_user else "user",  # как в обычной регистрации
            email_verified=True,
        )
        db.add(user)
        db.flush()
    else:
        user.email_verified = True

    # Аватарку берём только при первой привязке и только если своей у
    # пользователя нет: выбранную вручную не перетираем, а если человек потом
    # удалит аватарку в профиле, следующий вход через Google её не вернёт.
    if not user.avatar:
        user.avatar = _download_avatar(profile.avatar_url)

    db.add(OAuthAccount(user_id=user.id, provider=provider, provider_user_id=profile.provider_user_id))
    db.commit()
    db.refresh(user)
    return user


@router.get("/providers")
def list_providers() -> dict:
    """Какие способы входа включены (заданы ключи в .env) — фронтенд
    показывает кнопки только для них."""
    return {"providers": [name for name in PROVIDERS if _is_configured(name)]}


@router.get("/{provider}/login")
def oauth_login(provider: str):
    if provider not in PROVIDERS:
        return _frontend_redirect({"error": "oauth_failed"})
    if not _is_configured(provider):
        return _frontend_redirect({"error": "oauth_not_configured"})

    state = secrets.token_urlsafe(32)
    config = PROVIDERS[provider]
    params = {
        "client_id": _credentials(provider)[0],
        "redirect_uri": _redirect_uri(provider),
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
        **config["extra_params"],
    }
    response = RedirectResponse(f"{config['authorize_url']}?{urllib.parse.urlencode(params)}", status_code=302)
    # httponly — cookie недоступна JS; samesite=lax — браузер пришлёт её при
    # возврате с Google/GitHub (это обычный переход по ссылке); path — только
    # для этих эндпоинтов. secure — когда бэкенд работает по https.
    response.set_cookie(
        STATE_COOKIE,
        state,
        max_age=STATE_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=settings.backend_base_url.startswith("https://"),
        path="/auth/oauth",
    )
    return response


@router.get("/{provider}/callback")
def oauth_callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        if provider not in PROVIDERS or not _is_configured(provider):
            raise OAuthError("oauth_failed", f"callback для неизвестного/выключенного провайдера {provider}")
        if error:
            # access_denied — человек нажал «Отмена» на странице Google/GitHub.
            raise OAuthError("oauth_cancelled" if error == "access_denied" else "oauth_failed", f"{provider}: {error}")

        expected_state = request.cookies.get(STATE_COOKIE)
        if not state or not expected_state or not secrets.compare_digest(state, expected_state):
            raise OAuthError("oauth_state_mismatch", f"{provider}: state не совпал с cookie")
        if not code:
            raise OAuthError("oauth_failed", f"{provider}: нет code в callback")

        access_token = _exchange_code(provider, code)
        profile = _fetch_profile(provider, access_token)
        user = _find_or_create_user(db, provider, profile)
        if not user.is_active:
            raise OAuthError("oauth_blocked")
    except OAuthError as exc:
        db.rollback()
        logger.warning("OAuth %s: %s (%s)", provider, exc.code, exc)
        return _frontend_redirect({"error": exc.code})

    return _frontend_redirect({"token": create_access_token(subject=str(user.id))})
