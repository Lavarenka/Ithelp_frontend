from datetime import datetime

from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Favorite(Base):
    """Избранное — many-to-many между пользователями и статьями через
    отдельную модель (а не Table), потому что хотим хранить дату добавления
    и удобно доставать её через ORM-отношения в обе стороны."""

    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "article_id", name="uq_favorites_user_article"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    article_id: Mapped[int] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="favorites")
    article: Mapped["Article"] = relationship("Article")
