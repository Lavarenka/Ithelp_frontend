from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class OAuthAccount(Base):
    """Привязка внешнего аккаунта (Google/GitHub) к пользователю сайта.

    Ищем пользователя именно по (provider, provider_user_id), а не по email:
    email у Google/GitHub человек может поменять, а id аккаунта там постоянный.
    Один пользователь сайта может иметь и Google, и GitHub, и пароль
    одновременно (см. app/routers/oauth.py, _find_or_create_user).
    """

    __tablename__ = "oauth_accounts"
    __table_args__ = (UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # "google" | "github"
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="oauth_accounts")
