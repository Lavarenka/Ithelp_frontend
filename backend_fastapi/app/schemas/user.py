from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

    @field_validator("username")
    @classmethod
    def username_no_spaces(cls, value: str) -> str:
        value = value.strip()
        if not value or " " in value:
            raise ValueError("Логин не должен содержать пробелы")
        return value


class UserLogin(BaseModel):
    # Разрешаем логиниться и по username, и по email — так удобнее пользователю.
    username_or_email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
