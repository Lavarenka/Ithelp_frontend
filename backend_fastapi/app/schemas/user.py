from datetime import datetime
import base64
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.config import settings

# Разрешаем только "безопасные" типы картинок для аватара — остальное (svg,
# например, из-за встроенного JS) не пускаем даже как data-URI.
_AVATAR_DATA_URI_RE = re.compile(r"^data:image/(png|jpe?g|webp|gif);base64,(?P<b64>.+)$")


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    password_confirm: str = Field(min_length=1, max_length=128)
    # Токен Google reCAPTCHA — обязателен на регистрации всегда (см. app/captcha.py).
    captcha_token: str = Field(min_length=1)

    @field_validator("username")
    @classmethod
    def username_no_spaces(cls, value: str) -> str:
        value = value.strip()
        if not value or " " in value:
            raise ValueError("Логин не должен содержать пробелы")
        return value

    @model_validator(mode="after")
    def passwords_match(self) -> "UserRegister":
        if self.password != self.password_confirm:
            raise ValueError("Пароли не совпадают")
        return self


class UserLogin(BaseModel):
    # Разрешаем логиниться и по username, и по email — так удобнее пользователю.
    username_or_email: str = Field(min_length=1)
    password: str = Field(min_length=1)
    # Капча на логине требуется не всегда — только после нескольких неудачных
    # попыток подряд для этого же логина (см. app/login_attempts.py). Поэтому
    # поле опционально на уровне схемы; обязательность проверяет роутер.
    captcha_token: str | None = None


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    email_verified: bool
    avatar: str | None = None
    created_at: datetime
    # Есть ли у пользователя пароль (см. User.has_password в models/user.py) —
    # False у тех, кто зарегистрировался только через Google/GitHub. Страница
    # профиля использует это, чтобы показать форму "задать пароль" вместо
    # обычной "сменить пароль" (без поля "текущий пароль").
    has_password: bool = True

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    """Самостоятельное редактирование профиля (PATCH /auth/me) — смена имени
    пользователя и/или аватарки. Оба поля опциональны: фронтенд шлёт только
    то, что реально изменилось."""

    username: str | None = Field(default=None, min_length=3, max_length=50)
    # None = не менять, "" = явно удалить текущий аватар (заглушка).
    avatar: str | None = None
    clear_avatar: bool = False

    @field_validator("username")
    @classmethod
    def username_no_spaces(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value or " " in value:
            raise ValueError("Логин не должен содержать пробелы")
        return value

    @field_validator("avatar")
    @classmethod
    def avatar_valid_data_uri(cls, value: str | None) -> str | None:
        if value is None:
            return value
        match = _AVATAR_DATA_URI_RE.match(value)
        if not match:
            raise ValueError("Аватар должен быть изображением (PNG, JPEG, WEBP или GIF)")
        try:
            decoded_size = len(base64.b64decode(match.group("b64"), validate=True))
        except Exception:
            raise ValueError("Не удалось прочитать файл аватара")
        if decoded_size > settings.avatar_max_bytes:
            max_mb = settings.avatar_max_bytes / 1_000_000
            raise ValueError(f"Файл аватара слишком большой (максимум {max_mb:.1f} МБ)")
        return value


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserAdminOut(UserOut):
    """То же самое + is_active — нужно только в списке пользователей
    в админке, обычному профилю (/auth/me) это поле ни к чему."""

    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserListOut(BaseModel):
    items: list[UserAdminOut]
    total: int


class UserRoleUpdate(BaseModel):
    role: str = Field(pattern="^(admin|user)$")


class UserActiveUpdate(BaseModel):
    is_active: bool


class EmailVerifyOut(BaseModel):
    message: str
    already_verified: bool = False


class PasswordChangeIn(BaseModel):
    """PATCH /auth/me/password. current_password обязателен, только если у
    пользователя уже есть пароль (see UserOut.has_password) — роутер это
    проверяет сам (схема не знает про текущего пользователя), тут просто
    делаем поле опциональным, чтобы OAuth-only пользователь мог ВПЕРВЫЕ
    задать пароль, ничего не подтверждая."""

    current_password: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
    new_password_confirm: str = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self) -> "PasswordChangeIn":
        if self.new_password != self.new_password_confirm:
            raise ValueError("Пароли не совпадают")
        return self


class PasswordChangeOut(BaseModel):
    message: str
