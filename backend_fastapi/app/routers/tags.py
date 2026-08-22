from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin
from app.models import Article, Tag, User
from app.schemas import ArticleListOut, TagCreate, TagUpdate, TagOut, TagTreeOut

router = APIRouter(prefix="/tags", tags=["tags"])


def _collect_descendant_ids(tag: Tag) -> list[int]:
    """Собирает id тега и всех его потомков (рекурсивно) — нужно, чтобы клик
    по родительскому тегу в меню показывал статьи из всех вложенных подтегов."""
    ids = [tag.id]
    for child in tag.children:
        ids.extend(_collect_descendant_ids(child))
    return ids


@router.get("/", response_model=list[TagTreeOut])
def list_tags_tree(db: Session = Depends(get_db)):
    """Дерево тегов верхнего уровня вместе со всеми вложенными — то, что нужно
    для построения меню на фронте."""
    stmt = (
        select(Tag)
        .where(Tag.parent_id.is_(None))
        .options(selectinload(Tag.children).selectinload(Tag.children))
    )
    roots = db.execute(stmt).scalars().all()
    return roots


@router.get("/{slug}", response_model=TagOut)
def get_tag(slug: str, db: Session = Depends(get_db)):
    tag = db.execute(select(Tag).where(Tag.slug == slug)).scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.get("/{slug}/articles", response_model=ArticleListOut)
def get_tag_articles(
    slug: str, skip: int = 0, limit: int = 10, db: Session = Depends(get_db)
):
    """Статьи по тегу. Если у тега есть вложенные подтеги, в выдачу попадают
    и статьи, помеченные этими подтегами — так клик по родительскому тегу в
    меню ("Frontend") показывает вообще все статьи категории, а не только
    те, что помечены буквально тегом Frontend."""
    stmt = select(Tag).where(Tag.slug == slug).options(selectinload(Tag.children).selectinload(Tag.children))
    tag = db.execute(stmt).scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    tag_ids = _collect_descendant_ids(tag)

    base_stmt = (
        select(Article)
        .join(Article.tags)
        .where(Tag.id.in_(tag_ids))
        .distinct()
        .order_by(Article.created_at.desc())
    )
    count_stmt = (
        select(func.count(func.distinct(Article.id)))
        .select_from(Article)
        .join(Article.tags)
        .where(Tag.id.in_(tag_ids))
    )

    items = db.execute(base_stmt.offset(skip).limit(limit)).scalars().all()
    total = db.execute(count_stmt).scalar_one()
    return ArticleListOut(items=items, total=total)


@router.post("/", response_model=TagOut, status_code=201)
def create_tag(
    payload: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.execute(select(Tag).where(Tag.slug == payload.slug)).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Tag with this slug already exists")

    if payload.parent_id is not None:
        parent = db.get(Tag, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=404, detail="Parent tag not found")

    tag = Tag(name=payload.name, slug=payload.slug, parent_id=payload.parent_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(
    tag_id: int,
    payload: TagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    if payload.slug is not None and payload.slug != tag.slug:
        existing = db.execute(select(Tag).where(Tag.slug == payload.slug)).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=409, detail="Tag with this slug already exists")
        tag.slug = payload.slug

    if payload.name is not None:
        tag.name = payload.name

    # parent_id передан явно (в том числе null — сделать тег корневым)?
    if "parent_id" in payload.model_fields_set:
        new_parent_id = payload.parent_id
        if new_parent_id is not None:
            if new_parent_id == tag_id:
                raise HTTPException(status_code=400, detail="Тег не может быть родителем самому себе")
            parent = db.get(Tag, new_parent_id)
            if parent is None:
                raise HTTPException(status_code=404, detail="Parent tag not found")
            # Запрещаем цикл: новый родитель не должен быть потомком текущего тега.
            descendant_ids = set(_collect_descendant_ids(tag))
            if new_parent_id in descendant_ids:
                raise HTTPException(
                    status_code=400,
                    detail="Нельзя сделать родителем один из вложенных подтегов — образуется цикл",
                )
        tag.parent_id = new_parent_id

    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Удаление тега каскадно удаляет все его вложенные подтеги (cascade на
    модели) и просто отвязывает его от статей (промежуточная таблица
    article_tags тоже каскадно чистится) — сами статьи не трогает."""
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
