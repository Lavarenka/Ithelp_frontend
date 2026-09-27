from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CommentAuthorOut(BaseModel):
    """Как ArticleAuthorOut — только публичные поля автора комментария,
    включая avatar для круглой аватарки рядом с именем."""

    id: int
    username: str
    avatar: str | None = None
    # True — это не настоящий пользователь, а заглушка "Удалённый
    # пользователь" (см. CommentOut.author выше и _comment_out в
    # routers/comments.py). id в этом случае фиктивный (0).
    is_deleted: bool = False

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: int
    article_id: int
    text: str
    status: str
    created_at: datetime
    # None — автор удалён (см. Comment.user_id в models/comment.py: SET NULL
    # при удалении пользователя). Роутер (routers/comments.py: _comment_out)
    # в этом случае не оставляет None как есть, а сам подставляет "виртуального"
    # автора is_deleted=True с именем "Удалённый пользователь" — так фронтенду
    # не нужно отдельно проверять author на null в каждом месте, где он
    # показывается (просто читает username/is_deleted как обычно).
    author: CommentAuthorOut

    # Не читаются напрямую из модели — роутер проставляет вручную после
    # запроса (см. _annotate_votes), так как зависят от текущего пользователя
    # и требуют отдельного подсчёта голосов (как is_favorited/favorites_count
    # у ArticleOut).
    likes_count: int = 0
    dislikes_count: int = 0
    my_vote: int | None = None  # 1 = лайк, -1 = дизлайк, None = не голосовал

    model_config = ConfigDict(from_attributes=True)


class CommentListOut(BaseModel):
    items: list[CommentOut]
    total: int


class CommentArticleOut(BaseModel):
    """Урезанная статья — только то, что нужно в таблице модерации, чтобы
    админ понимал, под какой статьёй комментарий, не открывая её отдельно."""

    id: int
    title: str

    model_config = ConfigDict(from_attributes=True)


class CommentAdminOut(CommentOut):
    """То же самое + сама статья — только для админского списка модерации."""

    article: CommentArticleOut

    model_config = ConfigDict(from_attributes=True)


class CommentAdminListOut(BaseModel):
    items: list[CommentAdminOut]
    total: int


class CommentVoteOut(BaseModel):
    """Ответ на голосование — актуальные счётчики и голос текущего
    пользователя, без похода за всем комментарием заново."""

    likes_count: int
    dislikes_count: int
    my_vote: int | None


class CommentVoteIn(BaseModel):
    value: Literal[1, -1]


class CommentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
