from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.captcha import create_captcha, verify_captcha
from app.database import get_db
from app.deps import get_current_user
from app.login_attempts import needs_captcha, record_failure, record_success
from app.mailer import send_verification_email
from app.models import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserOut,
    TokenOut,
    CaptchaOut,
    EmailVerifyOut,
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_email_verification_token,
    decode_email_verification_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _dispatch_verification_email(user_id: int, email: str, username: str) -> None:
    """Обёртка для BackgroundTasks — генерирует токен и шлёт письмо уже
    ПОСЛЕ того, как ответ на /auth/register ушёл клиенту, чтобы не заставлять
    пользователя ждать SMTP round-trip перед тем как попасть на сайт."""
    token = create_email_verification_token(user_id, email)
    send_verification_email(email, username, token)


@router.get("/captcha", response_model=CaptchaOut)
def get_captcha():
    """Выдаёт новый challenge для капчи "реши пример" — см. app/captcha.py.
    Дергается фронтендом при показе формы регистрации, а на логине — как
    только бэкенд ответит login_required_captcha=true (см. ниже)."""
    captcha_id, question, _answer = create_captcha()
    return CaptchaOut(captcha_id=captcha_id, question=question)


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Капча на регистрации обязательна всегда — без верного challenge/ответа
    # запрос отклоняется, что бы ни было выставлено на фронтенде (чекбокс
    # там — просто UI, реальная защита именно здесь).
    if not verify_captcha(payload.captcha_id, payload.captcha_answer):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "captcha_invalid", "detail": "Капча не пройдена — обновите её и попробуйте снова"},
        )

    existing = db.execute(
        select(User).where(
            or_(User.username == payload.username, User.email == payload.email)
        )
    ).scalar_one_or_none()
    if existing is not None:
        field = "Логин" if existing.username == payload.username else "Email"
        raise HTTPException(status_code=400, detail=f"{field} уже занят")

    # Самый первый зарегистрированный пользователь становится admin —
    # чтобы на свежей базе сразу было кем управлять статьями/тегами.
    is_first_user = db.execute(select(User.id).limit(1)).scalar_one_or_none() is None

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="admin" if is_first_user else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Письмо отправляется в фоне (после ответа) — см. _dispatch_verification_email.
    # Само подтверждение "мягкое": пользователь уже получает токен и может
    # пользоваться сайтом прямо сейчас, не дожидаясь письма (см. email_verified).
    background_tasks.add_task(_dispatch_verification_email, user.id, user.email, user.username)

    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверный логин/email или пароль",
    )

    # После нескольких неудачных попыток подряд для этого же логина — капча
    # обязательна (см. app/login_attempts.py). Ключ по самому логину, а не по
    # user.id, потому что счётчик должен расти и для несуществующих логинов —
    # иначе капчу можно обойти простым перебором несуществующих имён.
    if needs_captcha(payload.username_or_email):
        # Клиент ещё не прислал captcha_id вовсе (первая попытка после того,
        # как порог был превышен) — отдаём отдельный код, чтобы фронтенд
        # понял, что нужно запросить challenge и переспросить пользователя,
        # а не показывать это как "неверный логин/пароль".
        if payload.captcha_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "captcha_required", "detail": "Слишком много неудачных попыток — подтвердите капчу"},
            )
        if not verify_captcha(payload.captcha_id, payload.captcha_answer):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "captcha_invalid", "detail": "Капча не пройдена — обновите её и попробуйте снова"},
            )

    user = db.execute(
        select(User).where(
            or_(
                User.username == payload.username_or_email,
                User.email == payload.username_or_email,
            )
        )
    ).scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        record_failure(payload.username_or_email)
        raise invalid_credentials
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Аккаунт заблокирован")

    record_success(payload.username_or_email)
    token = create_access_token(subject=str(user.id))
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/verify-email", response_model=EmailVerifyOut)
def verify_email(token: str, db: Session = Depends(get_db)):
    """Дёргается фронтендом со страницы /verify-email?token=... — ссылка из
    письма. Не требует авторизации: пользователь может открыть ссылку из
    почтового клиента в другой вкладке/браузере, где токена сессии нет."""
    invalid_token = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Ссылка недействительна или устарела — запросите новое письмо",
    )

    payload = decode_email_verification_token(token)
    if payload is None:
        raise invalid_token

    user = db.get(User, payload["user_id"])
    if user is None:
        raise invalid_token
    # email в токене должен совпадать с текущим email пользователя — если
    # пользователь успел сменить почту после отправки письма, старая ссылка
    # не должна подтверждать уже неактуальный адрес.
    if user.email != payload["email"]:
        raise invalid_token

    if user.email_verified:
        return EmailVerifyOut(message="Email уже был подтверждён ранее", already_verified=True)

    user.email_verified = True
    db.commit()
    return EmailVerifyOut(message="Email успешно подтверждён")


@router.post("/resend-verification", response_model=EmailVerifyOut)
def resend_verification(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Требует авторизации — кнопка "отправить письмо ещё раз" в баннере на
    сайте доступна только залогиненному пользователю, никакого email в теле
    запроса не принимаем (чтобы нельзя было заспамить письмами чужой ящик)."""
    if current_user.email_verified:
        return EmailVerifyOut(message="Email уже подтверждён", already_verified=True)

    background_tasks.add_task(
        _dispatch_verification_email, current_user.id, current_user.email, current_user.username
    )
    return EmailVerifyOut(message="Письмо с подтверждением отправлено")
