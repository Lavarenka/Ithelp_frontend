from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArticleBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class ArticleCreate(ArticleBase):
    pass


class ArticleOut(ArticleBase):
    id: int
    views: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
