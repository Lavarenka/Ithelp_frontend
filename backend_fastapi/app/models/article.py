from datetime import datetime

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.tag import article_tags


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Двуязычный контент: title/content разделены на _ru/_en, чтобы админ мог
    # вести полноценный перевод каждой статьи (не просто UI-строки, как в
    # i18next). _ru обязателен (это язык сайта по умолчанию для нового
    # контента и единственный, который есть у старых статей после миграции —
    # см. _ensure_articles_translation_columns() в main.py). _en необязателен —
    # пока перевода нет, роутер отдаёт RU как запасной вариант (см.
    # routers/articles.py, _pick_lang()).
    title_ru: Mapped[str] = mapped_column(String(200), nullable=False)
    title_en: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content_ru: Mapped[str] = mapped_column(Text, nullable=False)
    content_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Nullable — старые статьи (созданные до появления авторизации) остаются без автора.
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=article_tags, back_populates="articles"
    )
    author: Mapped["User | None"] = relationship("User", back_populates="articles")
