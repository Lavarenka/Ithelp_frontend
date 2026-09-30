# Чек-лист перед деплоем it_hlp

## 1. Домен (заглушка it-hlp.ru → реальный)

Поменять в ДВУХ местах — они не связаны друг с другом, поменять только одно недостаточно:

- `hlp_react/src/seoConfig.js` — `SITE_BASE_URL` (используется в canonical, og:url, JSON-LD)
- `backend_fastapi/app/config.py` — `site_base_url` (используется в `/sitemap.xml`), лучше переопределить через `.env`, а не менять дефолт в коде
- `hlp_react/public/robots.txt` — строка `Sitemap: https://it-hlp.ru/sitemap.xml` меняется руками, файл статичный

## 2. Бэкенд — переменные окружения (`.env`)

Сейчас в `config.py` дефолты годятся только для локальной разработки, в проде обязательно переопределить через `.env`:

- `secret_key` — сейчас `"dev-secret-key-change-me-in-production"`, используется для подписи JWT. Оставить как есть в проде — дыра в безопасности (кто угодно сможет подделать токен авторизации).
- `database_url` — сейчас `sqlite:///./hlp.db`. Для прод-нагрузки стоит подумать про PostgreSQL, но и SQLite подойдёт для старта, если трафик небольшой.
- `cors_origins` — сейчас только `localhost:5173`/`127.0.0.1:5173`. Добавить реальный домен фронтенда, иначе браузер будет резать все запросы с прод-домена.
- `frontend_base_url` — сейчас `http://localhost:5173`, используется в ссылке подтверждения email. Поменять на реальный адрес фронтенда, иначе ссылки в письмах будут вести на localhost.
- `site_base_url` — см. пункт 1 выше.

## 3. SMTP (подтверждение email)

Сейчас `smtp_host`/`smtp_username`/`smtp_password` пустые — письма не отправляются вообще (регистрация работает, но без подтверждения). Если нужна рабочая отправка писем в проде — завести `.env` с реальными SMTP-данными (`smtp_host`, `smtp_port`, `smtp_username`, `smtp_password`, `smtp_from`).

## 4. Google reCAPTCHA (капча на регистрации и входе)

**Сейчас:** свои ключи уже созданы и прописаны (`VITE_RECAPTCHA_SITE_KEY` в `hlp_react/.env`, `RECAPTCHA_SECRET_KEY` в `backend_fastapi/.env`), в списке доменов — `localhost`.

При деплое:

- [ ] На https://www.google.com/recaptcha/admin → настройки сайта → «Домены» добавить реальный домен (без `https://`, например `it-hlp.ru`). Без этого на проде виджет покажет ошибку «Недопустимый домен».
- [ ] Перенести оба ключа в `.env` на сервере (фронтенд после этого пересобрать — ключ сайта вшивается при сборке; бэкенд перезапустить).
- [ ] Проверка: на виджете нет красной надписи «for testing purposes only», в логе бэкенда при старте нет предупреждения «используется ТЕСТОВЫЙ ключ Google», регистрация проходит.
- [ ] Серверу нужен исходящий доступ к `https://www.google.com/recaptcha/api/siteverify` — если хостинг его режет, любая капча будет считаться непройденной (в логе бэкенда будет «не удалось проверить токен у Google»).

## 5. Вход через Google / GitHub

**Сейчас:** код готов, ключей нет — кнопки «Войти через Google/GitHub» на сайте просто не показываются, всё остальное работает как раньше. Ключи решили завести при деплое.

Все адреса ниже — с `{BACKEND}` = внешний адрес бэкенда на проде (например `https://api.it-hlp.ru` или `https://it-hlp.ru/api` — зависит от того, как будет устроен деплой). Для локальной проверки `{BACKEND}` = `http://localhost:8000`.

### Google

