"""Отправка писем по SMTP — только письмо подтверждения email при
регистрации. Без сторонних сервисов рассылки: используется стандартный
smtplib + учётные данные обычной почты (Gmail и т.п.) из .env.

Осознанное решение: отправка НИКОГДА не бросает исключение наружу и не
должна ронять запрос на /auth/register — если SMTP не настроен, недоступен
или письмо не ушло по любой другой причине, мы просто логируем это и
продолжаем. Пользователь и так может пользоваться сайтом без подтверждения
(см. email_verified в модели User) — email тут дополнительная опция, а
не блокирующий шаг регистрации.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger("app.mailer")


def _build_verification_email(to_email: str, username: str, verify_url: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Подтвердите email — it_hlp"
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_address}>"
    msg["To"] = to_email

    text_body = (
        f"Привет, {username}!\n\n"
        f"Чтобы подтвердить свой email на it_hlp, перейдите по ссылке:\n"
        f"{verify_url}\n\n"
        f"Ссылка действительна {settings.email_verification_expire_hours} ч. "
        f"Если вы не регистрировались на it_hlp — просто проигнорируйте это письмо."
    )
    html_body = f"""\
<html>
  <body style="font-family: Arial, sans-serif; color: #212020;">
    <p>Привет, <strong>{username}</strong>!</p>
    <p>Чтобы подтвердить свой email на it_hlp, перейдите по ссылке:</p>
    <p>
      <a href="{verify_url}" style="display: inline-block; padding: 10px 20px;
         background: #212020; color: #fff; text-decoration: none; border-radius: 4px;">
        Подтвердить email
      </a>
    </p>
    <p style="color: #888; font-size: 13px;">
      Ссылка действительна {settings.email_verification_expire_hours} ч.
      Если вы не регистрировались на it_hlp — просто проигнорируйте это письмо.
    </p>
  </body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    return msg


def send_verification_email(to_email: str, username: str, token: str) -> bool:
    """Возвращает True, если письмо успешно отправлено (или SMTP осознанно
    выключен — тогда просто True не возвращаем, а False с логом, чтобы
    вызывающий код мог при желании это учесть, но никогда не поднимаем
    исключение — см. модуль docstring)."""
    if not settings.smtp_configured:
        logger.warning(
            "SMTP не настроен (SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD в .env) — "
            "письмо подтверждения email для %s не отправлено.",
            to_email,
        )
        return False

    verify_url = f"{settings.frontend_base_url.rstrip('/')}/verify-email?token={token}"
    msg = _build_verification_email(to_email, username, verify_url)

    try:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_address, [to_email], msg.as_string())
        return True
    except Exception:
        # Любая ошибка SMTP (неверный пароль, таймаут, сеть) — не должна
        # ломать регистрацию пользователя, только логируется.
        logger.exception("Не удалось отправить письмо подтверждения email на %s", to_email)
        return False
