from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin, get_current_user_optional
from app.models import Article, Tag, User, Favorite, Comment
from app.schemas import ArticleCreate, ArticleUpdate, ArticleOut, ArticleListOut

router = APIRouter(prefix="/articles", tags=["articles"])

# Общая связка eager-loading для статьи: теги + автор (без лишних запросов на каждую статью).
ARTICLE_LOAD_OPTIONS = (selectinload(Article.tags), selectinload(Article.author))


def _annotate_favorites(db: Session, articles: list[Article], current_user: User | None) -> None:
    """Проставляет article.is_favorited / article.favorites_count "на лету" —
    это не поля модели, а атрибуты, которые прочитает Pydantic благодаря
    from_attributes при сериализации в ArticleOut (см. schemas/article.py)."""
    if not articles:
        return
    article_ids = [a.id for a in articles]

    counts_stmt = (
        select(Favorite.article_id, func.count())
        .where(Favorite.article_id.in_(article_ids))
        .group_by(Favorite.article_id)
    )
    counts = dict(db.execute(counts_stmt).all())

    favorited_ids: set[int] = set()
    if current_user is not None:
        favorited_stmt = select(Favorite.article_id).where(
            Favorite.user_id == current_user.id, Favorite.article_id.in_(article_ids)
        )
        favorited_ids = set(db.execute(favorited_stmt).scalars().all())

    for article in articles:
        article.favorites_count = counts.get(article.id, 0)
        article.is_favorited = article.id in favorited_ids


def _annotate_comments_count(db: Session, articles: list[Article]) -> None:
    """Проставляет article.comments_count "на лету" — считаем только
    опубликованные комментарии (status="approved"), как и в публичном
    списке комментариев статьи (routers/comments.py, list_comments):
    отклонённые/ожидающие модерации не должны влиять на цифру, которую
    видят обычные пользователи в ленте."""
    if not articles:
        return
    article_ids = [a.id for a in articles]

    counts_stmt = (
        select(Comment.article_id, func.count())
        .where(Comment.article_id.in_(article_ids), Comment.status == "approved")
        .group_by(Comment.article_id)
    )
    counts = dict(db.execute(counts_stmt).all())

    for article in articles:
        article.comments_count = counts.get(article.id, 0)


@router.get("/", response_model=ArticleListOut)
def list_articles(
    skip: int = 0,
    limit: int = 10,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """search — поиск по заголовку (регистронезависимо), используется в
    списке статей админки. На обычной ленте фронт его не передаёт."""
    filters = []
    if search:
        filters.append(Article.title.ilike(f"%{search}%"))

    stmt = (
        select(Article)
        .options(*ARTICLE_LOAD_OPTIONS)
        .where(*filters)
        .order_by(Article.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(Article).where(*filters)).scalar_one()
    _annotate_favorites(db, items, current_user)
    _annotate_comments_count(db, items)
    return ArticleListOut(items=items, total=total)


@router.get("/popular/", response_model=list[ArticleOut])
def list_popular_articles(
    limit: int = 4,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Самые просматриваемые статьи — для блока "Популярные статьи" в
    сайдбаре. Важно: этот путь идёт ДО "/{article_id}" в файле, иначе
    FastAPI попытался бы распарсить "popular" как article_id и упал бы
    на валидации. Сам список не увеличивает просмотры — в отличие от
    get_article ниже, здесь только чтение."""
    stmt = (
        select(Article)
        .options(*ARTICLE_LOAD_OPTIONS)
        .order_by(Article.views.desc(), Article.created_at.desc())
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()
    _annotate_favorites(db, items, current_user)
    _annotate_comments_count(db, items)
    return items


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    stmt = (
        select(Article)
        .where(Article.id == article_id)
        .options(*ARTICLE_LOAD_OPTIONS)
    )
    article = db.execute(stmt).scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")

    article.views += 1
    db.commit()
    db.refresh(article)
    _annotate_favorites(db, [article], current_user)
    _annotate_comments_count(db, [article])
    return article


@router.post("/", response_model=ArticleOut, status_code=201)
def create_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    article = Article(title=payload.title, content=payload.content, author_id=current_user.id)

    if payload.tag_ids:
        tags = db.execute(select(Tag).where(Tag.id.in_(payload.tag_ids))).scalars().all()
        article.tags = list(tags)

    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.put("/{article_id}", response_model=ArticleOut)
def update_article(
    article_id: int,
    payload: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    stmt = select(Article).where(Article.id == article_id).options(*ARTICLE_LOAD_OPTIONS)
    article = db.execute(stmt).scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")

    if payload.title is not None:
        article.title = payload.title
    if payload.content is not None:
        article.content = payload.content
    if payload.tag_ids is not None:
        tags = db.execute(select(Tag).where(Tag.id.in_(payload.tag_ids))).scalars().all()
        article.tags = list(tags)

    db.commit()
    db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=204)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
