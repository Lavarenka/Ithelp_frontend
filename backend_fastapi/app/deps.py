"""FastAPI-зависимости для авторизации: получение текущего пользователя из
JWT-токена в заголовке Authorization, и проверка роли admin."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import decode_access_token

# tokenUrl используется только для автогенерации OpenAPI-схемы (кнопка Authorize
# в /docs) — сам логин у нас на /auth/login, а не /auth/token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    user = db.execute(select(User).where(User.id == int(user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_error

    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Не требует авторизации, но подставит пользователя, если токен передан
    и валиден. Пригодится там, где поведение чуть отличается для
    залогиненных, но анонимный доступ тоже разрешён."""
    if token is None:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    return db.execute(select(User).where(User.id == int(user_id))).scalar_one_or_none()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав — требуется роль admin",
        )
    return current_user
