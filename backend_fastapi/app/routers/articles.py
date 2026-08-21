from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Article
from app.schemas import ArticleCreate, ArticleOut, ArticleListOut

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("/", response_model=ArticleListOut)
def list_articles(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    stmt = select(Article).order_by(Article.created_at.desc()).offset(skip).limit(limit)
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(Article)).scalar_one()
    return ArticleListOut(items=items, total=total)


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")

    article.views += 1
    db.commit()
    db.refresh(article)
    return article


@router.post("/", response_model=ArticleOut, status_code=201)
def create_article(payload: ArticleCreate, db: Session = Depends(get_db)):
    article = Article(title=payload.title, content=payload.content)
    db.add(article)
    db.commit()
    db.refresh(article)
    return article
