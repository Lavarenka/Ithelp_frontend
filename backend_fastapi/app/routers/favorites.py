from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import Article, Favorite, User
from app.schemas import ArticleListOut, FavoriteStatusOut
from app.routers.articles import _article_out, _annotate_comments_count

router = APIRouter(prefix="/favorites", tags=["favorites"])

ARTICLE_LOAD_OPTIONS = (selectinload(Article.tags), selectinload(Article.author))


def _favorites_count(db: Session, article_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(Favorite).where(Favorite.article_id == article_id)
    ).scalar_one()


@router.get("/", response_model=ArticleListOut)
def list_my_favorites(
    skip: int = 0,
    limit: int = 10,
    lang: str = Query(default="ru"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список статей, добавленных текущим пользователем в избранное,
    отсортированный по дате добавления (новые сверху)."""
    base_stmt = (
        select(Article)
        .join(Favorite, Favorite.article_id == Article.id)
        .where(Favorite.user_id == current_user.id)
        .options(*ARTICLE_LOAD_OPTIONS)
        .order_by(Favorite.created_at.desc())
    )
    items = db.execute(base_stmt.offset(skip).limit(limit)).scalars().all()
    total = db.execute(
        select(func.count()).select_from(Favorite).where(Favorite.user_id == current_user.id)
    ).scalar_one()

    for article in items:
        article.is_favorited = True
        article.favorites_count = _favorites_count(db, article.id)
    _annotate_comments_count(db, items)

    # После локализации у модели нет полей title/content/name — только
    # _ru/_en, поэтому ответ собираем через _article_out (как в ленте
    # статей, см. routers/articles.py), а не отдаём ORM-объекты напрямую.
    return ArticleListOut(items=[_article_out(a, lang) for a in items], total=total)


@router.get("/count", response_model=dict)
def get_favorites_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Просто число избранных статей текущего пользователя — для бейджа-счётчика
    в шапке, чтобы не тянуть весь список только ради количества.

    Важно: этот путь объявлен ДО "/{article_id}" ниже — иначе FastAPI
    попытался бы распарсить "count" как article_id и упал бы на валидации
    (та же история, что с /articles/popular/ — см. articles.py)."""
    count = db.execute(
        select(func.count()).select_from(Favorite).where(Favorite.user_id == current_user.id)
    ).scalar_one()
    return {"count": count}


@router.post("/{article_id}", response_model=FavoriteStatusOut, status_code=201)
def add_favorite(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")

    existing = db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id, Favorite.article_id == article_id
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(Favorite(user_id=current_user.id, article_id=article_id))
        db.commit()

    return FavoriteStatusOut(is_favorited=True, favorites_count=_favorites_count(db, article_id))


@router.delete("/{article_id}", response_model=FavoriteStatusOut)
def remove_favorite(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id, Favorite.article_id == article_id
        )
    ).scalar_one_or_none()

    if existing is not None:
        db.delete(existing)
        db.commit()

    return FavoriteStatusOut(is_favorited=False, favorites_count=_favorites_count(db, article_id))
