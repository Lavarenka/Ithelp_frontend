from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Comment(Base):
    """Комментарий под статьёй. Плоский список — без вложенных ответов.

    status:
      "pending"  — только что оставлен, ждёт модерации, автору виден только он сам,
      "approved" — прошёл модерацию, виден всем,
      "rejected" — отклонён админом, скрыт от всех кроме автора и админки.
    Новый комментарий всегда создаётся в "pending" (см. роутер create_comment)."""

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True)
    # NULL — автор комментария удалён (см. routers/users.py: delete_user
    # явно проставляет NULL сюда перед удалением пользователя, а не
    # полагается на ondelete="CASCADE" ниже — SQLite по умолчанию не
    # соблюдает ON DELETE CASCADE, поэтому раньше комментарии оставались
    # висеть с user_id, указывающим на уже удалённого пользователя, и
    # список комментариев падал с ValidationError на CommentOut.author).
    # Сам комментарий при этом НЕ удаляется — остаётся виден с автором
    # "Удалённый пользователь" (см. _comment_out в routers/comments.py),
    # чтобы не рвать нить обсуждения под статьёй.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    article: Mapped["Article"] = relationship("Article")
    author: Mapped["User | None"] = relationship("User")
    votes: Mapped[list["CommentVote"]] = relationship(
        "CommentVote", back_populates="comment", cascade="all, delete-orphan"
    )


class CommentVote(Base):
    """Лайк/дизлайк на комментарии. value: 1 = лайк, -1 = дизлайк — один
    пользователь может проголосовать только один раз за комментарий
    (UniqueConstraint), повторный голос меняет value, а не добавляет строку."""

    __tablename__ = "comment_votes"
    __table_args__ = (
        UniqueConstraint("user_id", "comment_id", name="uq_comment_votes_user_comment"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    comment_id: Mapped[int] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    value: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 1 или -1

    comment: Mapped["Comment"] = relationship("Comment", back_populates="votes")
    user: Mapped["User"] = relationship("User")
