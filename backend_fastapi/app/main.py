from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import articles, tags, auth, users, favorites, comments

# Пока без Alembic-миграций: на старте создаём таблицы, если их ещё нет.
# Когда бэкенд обрастёт другими моделями — заменить на alembic upgrade head.
Base.metadata.create_all(bind=engine)


def _ensure_users_email_verified_column() -> None:
    """create_all выше создаёт только отсутствующие ТАБЛИЦЫ — если users уже
    существовала (обычный случай на уже работающем сайте), новую колонку
    email_verified она сама не добавит. Это разовый ручной "патч" вместо
    полноценных Alembic-миграций (см. комментарий выше) — safe: проверяем,
    что колонки ещё нет, прежде чем добавлять."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "email_verified" in columns:
        return
    # SQLite и PostgreSQL по-разному пишут булевый default в ALTER TABLE —
    # используем DEFAULT FALSE, оно понятно обоим диалектам (SQLite хранит
    # BOOLEAN как 0/1, но принимает литерал FALSE как синоним 0).
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE"))


def _ensure_users_avatar_column() -> None:
    """Та же логика, что и в _ensure_users_email_verified_column() выше —
    добавляем колонку avatar в уже существующую таблицу users, если её там
    ещё нет (см. app/models/user.py)."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("users")}
    if "avatar" in columns:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT"))


_ensure_users_email_verified_column()
_ensure_users_avatar_column()

app = FastAPI(title="it_hlp API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(favorites.router)
app.include_router(comments.router)


@app.get("/")
def root():
    return {"status": "ok"}
