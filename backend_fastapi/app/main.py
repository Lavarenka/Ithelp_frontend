from sqlalchemy import inspect, text

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import articles, tags, auth, users, favorites, comments, sitemap, oauth


def _ensure_comments_user_id_nullable() -> None:
    """comments.user_id раньше был NOT NULL (см. models/comment.py — теперь
    там int | None) — при удалении пользователя (routers/users.py:
    delete_user) мы хотим ОБНУЛЯТЬ user_id у его комментариев, а не удалять
    сами комментарии (чтобы не рвать нить обсуждения под статьёй, автор
    просто становится "Удалённый пользователь" — см. _comment_out в
    routers/comments.py). На уже существующей базе физическая колонка
    остаётся NOT NULL, даже если модель поменяли — Base.metadata.create_all()
    ниже создаёт только ОТСУТСТВУЮЩИЕ таблицы, не меняет схему уже
    существующих. SQLite не умеет ALTER COLUMN ... DROP NOT NULL напрямую,
    поэтому пересоздаём таблицу целиком (стандартный приём для SQLite:
    новая таблица с нужной схемой -> копируем данные -> удаляем старую ->
    переименовываем) и переносим существующие данные без потерь. Должно
    выполняться ДО Base.metadata.create_all() ниже, пока таблицы comments
    с новой схемой ещё не существует."""
    inspector = inspect(engine)
    if "comments" not in inspector.get_table_names():
        return  # таблицы ещё нет — create_all ниже создаст её сразу с nullable=True
    columns = {col["name"]: col for col in inspector.get_columns("comments")}
    if columns.get("user_id", {}).get("nullable"):
        return  # уже nullable — миграция не нужна (или уже была применена раньше)

    # ВАЖНО: PRAGMA foreign_keys включена глобально на каждом соединении
    # (см. database.py) — значит DROP TABLE comments ниже каскадно удалит
    # comment_votes.comment_id (ondelete="CASCADE" в models/comment.py),
    # причём это происходит НЕЗАВИСИМО от того, что мы уже скопировали
    # данные в comments_new: голоса привязаны к id старой таблицы, и её
    # удаление стирает их прежде, чем мы успеваем что-то с ними сделать.
    # Раньше это привело к молчаливой потере реального (не "осиротевшего")
    # голоса при первом прогоне миграции на копии продовой базы. Поэтому
    # именно для этой миграции временно отключаем проверку внешних ключей
    # на соединении — данные внутри транзакции всё равно консистентны
    # (мы сами это гарантируем через LEFT JOIN ниже), просто не хотим,
    # чтобы движок каскадно тронул comment_votes при пересборке comments.
    with engine.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(text("""
            CREATE TABLE comments_new (
                id INTEGER NOT NULL PRIMARY KEY,
                article_id INTEGER NOT NULL,
                user_id INTEGER,
                text TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at DATETIME NOT NULL,
                FOREIGN KEY(article_id) REFERENCES articles (id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """))
        # LEFT JOIN на users: если user_id ссылается на уже удалённого
        # пользователя (это как раз штатный случай, из-за которого эта
        # миграция вообще нужна — раньше delete_user не мог обнулить
        # user_id, потому что колонка была NOT NULL, и такие "осиротевшие"
        # строки уже могли накопиться в базе) — переносим строку с user_id
        # = NULL вместо битого user_id, а не оставляем его как есть.
        conn.execute(text("""
            INSERT INTO comments_new (id, article_id, user_id, text, status, created_at)
            SELECT c.id, c.article_id,
                   CASE WHEN u.id IS NULL THEN NULL ELSE c.user_id END,
                   c.text, c.status, c.created_at
            FROM comments c
            LEFT JOIN users u ON u.id = c.user_id
        """))
        conn.execute(text("DROP TABLE comments"))
        conn.execute(text("ALTER TABLE comments_new RENAME TO comments"))
        # Индекс на article_id — как в исходной модели (index=True в
        # models/comment.py), пересоздание таблицы его не сохраняет само.
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_article_id ON comments (article_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comments_status ON comments (status)"))
        conn.execute(text("PRAGMA foreign_keys=ON"))


def _cleanup_orphaned_user_references() -> None:
    """Разовая уборка "хвостов" от пользователей, которые были удалены ДО
    того, как delete_user (routers/users.py) научился сам их подчищать, и
    ДО того, как PRAGMA foreign_keys=ON (database.py) начала реально
    работать в SQLite. Раньше при удалении пользователя оставались строки
    в comment_votes/favorites, ссылающиеся на уже несуществующего
    user_id — это чисто исторический мусор, безопасно удаляемый (голос
    лайк/дизлайк и запись "избранное" бессмысленны без самого пользователя).
    Комментарии здесь НЕ трогаем — им отдельная миграция выше уже
    проставила user_id=NULL, сам текст комментария сохраняется."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "comment_votes" in tables:
            conn.execute(text("""
                DELETE FROM comment_votes
                WHERE user_id NOT IN (SELECT id FROM users)
            """))
        if "favorites" in tables:
            conn.execute(text("""
                DELETE FROM favorites
                WHERE user_id NOT IN (SELECT id FROM users)
            """))


_ensure_comments_user_id_nullable()

# Пока без Alembic-миграций: на старте создаём таблицы, если их ещё нет.
# Когда бэкенд обрастёт другими моделями — заменить на alembic upgrade head.
Base.metadata.create_all(bind=engine)

_cleanup_orphaned_user_references()


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
app.include_router(oauth.router)
app.include_router(articles.router)
app.include_router(tags.router)
app.include_router(users.router)
app.include_router(favorites.router)
app.include_router(comments.router)
app.include_router(sitemap.router)


@app.get("/")
def root():
    return {"status": "ok"}
