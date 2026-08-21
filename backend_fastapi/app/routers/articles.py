from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Article
from app.schemas import ArticleCreate, ArticleOut

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("/", response_model=list[ArticleOut])
def list_articles(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    stmt = select(Article).order_by(Article.created_at.desc()).offset(skip).limit(limit)
    return db.execute(stmt).scalars().all()


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
