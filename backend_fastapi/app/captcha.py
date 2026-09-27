"""Google reCAPTCHA v2 («Я не робот») — проверка на стороне сервера.

Как это работает:
1. На фронтенде (hlp_react/src/components/ReCaptcha) пользователь отмечает
   «Я не робот» в виджете Google — виджет выдаёт одноразовый токен.
2. Токен уходит вместе с формой регистрации/входа (поле captcha_token).
3. Здесь сервер отправляет токен и СЕКРЕТНЫЙ ключ в Google (siteverify) —
   только Google знает, решил ли человек капчу на самом деле. Галочка на
   фронтенде сама по себе ничего не гарантирует, вся защита — в этой проверке.

Токен одноразовый и живёт ~2 минуты: повторно отправить тот же токен нельзя,
Google ответит success=false (поэтому фронтенд сбрасывает виджет после
каждой неудачной отправки формы).

Ключи — в .env (RECAPTCHA_SECRET_KEY здесь, VITE_RECAPTCHA_SITE_KEY на
фронтенде). Если их не задать, используются официальные ТЕСТОВЫЕ ключи
Google: капча показывается с красной надписью «только для тестирования» и
пропускает всех — годится для локальной разработки, но не для продакшена.
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from app.config import GOOGLE_RECAPTCHA_TEST_SECRET_KEY, settings

logger = logging.getLogger(__name__)

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
VERIFY_TIMEOUT_SECONDS = 5

if settings.recaptcha_secret_key == GOOGLE_RECAPTCHA_TEST_SECRET_KEY:
    logger.warning(
        "reCAPTCHA: используется ТЕСТОВЫЙ ключ Google — капча пропускает всех. "
        "Для продакшена задай RECAPTCHA_SECRET_KEY в .env (см. DEPLOY_CHECKLIST.md)."
    )


def verify_captcha(token: str | None) -> bool:
    """True, только если Google подтвердил, что токен настоящий и ещё не
    использован. При любой ошибке (Google недоступен, таймаут, битый ответ)
    — False: лучше попросить человека повторить, чем пропустить бота."""
    if not token:
        return False

    body = urllib.parse.urlencode(
        {"secret": settings.recaptcha_secret_key, "response": token}
    ).encode()
    request = urllib.request.Request(VERIFY_URL, data=body, method="POST")

    try:
        with urllib.request.urlopen(request, timeout=VERIFY_TIMEOUT_SECONDS) as response:
            result = json.load(response)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.warning("reCAPTCHA: не удалось проверить токен у Google: %s", exc)
        return False

    if not result.get("success"):
        # warning, а не info — иначе в консоли uvicorn этой строки не видно, и
        # непонятно, почему капча "не проходит". Частая причина — ключи из
        # разных пар: site key на фронтенде не от этого secret key
        # (error-codes тогда invalid-input-response / invalid-input-secret).
        logger.warning("reCAPTCHA: Google отклонил токен, error-codes=%s", result.get("error-codes"))
        return False
    return True
