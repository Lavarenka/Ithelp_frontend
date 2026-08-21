from sqlalchemy import ForeignKey, Integer, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# Промежуточная таблица для many-to-many между статьями и тегами.
article_tags = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # slug — человекочитаемый идентификатор для URL (/tags/frontend), уникальный.
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)

    # Самоссылка для вложенности: у тега может быть родитель (или не быть — тогда это тег верхнего уровня).
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"), nullable=True
    )

    parent: Mapped["Tag | None"] = relationship(
        "Tag", remote_side=[id], back_populates="children"
    )
    children: Mapped[list["Tag"]] = relationship(
        "Tag", back_populates="parent", cascade="all, delete-orphan"
    )

    articles: Mapped[list["Article"]] = relationship(
        "Article", secondary=article_tags, back_populates="tags"
    )
