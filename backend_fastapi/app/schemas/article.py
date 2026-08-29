from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.tag import TagOut, TagAdminOut


class ArticleCreate(BaseModel):
    """Заголовок и текст задаются сразу на обоих языках — админ вводит
    полноценный перевод при создании статьи (см. AdminArticles.jsx: вкладки
    RU/EN). *_en необязательны: можно сохранить только RU и дописать перевод
    позже через ArticleUpdate — тогда роутер будет отдавать RU как запасной
    вариант, пока EN не заполнен (см. routers/articles.py, _pick_lang())."""

    title_ru: str = Field(min_length=1, max_length=200)
    title_en: str | None = Field(default=None, max_length=200)
    content_ru: str = Field(min_length=1)
    content_en: str | None = None
    # Список id уже существующих тегов, которые нужно привязать к статье при создании.
    tag_ids: list[int] = []


class ArticleUpdate(BaseModel):
    """Все поля необязательны — обновляем только то, что передано (PATCH-семантика
    на PUT-роуте, для простоты формы редактирования в админке)."""

    title_ru: str | None = Field(default=None, min_length=1, max_length=200)
    title_en: str | None = Field(default=None, max_length=200)
    content_ru: str | None = Field(default=None, min_length=1)
    content_en: str | None = None
    tag_ids: list[int] | None = None


class ArticleAuthorOut(BaseModel):
    """Урезанная информация об авторе для карточки/страницы статьи —
    без email и прочих личных данных. avatar — для маленькой круглой
    аватарки рядом с именем автора (см. ArticleCard.jsx на фронте)."""

    id: int
    username: str
    avatar: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ArticleOut(BaseModel):
    """title/content — уже готовые значения для текущего языка запроса,
    роутер выбирает title_ru/title_en (и content_ru/content_en) с запасным
    вариантом на RU и собирает этот объект вручную, а не через from_attributes
    (см. routers/articles.py, _article_out()) — так же, как раньше уже
    делалось для is_favorited/comments_count/favorites_count ниже."""

    id: int
    title: str
    content: str
    views: int
    created_at: datetime
    tags: list[TagOut] = []
    author: ArticleAuthorOut | None = None
    is_favorited: bool = False
    favorites_count: int = 0
    comments_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ArticleAdminOut(BaseModel):
    """Полное двуязычное представление статьи — для формы редактирования в
    админке (AdminArticles.jsx), где нужны сразу оба варианта заголовка и
    текста, а не только тот, что подходит текущему языку интерфейса сайта.
    tags — тоже двуязычные (TagAdminOut: name_ru/name_en, а не единое name,
    как в обычном TagOut) — иначе на месте, где Tag.name раньше читался
    from_attributes напрямую, Pydantic не найдёт такого атрибута (см.
    app/models/tag.py: name разделён на name_ru/name_en)."""

    id: int
    title_ru: str
    title_en: str | None = None
    content_ru: str
    content_en: str | None = None
    views: int
    created_at: datetime
    tags: list[TagAdminOut] = []
    author: ArticleAuthorOut | None = None

    model_config = ConfigDict(from_attributes=True)


class ArticleListOut(BaseModel):
    """Список статей + сколько их всего — нужно фронту, чтобы понять,
    когда останавливать подгрузку по скроллу (infinite scroll)."""

    items: list[ArticleOut]
    total: int


class ArticleAdminListOut(BaseModel):
    """Как ArticleListOut, но с двуязычными карточками — список статей в
    админке (см. AdminArticles.jsx)."""

    items: list[ArticleAdminOut]
    total: int


class ArticleSearchOut(BaseModel):
    """Облегчённая карточка результата для живого поиска (см.
    routers/articles.py, search_articles) — вместо полного content
    отдаём короткий сниппет вокруг первого совпадения; его собирает сам
    роутер (такого поля нет в модели, поэтому from_attributes его не
    найдёт — сниппет проставляется вручную, как is_favorited у ArticleOut)."""

    id: int
    title: str
    snippet: str
    tags: list[TagOut] = []
    author: ArticleAuthorOut | None = None

    model_config = ConfigDict(from_attributes=True)


class ArticleSearchListOut(BaseModel):
    items: list[ArticleSearchOut]
    total: int
