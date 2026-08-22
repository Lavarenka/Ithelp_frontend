from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import articles, tags, auth, users

# Пока без Alembic-миграций: на старте создаём таблицы, если их ещё нет.
# Когда бэкенд обрастёт другими моделями — заменить на alembic upgrade head.
Base.metadata.create_all(bind=engine)

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


@app.get("/")
def root():
    return {"status": "ok"}
