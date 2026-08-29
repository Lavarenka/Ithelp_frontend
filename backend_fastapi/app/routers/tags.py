from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin
from app.models import Article, Tag, User
from app.schemas import (
    ArticleListOut,
    TagCreate,
    TagUpdate,
    TagOut,
    TagTreeOut,
    TagAdminOut,
    TagAdminTreeOut,
)

router = APIRouter(prefix="/tags", tags=["tags"])


def _pick_lang(value_ru: str, value_en: str | None, lang: str) -> str:
    """Общее правило для всей локализации контента (статьи и теги): если
    запрошен английский и перевод есть — отдаём его, иначе (запрошен русский,
    либо английский ещё не переведён) отдаём русский как запасной вариант.
    lang приходит от фронта через query-параметр ?lang=, который берётся из
    i18n.language (см. hlp_react/src/api.js, apiRequest) — сайт по умолчанию
    работает на английском (см. i18n/index.js), но контент по умолчанию
    считаем русским, пока для конкретной статьи/тега не появится en-перевод."""
    if lang == "en" and value_en:
        return value_en
    return value_ru


def _tag_out(tag: Tag, lang: str) -> TagOut:
    return TagOut(
        id=tag.id,
        name=_pick_lang(tag.name_ru, tag.name_en, lang),
        slug=tag.slug,
        parent_id=tag.parent_id,
    )


def _tag_tree_out(tag: Tag, lang: str) -> TagTreeOut:
    return TagTreeOut(
        id=tag.id,
        name=_pick_lang(tag.name_ru, tag.name_en, lang),
        slug=tag.slug,
        children=[_tag_tree_out(child, lang) for child in tag.children],
    )


def _tag_admin_tree_out(tag: Tag) -> TagAdminTreeOut:
    return TagAdminTreeOut(
        id=tag.id,
        name_ru=tag.name_ru,
        name_en=tag.name_en,
        slug=tag.slug,
        parent_id=tag.parent_id,
        children=[_tag_admin_tree_out(child) for child in tag.children],
    )


def _collect_descendant_ids(tag: Tag) -> list[int]:
    """Собирает id тега и всех его потомков (рекурсивно) — нужно, чтобы клик
    по родительскому тегу в меню показывал статьи из всех вложенных подтегов."""
    ids = [tag.id]
    for child in tag.children:
        ids.extend(_collect_descendant_ids(child))
    return ids


@router.get("/", response_model=list[TagTreeOut])
def list_tags_tree(lang: str = Query(default="ru"), db: Session = Depends(get_db)):
    """Дерево тегов верхнего уровня вместе со всеми вложенными — то, что нужно
    для построения меню на фронте. Названия — уже переведённые под lang."""
    stmt = (
        select(Tag)
        .where(Tag.parent_id.is_(None))
        .options(selectinload(Tag.children).selectinload(Tag.children))
    )
    roots = db.execute(stmt).scalars().all()
    return [_tag_tree_out(tag, lang) for tag in roots]


@router.get("/admin/tree", response_model=list[TagAdminTreeOut])
def list_tags_tree_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Как list_tags_tree выше, но с обоими вариантами названия сразу — для
    формы редактирования тега в админке (AdminTags.jsx), где нужно
    показывать/менять и RU, и EN одновременно. Путь идёт ДО "/{slug}" по той
    же причине, что и /popular/ у статей — иначе FastAPI принял бы "admin"
    за slug."""
    stmt = (
        select(Tag)
        .where(Tag.parent_id.is_(None))
        .options(selectinload(Tag.children).selectinload(Tag.children))
    )
    roots = db.execute(stmt).scalars().all()
    return [_tag_admin_tree_out(tag) for tag in roots]


@router.get("/{slug}", response_model=TagOut)
def get_tag(slug: str, lang: str = Query(default="ru"), db: Session = Depends(get_db)):
    tag = db.execute(select(Tag).where(Tag.slug == slug)).scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return _tag_out(tag, lang)


@router.get("/{slug}/articles", response_model=ArticleListOut)
def get_tag_articles(
    slug: str,
    skip: int = 0,
    limit: int = 10,
    lang: str = Query(default="ru"),
    db: Session = Depends(get_db),
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

    # Импортируем здесь же (а не в module-level), чтобы не городить цикл
    # импортов articles.py <-> tags.py — оба роутера независимы друг от друга.
    from app.routers.articles import _article_out

    return ArticleListOut(items=[_article_out(a, lang) for a in items], total=total)


@router.post("/", response_model=TagAdminOut, status_code=201)
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

    tag = Tag(
        name_ru=payload.name_ru,
        name_en=payload.name_en,
        slug=payload.slug,
        parent_id=payload.parent_id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagAdminOut)
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

    if payload.name_ru is not None:
        tag.name_ru = payload.name_ru
    if "name_en" in payload.model_fields_set:
        tag.name_en = payload.name_en

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
