"""Утилиты для хэширования паролей и работы с JWT-токенами."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Пустой хэш — пользователь без пароля (вошёл через Google/GitHub, см.
    # models/user.py). passlib на пустой строке падает с ошибкой, поэтому
    # просто считаем пароль неверным.
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    """subject — обычно id пользователя (строкой, как того требует sub в JWT)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Возвращает subject (id пользователя строкой) или None, если токен невалиден/просрочен."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    # purpose отсутствует у обычных access-токенов, но должен отсутствовать
    # и здесь — токен подтверждения email (purpose="email_verify", см. ниже)
    # не должен работать как access-токен, даже если у него не истёк exp.
    if payload.get("purpose") is not None:
        return None
    return payload.get("sub")


def create_email_verification_token(user_id: int, email: str) -> str:
    """Отдельный тип токена (purpose="email_verify") — подписан тем же
    secret_key, но не взаимозаменяем с access-токеном авторизации (см.
    decode_access_token выше) и с более коротким сроком жизни. email в
    payload — чтобы ссылка протухала сама, если пользователь успеет сменить
    почту до перехода по ней (сравнение делает вызывающий код)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.email_verification_expire_hours)
    to_encode = {"sub": str(user_id), "email": email, "purpose": "email_verify", "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_email_verification_token(token: str) -> dict | None:
    """Возвращает {"user_id": int, "email": str} или None, если токен
    невалиден/просрочен/не того типа."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("purpose") != "email_verify":
        return None
    sub = payload.get("sub")
    email = payload.get("email")
    if sub is None or email is None:
        return None
    try:
        user_id = int(sub)
    except ValueError:
        return None
    return {"user_id": user_id, "email": email}
