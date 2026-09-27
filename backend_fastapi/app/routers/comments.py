from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user, get_current_user_optional, require_admin
from app.models import Article, Comment, CommentVote, User
from app.routers.tags import _pick_lang
from app.schemas import (
    CommentCreate,
    CommentOut,
    CommentListOut,
    CommentAdminOut,
    CommentAdminListOut,
    CommentArticleOut,
    CommentAuthorOut,
    CommentVoteOut,
    CommentVoteIn,
    CommentStatusUpdate,
)

router = APIRouter(tags=["comments"])

COMMENT_LOAD_OPTIONS = (selectinload(Comment.author),)
COMMENT_ADMIN_LOAD_OPTIONS = (selectinload(Comment.author), selectinload(Comment.article))


def _annotate_votes(db: Session, comments: list[Comment], current_user: User | None) -> None:
    """Проставляет comment.likes_count / dislikes_count / my_vote "на лету" —
    как _annotate_favorites у статей (см. routers/articles.py): считаем
    агрегаты одним запросом на все комментарии страницы, а не по одному."""
    if not comments:
        return
    comment_ids = [c.id for c in comments]

    counts_stmt = (
        select(CommentVote.comment_id, CommentVote.value, func.count())
        .where(CommentVote.comment_id.in_(comment_ids))
        .group_by(CommentVote.comment_id, CommentVote.value)
    )
    likes: dict[int, int] = {}
    dislikes: dict[int, int] = {}
    for comment_id, value, count in db.execute(counts_stmt).all():
        if value == 1:
            likes[comment_id] = count
        else:
            dislikes[comment_id] = count

    my_votes: dict[int, int] = {}
    if current_user is not None:
        my_votes_stmt = select(CommentVote.comment_id, CommentVote.value).where(
            CommentVote.user_id == current_user.id, CommentVote.comment_id.in_(comment_ids)
        )
        my_votes = dict(db.execute(my_votes_stmt).all())

    for comment in comments:
        comment.likes_count = likes.get(comment.id, 0)
        comment.dislikes_count = dislikes.get(comment.id, 0)
        comment.my_vote = my_votes.get(comment.id)


_DELETED_AUTHOR = CommentAuthorOut(id=0, username="Удалённый пользователь", avatar=None, is_deleted=True)


def _comment_author_out(comment: Comment) -> CommentAuthorOut:
    """author может быть None — пользователь удалён (см. models/comment.py:
    user_id SET NULL при удалении через routers/users.py: delete_user).
    Комментарий при этом остаётся виден на сайте, просто с "виртуальным"
    автором-заглушкой, а не падает с ValidationError, как раньше."""
    if comment.author is None:
        return _DELETED_AUTHOR
    return CommentAuthorOut.model_validate(comment.author)


def _comment_out(comment: Comment) -> CommentOut:
    """Собирает CommentOut вручную (как _comment_admin_out ниже) — author
    не всегда есть напрямую в модели (см. _comment_author_out выше)."""
    return CommentOut(
        id=comment.id,
        article_id=comment.article_id,
        text=comment.text,
        status=comment.status,
        created_at=comment.created_at,
        author=_comment_author_out(comment),
        likes_count=getattr(comment, "likes_count", 0),
        dislikes_count=getattr(comment, "dislikes_count", 0),
        my_vote=getattr(comment, "my_vote", None),
    )


def _comment_admin_out(comment: Comment, lang: str) -> CommentAdminOut:
    """Собирает CommentAdminOut вручную (как _article_out в routers/articles.py) —
    Article.title больше не читается напрямую из модели (see title_ru/title_en +
    _pick_lang), поэтому CommentArticleOut.title нельзя строить через
    from_attributes прямо из comment.article."""
    return CommentAdminOut(
        id=comment.id,
        article_id=comment.article_id,
        text=comment.text,
        status=comment.status,
        created_at=comment.created_at,
        author=_comment_author_out(comment),
        likes_count=getattr(comment, "likes_count", 0),
        dislikes_count=getattr(comment, "dislikes_count", 0),
        my_vote=getattr(comment, "my_vote", None),
        article=CommentArticleOut(
            id=comment.article.id,
            title=_pick_lang(comment.article.title_ru, comment.article.title_en, lang),
        ),
    )