1. [ ] https://console.cloud.google.com → «Платформа аутентификации Google» (Google Auth Platform).
2. [ ] **Брендинг:** название приложения (`it_hlp`), почта поддержки, при желании логотип и ссылка на сайт.
3. [ ] **Клиенты → Создать клиента:**
   - Тип приложения: **«Веб-приложение»**, название любое.
   - «Авторизованные источники JavaScript» — оставить пустым (обмен с Google делает бэкенд, не браузер).
   - «Авторизованные URI перенаправления» → `{BACKEND}/auth/oauth/google/callback` — ровно так, без слэша в конце. Можно добавить сразу два: прод и `http://localhost:8000/auth/oauth/google/callback` для локальной проверки.
   - **Сразу скопировать Client ID и Client Secret** (или «Скачать JSON») — секрет показывается полностью только один раз, при создании.
4. [ ] **Аудитория:** пока статус «Тестирование» — войти смогут только аккаунты из списка «Тестовые пользователи». Для прода нажать «Опубликовать приложение» (статус «В производстве»). Для входа только по email/имени (как у нас) проверка приложения Google не требуется.

### GitHub

1. [ ] https://github.com/settings/developers → OAuth Apps → **New OAuth App**.
   - Application name: `it_hlp`
   - Homepage URL: адрес сайта
   - Authorization callback URL: `{BACKEND}/auth/oauth/github/callback`
2. [ ] На странице приложения скопировать **Client ID** и нажать **Generate a new client secret** → скопировать секрет (тоже показывается один раз).
3. [ ] У GitHub на одно приложение только один callback URL — если нужен и локальный вход, завести второе приложение с `http://localhost:8000/auth/oauth/github/callback` и держать его ключи в локальном `.env`.

### Настройки бэкенда (`backend_fastapi/.env` на сервере)

```
BACKEND_BASE_URL={BACKEND}
FRONTEND_BASE_URL=https://<домен сайта>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

- [ ] `BACKEND_BASE_URL` должен в точности совпадать с началом адресов возврата у Google/GitHub, иначе они ответят ошибкой `redirect_uri_mismatch`.
- [ ] Бэкенд — по https (иначе Google не примет адрес возврата для реального домена, а cookie защиты входа будет без флага secure).
- [ ] Серверу нужен исходящий доступ к `oauth2.googleapis.com`, `openidconnect.googleapis.com`, `github.com`, `api.github.com`, а для аватарок — к `lh3.googleusercontent.com` и `avatars.githubusercontent.com` (если их закрыть, вход работает, просто без аватарки; в логе будет «не удалось скачать аватарку»).
- [ ] Проверка: `{BACKEND}/auth/oauth/providers` отвечает `{"providers": ["google", "github"]}`, в окне входа появились обе кнопки, вход через каждую возвращает на ту же страницу уже залогиненным. Если что-то не так — причина пишется в лог бэкенда строкой `OAuth google: ...` / `OAuth github: ...`.

## 6. Индексация поисковиками

- После деплоя проверить `https://<домен>/robots.txt` и `https://<домен>/sitemap.xml` — что отдаются, что домен в них правильный (см. пункт 1).
- Добавить сайт в Google Search Console / Яндекс.Вебмастер и отправить sitemap.xml туда вручную — это ускорит первую индексацию, не полагаться только на то, что робот сам найдёт robots.txt.
- Дать время на индексацию — SEO-эффект не мгновенный, первые недели можно не увидеть трафика из поиска.

## 7. Прочее (не обязательно к деплою, но стоит держать в голове)

- Сейчас сайт — чистый client-side SPA без SSR/пре-рендеринга (осознанный выбор при доработке SEO). Если после деплоя окажется, что часть поисковиков плохо индексирует JS-контент — можно будет вернуться к вопросу пре-рендеринга отдельных страниц.
- В `SeoHead.jsx` нет `og:image` — на сайте нет готового лого/обложки для превью в соцсетях. Если появится такая картинка — добавить `SITE_OG_IMAGE` в `seoConfig.js` и прокинуть в `SeoHead`.

