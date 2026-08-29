from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import articles, tags, auth, users, favorites, comments, sitemap

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


def _drop_column_if_exists(table: str, column: str) -> None:
    """Пытается удалить колонку в отдельной транзакции — на случай движка БД
    без поддержки DROP COLUMN ошибка не должна поломать транзакцию с уже
    скопированными данными (см. вызовы ниже), поэтому это всегда отдельный
    engine.begin(), а не часть основной транзакции миграции."""
    try:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {column}"))
    except Exception:
        pass


def _ensure_articles_translation_columns() -> None:
    """Локализация статей: разбиваем title/content на title_ru/title_en/
    content_ru/content_en (см. app/models/article.py). Если таблица articles
    уже существовала со старыми однoязычными колонками title/content, тут не
    только добавляем новые колонки, но и КОПИРУЕМ существующие значения в
    _ru — иначе уже написанные статьи "потеряли" бы текст. Старые колонки
    title/content после копирования удаляем отдельным шагом (см.
    _drop_column_if_exists выше) — модель их больше не знает, а раз они были
    NOT NULL, оставлять их пустыми при вставке новых строк нельзя: INSERT в
    articles упал бы с IntegrityError, потому что SQLAlchemy пишет только в
    колонки, которые описаны в модели."""
    inspector = inspect(engine)
    if "articles" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("articles")}

    with engine.begin() as conn:
        if "title_ru" not in columns:
            conn.execute(text("ALTER TABLE articles ADD COLUMN title_ru VARCHAR(200)"))
            if "title" in columns:
                conn.execute(text("UPDATE articles SET title_ru = title WHERE title_ru IS NULL"))
        if "title_en" not in columns:
            conn.execute(text("ALTER TABLE articles ADD COLUMN title_en VARCHAR(200)"))
        if "content_ru" not in columns:
            conn.execute(text("ALTER TABLE articles ADD COLUMN content_ru TEXT"))
            if "content" in columns:
                conn.execute(text("UPDATE articles SET content_ru = content WHERE content_ru IS NULL"))
        if "content_en" not in columns:
            conn.execute(text("ALTER TABLE articles ADD COLUMN content_en TEXT"))
        # На случай, если title_ru/content_ru всё ещё пустые (совсем новая
        # таблица без старых колонок title/content) — модель требует их
        # NOT NULL, подстрахуемся пустой строкой, чтобы не упасть на старте.
        conn.execute(text("UPDATE articles SET title_ru = '' WHERE title_ru IS NULL"))
        conn.execute(text("UPDATE articles SET content_ru = '' WHERE content_ru IS NULL"))

    if "title" in columns:
        _drop_column_if_exists("articles", "title")
    if "content" in columns:
        _drop_column_if_exists("articles", "content")


def _ensure_tags_translation_columns() -> None:
    """Та же логика, что и в _ensure_articles_translation_columns() выше, но
    для Tag.name → name_ru/name_en (см. app/models/tag.py)."""
    inspector = inspect(engine)
    if "tags" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("tags")}

    with engine.begin() as conn:
        if "name_ru" not in columns:
            conn.execute(text("ALTER TABLE tags ADD COLUMN name_ru VARCHAR(100)"))
            if "name" in columns:
                conn.execute(text("UPDATE tags SET name_ru = name WHERE name_ru IS NULL"))
        if "name_en" not in columns:
            conn.execute(text("ALTER TABLE tags ADD COLUMN name_en VARCHAR(100)"))
        conn.execute(text("UPDATE tags SET name_ru = '' WHERE name_ru IS NULL"))

    if "name" in columns:
        _drop_column_if_exists("tags", "name")


_ensure_users_email_verified_column()
_ensure_users_avatar_column()
_ensure_articles_translation_columns()
_ensure_tags_translation_columns()

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
app.include_router(sitemap.router)


@app.get("/")
def root():
    return {"status": "ok"}
