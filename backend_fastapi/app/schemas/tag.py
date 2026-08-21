from pydantic import BaseModel, ConfigDict, Field


class TagBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=120)


class TagCreate(TagBase):
    # id родителя, если тег вложенный; None — тег верхнего уровня.
    parent_id: int | None = None


class TagOut(TagBase):
    """Плоское представление тега — используется там, где вложенность не нужна
    (например, список тегов у конкретной статьи)."""

    id: int
    parent_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class TagTreeOut(TagBase):
    """Тег вместе с вложенными дочерними тегами — для меню, где нужна иерархия."""

    id: int
    children: list["TagTreeOut"] = []

    model_config = ConfigDict(from_attributes=True)


TagTreeOut.model_rebuild()
