import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import require_admin, get_current_user_optional
from app.models import Article, Tag, User, Favorite, Comment
from app.schemas import (
    ArticleCreate,
    ArticleUpdate,
    ArticleOut,
    ArticleAdminOut,
    ArticleListOut,
    ArticleAdminListOut,
    ArticleSearchOut,
    ArticleSearchListOut,
)
from app.routers.tags import _tag_out, _pick_lang

router = APIRouter(prefix="/articles", tags=["articles"])

# Сколько символов показывать слева/справа от найденного слова в сниппете
# результата живого поиска (см. search_articles/_build_snippet ниже).
SNIPPET_RADIUS = 80

# Общая связка eager-loading для статьи: теги + автор (без лишних запросов на каждую статью).
ARTICLE_LOAD_OPTIONS = (selectinload(Article.tags), selectinload(Article.author))


def _article_out(article: Article, lang: str) -> ArticleOut:
    """Собирает ArticleOut вручную (а не через from_attributes) — title/content
    больше не читаются напрямую из модели, это выбор между _ru/_en (см.
    routers/tags.py, _pick_lang()). is_favorited/favorites_count/comments_count
    берутся из атрибутов, проставленных _annotate_favorites/_annotate_comments_count
    ниже (или дефолтных 0/False, если аннотация не вызывалась — например, для
    статьи, только что созданной в create_article)."""
    return ArticleOut(
        id=article.id,
        title=_pick_lang(article.title_ru, article.title_en, lang),
        content=_pick_lang(article.content_ru, article.content_en, lang),
        views=article.views,
        created_at=article.created_at,
        tags=[_tag_out(t, lang) for t in article.tags],
        author=article.author,
        is_favorited=getattr(article, "is_favorited", False),
        favorites_count=getattr(article, "favorites_count", 0),
        comments_count=getattr(article, "comments_count", 0),
    )


