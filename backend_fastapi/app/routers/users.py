"""Управление пользователями — доступно только администраторам (см. require_admin)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User, Comment, CommentVote, Favorite
from app.schemas import UserAdminOut, UserListOut, UserRoleUpdate, UserActiveUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UserListOut)
def list_users(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    items = db.execute(stmt).scalars().all()
    total = db.execute(select(func.count()).select_from(User)).scalar_one()
    return UserListOut(items=items, total=total)


@router.put("/{user_id}/role", response_model=UserAdminOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Нельзя снять права admin с самого себя")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/active", response_model=UserAdminOut)
def update_user_active(
    user_id: int,
    payload: UserActiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать самого себя")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Явно чистим ссылки на пользователя перед удалением — не полагаемся
    # только на ondelete в моделях (PRAGMA foreign_keys=ON включена в
    # database.py и теперь тоже это обеспечивает, но явный код здесь
    # надёжнее и не завязан на то, включена ли PRAGMA у конкретной БД).
    # Комментарии ОСТАЮТСЯ на сайте — просто теряют автора (author станет
    # "Удалённый пользователь", см. _comment_out в routers/comments.py),
    # чтобы не рвать нить обсуждения под статьёй. Голоса лайк/дизлайк
    # удалённого пользователя удаляем полностью — они бессмысленны без него.
    db.execute(update(Comment).where(Comment.user_id == user_id).values(user_id=None))
    db.execute(delete(CommentVote).where(CommentVote.user_id == user_id))
    db.execute(delete(Favorite).where(Favorite.user_id == user_id))

    db.delete(user)
    db.commit()
