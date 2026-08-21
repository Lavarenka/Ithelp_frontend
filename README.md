# it_hlp

Учебный блог для начинающих разработчиков: статьи по программированию и небольшие
шпаргалки-инструкции. Проект в активной разработке — сейчас реализован минимальный
слой "лента статей + страница статьи", дальше стек будет обрастать функциональностью.

## Стек

**Frontend**
- React 19
- Vite 7
- React Router 7 (клиентский роутинг)
- Bootstrap 5 + Font Awesome (вёрстка, подключены через CDN)

**Backend**
- FastAPI
- SQLAlchemy 2.0 (ORM)
- SQLite для локальной разработки / PostgreSQL для продакшена — переключается одной
  строкой в `.env`, без изменений в коде
- Alembic — зарезервирован под миграции (пока схема создаётся автоматически)

## Структура репозитория

```
Ithelp_frontend/
├── hlp_react/            # Frontend — React + Vite
│   └── src/
│       ├── api.js            # базовый URL бэкенда
│       └── components/       # Header, Body (лента статей), Sitebar, Footer, CardSection
│
├── backend_fastapi/      # Backend — FastAPI + SQLAlchemy
│   └── app/
│       ├── main.py           # точка входа, CORS, роутеры
│       ├── config.py         # настройки из .env
│       ├── database.py       # подключение к БД
│       ├── models/           # SQLAlchemy-модели
│       ├── schemas/          # Pydantic-схемы
│       └── routers/          # эндпоинты
│
└── README.md
```

## Как это работает сейчас

Фронтенд на `/` запрашивает список статей у бэкенда (`GET /articles/`), выводит их
лентой карточек; клик по статье открывает `/articles/:id` с полным текстом и
увеличивает счётчик просмотров. Реализовано: одна сущность — статья (заголовок,
текст, просмотры, дата создания). Категории, теги, комментарии, авторизация — пока
не реализованы, это следующие шаги.

## Быстрый старт (Windows)

Нужны два процесса одновременно — бэкенд и фронтенд, каждый в своём окне PowerShell.

### 1. Backend

```powershell
cd backend_fastapi
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python seed.py
uvicorn app.main:app --reload --port 8000
```

Проверка: [http://localhost:8000/docs](http://localhost:8000/docs) — Swagger со
списком эндпоинтов.

По умолчанию используется SQLite (файл `hlp.db` создаётся автоматически, ничего
ставить не нужно). Как перейти на PostgreSQL — см. `backend_fastapi/README.md`.

### 2. Frontend

```powershell
cd hlp_react
npm install
npm run dev
```

Проверка: [http://localhost:5173/](http://localhost:5173/) — лента статей должна
подтянуться с бэкенда.

## Известные ограничения

- Пагинация в ленте — пока просто вёрстка без логики переключения страниц.
- Комментарии, категории, теги на карточках статей — статичные заглушки в вёрстке,
  реальных данных под них в API ещё нет.
- Bootstrap/Font Awesome подключены через CDN — для полностью офлайн-сборки
  потребуется перевести их в зависимости проекта.
