from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.tag import TagOut


class ArticleBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class ArticleCreate(ArticleBase):
    # Список id уже существующих тегов, которые нужно привязать к статье при создании.
    tag_ids: list[int] = []


class ArticleUpdate(BaseModel):
    """Все поля необязательны — обновляем только то, что передано (PATCH-семантика
    на PUT-роуте, для простоты формы редактирования в админке)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    tag_ids: list[int] | None = None


class ArticleAuthorOut(BaseModel):
    """Урезанная информация об авторе для карточки/страницы статьи —
    без email и прочих личных данных."""

    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class ArticleOut(ArticleBase):
    id: int
    views: int
    created_at: datetime
    tags: list[TagOut] = []
    author: ArticleAuthorOut | None = None

    model_config = ConfigDict(from_attributes=True)


class ArticleListOut(BaseModel):
    """Список статей + сколько их всего — нужно фронту, чтобы понять,
    когда останавливать подгрузку по скроллу (infinite scroll)."""

    items: list[ArticleOut]
    total: int