def _annotate_favorites(db: Session, articles: list[Article], current_user: User | None) -> None:
    """Проставляет article.is_favorited / article.favorites_count "на лету" —
    это не поля модели, а обычные Python-атрибуты, которые потом читает
    _article_out() при сборке ответа."""
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
    lang: str = Query(default="ru"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """search — поиск по заголовку (регистронезависимо, в обоих языках —
    используется в списке статей админки, где видны и RU, и EN заголовки).
    На обычной ленте фронт его не передаёт. Для живого поиска по сайту
    (заголовок + текст статьи) есть отдельный /articles/search/ (см.
    search_articles ниже) — он возвращает более лёгкие карточки со сниппетом
    вместо полного текста."""
    filters = []
    if search:
        filters.append(
            or_(Article.title_ru.ilike(f"%{search}%"), Article.title_en.ilike(f"%{search}%"))
        )

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
    return ArticleListOut(items=[_article_out(a, lang) for a in items], total=total)


@router.get("/admin/", response_model=ArticleAdminListOut)
def list_articles_admin(
    skip: int = 0,
    limit: int = 10,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Как list_articles выше, но с обоими вариантами заголовка/текста сразу
    (ArticleAdminOut) — список статей в админке (AdminArticles.jsx), где
    таблица и форма редактирования должны видеть RU и EN одновременно. Путь
    идёт ДО "/{article_id}" по той же причине, что и /search/, /popular/ —
    иначе FastAPI попробует распарсить "admin" как article_id."""
    filters = []
    if search:
        filters.append(
            or_(Article.title_ru.ilike(f"%{search}%"), Article.title_en.ilike(f"%{search}%"))
        )

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
    return ArticleAdminListOut(items=items, total=total)


def _build_snippet(title: str, content: str, query: str) -> str:
    """Собирает короткий фрагмент текста вокруг первого совпадения с
    запросом — сначала ищем в заголовке (тогда просто берём начало
    контента), иначе ищем само совпадение в content и обрезаем вокруг
    него с многоточиями по краям. Если совпадений в content вообще нет
    (маловероятно — совпало же что-то в самом query, раз статья попала в
    выдачу), тоже просто возвращаем начало текста."""
    plain = re.sub(r"\s+", " ", content).strip()

    if query.lower() not in title.lower():
        match_pos = plain.lower().find(query.lower())
        if match_pos != -1:
            start = max(0, match_pos - SNIPPET_RADIUS)
            end = min(len(plain), match_pos + len(query) + SNIPPET_RADIUS)
            snippet = plain[start:end].strip()
            if start > 0:
                snippet = f"…{snippet}"
            if end < len(plain):
                snippet = f"{snippet}…"
            return snippet

    snippet = plain[: SNIPPET_RADIUS * 2].strip()
    if len(plain) > len(snippet):
        snippet = f"{snippet}…"
    return snippet


@router.get("/search/", response_model=ArticleSearchListOut)
def search_articles(
    q: str,
    limit: int = 8,
    lang: str = Query(default="ru"),
    db: Session = Depends(get_db),
):
    """Живой поиск для модалки в шапке (см. HeaderSection.jsx / SearchModal) —
    ищет по заголовку И по тексту статьи (регистронезависимо), в ОБОИХ
    языках сразу (человек может искать русское слово, даже если сам смотрит
    английскую версию сайта, если он помнит статью на русском, и наоборот),
    возвращает облегчённые карточки со сниппетом вместо полного content, уже
    на языке lang. Путь идёт ДО "/{article_id}" по той же причине, что и
    /popular/ ниже — иначе FastAPI попробует распарсить "search" как article_id."""
    query = q.strip()
    if not query:
        return ArticleSearchListOut(items=[], total=0)

    like = f"%{query}%"
    filters = (
        Article.title_ru.ilike(like),
        Article.title_en.ilike(like),
        Article.content_ru.ilike(like),
        Article.content_en.ilike(like),
    )
    stmt = (
        select(Article)
        .options(*ARTICLE_LOAD_OPTIONS)
        .where(or_(*filters))
        .order_by(Article.created_at.desc())
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(Article).where(or_(*filters))).scalar_one()

    # snippet — не поле модели Article, поэтому его нельзя сначала
    # провалидировать из ORM-объекта (from_attributes упадёт на required
    # поле, которого нет как атрибута), а потом доопределить — нужно
    # посчитать его заранее и передать вместе с остальными данными статьи.
    results = []
    for article in items:
        title = _pick_lang(article.title_ru, article.title_en, lang)
        content = _pick_lang(article.content_ru, article.content_en, lang)
        results.append(
            ArticleSearchOut.model_validate(
                {
                    "id": article.id,
                    "title": title,
                    "tags": [_tag_out(t, lang) for t in article.tags],
                    "author": article.author,
                    "snippet": _build_snippet(title, content, query),
                }
            )
        )

    return ArticleSearchListOut(items=results, total=total)


@router.get("/popular/", response_model=list[ArticleOut])
def list_popular_articles(
    limit: int = 4,
    lang: str = Query(default="ru"),
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
    return [_article_out(a, lang) for a in items]


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(
    article_id: int,
    lang: str = Query(default="ru"),
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
    return _article_out(article, lang)


@router.get("/admin/{article_id}", response_model=ArticleAdminOut)
def get_article_admin(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Полная двуязычная карточка одной статьи — используется, если понадобится
    подгружать статью для формы редактирования отдельным запросом (сейчас
    AdminArticles.jsx получает те же данные из списка list_articles_admin, но
    этот эндпоинт держим для единообразия с остальными /admin/ путями и на
    будущее). Не увеличивает views — это чтение для админки, а не для читателя."""
    stmt = select(Article).where(Article.id == article_id).options(*ARTICLE_LOAD_OPTIONS)
    article = db.execute(stmt).scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/", response_model=ArticleAdminOut, status_code=201)
def create_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    article = Article(
        title_ru=payload.title_ru,
        title_en=payload.title_en,
        content_ru=payload.content_ru,
        content_en=payload.content_en,
        author_id=current_user.id,
    )

    if payload.tag_ids:
        tags = db.execute(select(Tag).where(Tag.id.in_(payload.tag_ids))).scalars().all()
        article.tags = list(tags)

    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.put("/{article_id}", response_model=ArticleAdminOut)
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

    if payload.title_ru is not None:
        article.title_ru = payload.title_ru
    if "title_en" in payload.model_fields_set:
        article.title_en = payload.title_en
    if payload.content_ru is not None:
        article.content_ru = payload.content_ru
    if "content_en" in payload.model_fields_set:
        article.content_en = payload.content_en
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
