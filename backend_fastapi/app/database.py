from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# SQLite требует этот флаг для работы с несколькими потоками (uvicorn их использует).
# На PostgreSQL connect_args остаётся пустым — он тут не нужен.
connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# SQLite по умолчанию ИГНОРИРУЕТ ondelete="CASCADE"/"SET NULL", указанные
# в моделях (models/*.py) — это просто подсказка для миграций, реального
# контроля внешних ключей без этого флага нет. Из-за этого раньше удаление
# пользователя через админку (routers/users.py: delete_user, db.delete(user))
# оставляло его комментарии/избранное/голоса висеть с user_id, указывающим
# на уже несуществующего пользователя — и, например, список комментариев
# падал с pydantic ValidationError на CommentOut.author (author = None,
# хотя схема ждала объект). Включаем реальную поддержку внешних ключей на
# каждом новом соединении — тогда SQLite сам применяет ondelete из моделей
# (SET NULL для Comment.user_id/Article.author_id, CASCADE для
# Favorite/CommentVote/OAuthAccount), как и было задумано в моделях.
if settings.database_url.startswith("sqlite"):

    @event.listens_for(Engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
