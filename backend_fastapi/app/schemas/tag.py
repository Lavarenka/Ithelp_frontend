from pydantic import BaseModel, ConfigDict, Field


class TagCreate(BaseModel):
    """Название задаётся сразу на обоих языках — админ вводит полноценный
    перевод при создании тега (см. AdminTags.jsx: вкладки RU/EN). name_en
    необязателен: можно сохранить только RU и дописать перевод позже через
    TagUpdate — тогда роутер будет отдавать RU как запасной вариант."""

    name_ru: str = Field(min_length=1, max_length=100)
    name_en: str | None = Field(default=None, max_length=100)
    slug: str = Field(min_length=1, max_length=120)
    # id родителя, если тег вложенный; None — тег верхнего уровня.
    parent_id: int | None = None


class TagUpdate(BaseModel):
    """Все поля необязательны. parent_id можно явно передать как null, чтобы
    сделать тег корневым — поэтому используем отдельный флаг has_parent_id,
    выставляемый через model_fields_set на роуте (см. tags.py)."""

    name_ru: str | None = Field(default=None, min_length=1, max_length=100)
    name_en: str | None = Field(default=None, max_length=100)
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    parent_id: int | None = None


class TagOut(BaseModel):
    """Плоское представление тега — используется там, где вложенность не нужна
    (например, список тегов у конкретной статьи). name — уже готовое значение
    для текущего языка запроса: роутер выбирает name_ru/name_en (с запасным
    вариантом на RU, если перевода ещё нет) и собирает этот объект вручную —
    name не читается из ORM напрямую (from_attributes его не найдёт, такого
    атрибута у модели Tag больше нет), см. routers/tags.py, _tag_out()."""

    id: int
    name: str
    slug: str
    parent_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class TagTreeOut(BaseModel):
    """Тег вместе с вложенными дочерними тегами — для меню, где нужна иерархия.
    Как и TagOut, собирается роутером вручную (см. routers/tags.py, _tag_tree_out())."""

    id: int
    name: str
    slug: str
    children: list["TagTreeOut"] = []

    model_config = ConfigDict(from_attributes=True)


TagTreeOut.model_rebuild()


class TagAdminOut(BaseModel):
    """Полное двуязычное представление тега — для админки (AdminTags.jsx),
    где в форме редактирования нужны сразу оба варианта названия, а не
    только тот, что подходит текущему языку интерфейса сайта. Также
    используется как вложенный тип в ArticleAdminOut.tags (см.
    schemas/article.py) — там объекты Tag читаются through from_attributes,
    поэтому оно обязательно и здесь."""

    id: int
    name_ru: str
    name_en: str | None = None
    slug: str
    parent_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class TagAdminTreeOut(BaseModel):
    """Дерево тегов с двуязычными названиями — отдельный эндпоинт для
    админки (см. routers/tags.py, list_tags_tree_admin), чтобы обычное
    публичное дерево (TagTreeOut, используется в меню шапки) не пришлось
    раздувать полями, которые нужны только форме редактирования."""

    id: int
    name_ru: str
    name_en: str | None = None
    slug: str
    parent_id: int | None = None
    children: list["TagAdminTreeOut"] = []

    model_config = ConfigDict(from_attributes=True)


TagAdminTreeOut.model_rebuild()
