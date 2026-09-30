# Продакшен-образ бэкенда it_hlp (FastAPI + uvicorn).
# Сборка и запуск — через docker-compose.prod.yml в корне репозитория,
# см. DEPLOY_CHECKLIST.md, раздел "Docker-деплой".
FROM python:3.12-slim

WORKDIR /app

# build-essential — на случай, если каким-то зависимостям (например
# cryptography из python-jose) на целевой платформе понадобится сборка из
# исходников, а не готовое manylinux-колесо. Занимает немного места в
# образе, зато исключает редкие, но неприятные сюрпризы при первой сборке
# на сервере.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Без --reload (это только для локальной разработки, см. README.md).
# Количество воркеров можно будет поднять позже через переменную окружения,
# если трафик вырастет — пока один процесс более чем достаточно.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