## 8. Docker-деплой (ветка `deploy-prep`)

Подготовлены файлы для запуска всего проекта в Docker одной командой: `backend_fastapi/Dockerfile`, `hlp_react/Dockerfile` + `nginx.conf` (статика + SPA fallback), `docker-compose.prod.yml` в корне репозитория (Postgres + backend + frontend + nginx-certbot для HTTPS), `deploy/nginx/user_conf.d/*.conf` (reverse proxy), `.env.prod.example`.

Схема: один домен на сайт (`yourdomain.example` + `www.`) и отдельный поддомен на API (`api.yourdomain.example`) — у каждого свой сертификат Let's Encrypt, оба выпускаются и продлеваются автоматически образом [`jonasal/nginx-certbot`](https://github.com/JonasAlfredsson/docker-nginx-certbot).

### Перед первым запуском

- [ ] На сервере установлены Docker и Docker Compose (`docker compose version`).
- [ ] Куплен домен, настроены DNS A-записи на IP сервера: `yourdomain.example`, `www.yourdomain.example`, `api.yourdomain.example` (три записи, не забыть api-поддомен).
- [ ] `cp .env.prod.example .env.prod` → заполнить (пароль Postgres, почта для Let's Encrypt, `VITE_API_URL=https://api.yourdomain.example`, ключ reCAPTCHA). Оставить `STAGING=1` на первый запуск.
- [ ] `cp backend_fastapi/.env.example backend_fastapi/.env` → заполнить как обычно (см. пункты 2–5 выше), и ОБЯЗАТЕЛЬНО указать `DATABASE_URL=postgresql+psycopg://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>` — логин/пароль/имя базы должны СОВПАДАТЬ с тем, что в `.env.prod`. Хост — ровно `db` (имя сервиса в docker-compose, не `localhost`).
- [ ] В `deploy/nginx/user_conf.d/site.conf` и `api.conf` заменить `yourdomain.example` на реальный домен — в ДВУХ местах в каждом файле (`server_name` и три пути `ssl_certificate*`).
- [ ] Перенос напоминаний из пунктов 1–6 выше (домен в `seoConfig.js`/`config.py`/`robots.txt`, SMTP на рабочую почту, reCAPTCHA-домен, OAuth redirect URI) — они никуда не делись, просто теперь применяются к реальному, а не локальному адресу.

### Запуск

```
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f nginx-certbot   # проверить, что сертификат выпустился без ошибок
```

Пока `STAGING=1` — сертификат будет недоверенным (браузер покажет предупреждение), это ожидаемо и нужно только чтобы не упереться в лимит запросов Let's Encrypt во время отладки конфига. Когда всё поднялось без ошибок:

```
# в .env.prod поставить STAGING=0 (или удалить строку), затем:
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx-certbot
```

### После первого успешного запуска

- [ ] Сайт открывается по `https://yourdomain.example` без предупреждения браузера о сертификате.
- [ ] `https://api.yourdomain.example/sitemap.xml` (или как называется эндпоинт) отвечает — бэкенд доступен снаружи.
- [ ] Завести бэкап volume `pg_data` (простейший вариант — `docker compose -f docker-compose.prod.yml exec db pg_dump -U <user> <db> > backup.sql` по расписанию, cron на сервере).
- [ ] Если на локальной SQLite (`backend_fastapi/hlp.db`) уже есть реальные данные (статьи, пользователи), которые нужны на проде — это ОТДЕЛЬНАЯ задача переноса (дамп SQLite → импорт в Postgres), этот docker-compose стартует с пустой базой.

### Дальнейшие обновления сайта (когда решите, как именно — см. обсуждение в чате)

Rebuild + перезапуск только изменившегося сервиса, без даунтайма остальных, например:

```
docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml up -d --build frontend
```

`nginx-certbot` и `db` трогать не нужно — их пересобирать/перезапускать при обычных правках кода не требуется.
