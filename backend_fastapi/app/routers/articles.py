from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Article, Tag
from app.schemas import ArticleCreate, ArticleOut, ArticleListOut

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("/", response_model=ArticleListOut)
def list_articles(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    stmt = (
        select(Article)
        .options(selectinload(Article.tags))
        .order_by(Article.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(Article)).scalar_one()
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
        .options(selectinload(Article.tags))
        .order_by(Article.views.desc(), Article.created_at.desc())
        .limit(limit)
    )
    return db.execute(stmt).scalars().all()


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(Article)
        .where(Article.id == article_id)
        .options(selectinload(Article.tags))
    )
    article = db.execute(stmt).scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")

    article.views += 1
    db.commit()
    db.refresh(article)
    return article


@router.post("/", response_model=ArticleOut, status_code=201)
def create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
    article = Article(title=payload.title, content=payload.content)

    if payload.tag_ids:
        tags = db.execute(select(Tag).where(Tag.id.in_(payload.tag_ids))).scalars().all()
        article.tags = list(tags)

    db.add(article)
    db.commit()
    db.refresh(article)
    return article
