from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin
from app.models import Article, Tag, User
from app.schemas import ArticleCreate, ArticleUpdate, ArticleOut, ArticleListOut

router = APIRouter(prefix="/articles", tags=["articles"])

# Общая связка eager-loading для статьи: теги + автор (без лишних запросов на каждую статью).
ARTICLE_LOAD_OPTIONS = (selectinload(Article.tags), selectinload(Article.author))


@router.get("/", response_model=ArticleListOut)
def list_articles(
    skip: int = 0,
    limit: int = 10,
    search: str | None = None,
    db: Session = Depends(get_db),
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
    return ArticleListOut(items=items, total=total)


@router.get("/popular/", response_model=list[ArticleOut])
def list_popular_articles(limit: int = 4, db: Session = Depends(get_db)):
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
    return db.execute(stmt).scalars().all()


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
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
