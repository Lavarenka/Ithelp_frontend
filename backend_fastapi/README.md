# hlp_backend

Минимальный бэкенд на FastAPI + PostgreSQL + SQLAlchemy для проекта it_hlp.
Пока только одна сущность — статьи (Article), без авторизации и без Alembic-миграций
(таблицы создаются автоматически при старте приложения).

## Запуск (Windows, PowerShell)

### 1. Поднять PostgreSQL через Docker

```powershell
cd F:\claude\it_help\Ithelp_frontend\backend_fastapi
docker-compose up -d
```

Проверить, что контейнер поднялся: `docker ps`.

### 2. Создать виртуальное окружение и поставить зависимости

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Настроить .env

```powershell
copy .env.example .env
```

Значения по умолчанию в `.env.example` уже совпадают с `docker-compose.yml`, менять
ничего не нужно, если не меняли пароли/порты.

### 4. Наполнить базу тестовыми статьями (по желанию)

```powershell
python seed.py
```

### 5. Запустить сервер

```powershell
uvicorn app.main:app --reload --port 8000
```

После запуска:
- API: http://localhost:8000
- Список статей: http://localhost:8000/articles/?skip=0&limit=10
- Документация (Swagger): http://localhost:8000/docs

## Структура

```
app/
  main.py          — точка входа, CORS, регистрация роутеров
  config.py        — настройки из .env
  database.py      — подключение к БД, сессии
  models/article.py — модель Article (SQLAlchemy)
  schemas/article.py — Pydantic-схемы (валидация/сериализация)
  routers/articles.py — эндпоинты /articles/
seed.py            — наполнение БД тестовыми данными
docker-compose.yml — только PostgreSQL
```

## Дальше можно добавить

- Alembic для нормальных миграций (сейчас таблицы создаются "на лету")
- Категории, теги, комментарии, пользователей — по мере необходимости
- Пагинацию с общим количеством записей (сейчас просто skip/limit без total count)