@router.get("/articles/{article_id}/comments", response_model=CommentListOut)
def list_comments(
    article_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Публичный список комментариев к статье — только одобренные
    (status="approved"), новые сверху. Черновики/отклонённые сюда не
    попадают ни для кого, включая их автора — у него уже было
    моментальное сообщение "на модерации" сразу после отправки."""
    filters = [Comment.article_id == article_id, Comment.status == "approved"]

    stmt = (
        select(Comment)
        .options(*COMMENT_LOAD_OPTIONS)
        .where(*filters)
        .order_by(Comment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(Comment).where(*filters)).scalar_one()
    _annotate_votes(db, items, current_user)
    return CommentListOut(items=[_comment_out(c) for c in items], total=total)


@router.post("/articles/{article_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(
    article_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Оставить комментарий может только авторизованный пользователь.
    Комментарий сразу уходит в status="pending" — на публичной странице
    его не видно, пока админ не одобрит (см. list_comments выше и
    moderate_comment ниже). Исключение — комментарии самого админа: он и
    так может публиковать/отклонять чужие, так что модерировать самого
    себя избыточно — публикуем его комментарии сразу."""
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="Статья не найдена")

    # Комментировать может только пользователь с подтверждённым email — это
    # снижает спам/боты с одноразовыми адресами. Админов не трогаем: их
    # аккаунт и так привилегированный (может модерировать чужие комментарии),
    # заставлять их отдельно подтверждать почту избыточно.
    if not current_user.email_verified and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "email_not_verified",
                "detail": "Подтвердите email, чтобы оставлять комментарии",
            },
        )

    comment = Comment(
        article_id=article_id,
        user_id=current_user.id,
        text=payload.text,
        status="approved" if current_user.role == "admin" else "pending",
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    stmt = select(Comment).where(Comment.id == comment.id).options(*COMMENT_LOAD_OPTIONS)
    comment = db.execute(stmt).scalar_one()
    _annotate_votes(db, [comment], current_user)
    return _comment_out(comment)


@router.post("/comments/{comment_id}/vote", response_model=CommentVoteOut)
def vote_comment(
    comment_id: int,
    payload: CommentVoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Лайк/дизлайк — взаимоисключающие (один голос на пользователя,
    UniqueConstraint в модели). Повторный клик по тому же значению снимает
    голос (toggle off); клик по противоположному — переключает голос,
    как на большинстве сайтов (YouTube-style)."""
    comment = db.get(Comment, comment_id)
    if comment is None or comment.status != "approved":
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    existing = db.execute(
        select(CommentVote).where(
            CommentVote.user_id == current_user.id, CommentVote.comment_id == comment_id
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(CommentVote(user_id=current_user.id, comment_id=comment_id, value=payload.value))
    elif existing.value == payload.value:
        db.delete(existing)
    else:
        existing.value = payload.value

    db.commit()

    likes_count = db.execute(
        select(func.count()).select_from(CommentVote).where(
            CommentVote.comment_id == comment_id, CommentVote.value == 1
        )
    ).scalar_one()
    dislikes_count = db.execute(
        select(func.count()).select_from(CommentVote).where(
            CommentVote.comment_id == comment_id, CommentVote.value == -1
        )
    ).scalar_one()
    my_vote_row = db.execute(
        select(CommentVote.value).where(
            CommentVote.user_id == current_user.id, CommentVote.comment_id == comment_id
        )
    ).scalar_one_or_none()

    return CommentVoteOut(likes_count=likes_count, dislikes_count=dislikes_count, my_vote=my_vote_row)


# ---------------------- Админка: модерация комментариев ----------------------
# Полный список для админки должен идти ДО "/comments/{comment_id}"-путей
# ниже с точки зрения деклараций — но тут это не критично, так как
# "/comments" (без сегмента) и "/comments/{comment_id}" (с сегментом)
# структурно разные шаблоны путей и не конкурируют за один слот (в отличие
# от истории с /articles/popular/ vs /articles/{id} — там оба были ровно
# одним динамическим сегментом).


@router.get("/comments", response_model=CommentAdminListOut)
def list_all_comments(
    status_filter: str | None = Query(default=None, alias="status", pattern="^(pending|approved|rejected)$"),
    skip: int = 0,
    limit: int = 20,
    lang: str = Query(default="ru"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Полный список комментариев для админки — можно отфильтровать по
    статусу (?status=pending для очереди на модерацию) или получить все."""
    filters = []
    if status_filter:
        filters.append(Comment.status == status_filter)

    stmt = (
        select(Comment)
        .options(*COMMENT_ADMIN_LOAD_OPTIONS)
        .where(*filters)
        .order_by(Comment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(Comment).where(*filters)).scalar_one()
    _annotate_votes(db, items, None)
    return CommentAdminListOut(items=[_comment_admin_out(c, lang) for c in items], total=total)


@router.patch("/comments/{comment_id}/status", response_model=CommentAdminOut)
def moderate_comment(
    comment_id: int,
    payload: CommentStatusUpdate,
    lang: str = Query(default="ru"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    stmt = select(Comment).where(Comment.id == comment_id).options(*COMMENT_ADMIN_LOAD_OPTIONS)
    comment = db.execute(stmt).scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")

    comment.status = payload.status
    db.commit()
    db.refresh(comment)

    stmt = select(Comment).where(Comment.id == comment_id).options(*COMMENT_ADMIN_LOAD_OPTIONS)
    comment = db.execute(stmt).scalar_one()
    _annotate_votes(db, [comment], None)
    return _comment_admin_out(comment, lang)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Комментарий не найден")
    db.delete(comment)
    db.commit()
