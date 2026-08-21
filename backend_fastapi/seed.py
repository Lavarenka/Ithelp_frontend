"""Наполняет БД тестовыми статьями. Запуск: python seed.py"""

from app.database import SessionLocal, Base, engine
from app.models import Article

SAMPLE_ARTICLES = [
    {
        "title": "Как создать карусель отзывов при помощи JavaScript",
        "content": (
            "Пошаговый разбор: разметка, стили и логика простой карусели "
            "без сторонних библиотек. Подходит для новичков, которые только "
            "начинают работать с DOM и событиями."
        ),
    },
    {
        "title": "Создание проекта на Django",
        "content": (
            "С чего начать первый проект на Django: установка, структура "
            "приложения, модели, миграции и первый view."
        ),
    },
    {
        "title": "Основы FastAPI за 10 минут",
        "content": (
            "Быстрый обзор FastAPI: роутинг, Pydantic-схемы, зависимости "
            "и автогенерируемая документация на /docs."
        ),
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Article).count() > 0:
            print("В базе уже есть статьи, пропускаю заполнение.")
            return
        for data in SAMPLE_ARTICLES:
            db.add(Article(**data))
        db.commit()
        print(f"Добавлено статей: {len(SAMPLE_ARTICLES)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
