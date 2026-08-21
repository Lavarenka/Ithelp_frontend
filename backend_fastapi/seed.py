"""Наполняет БД тестовыми тегами и статьями. Запуск: python seed.py"""

from app.database import SessionLocal, Base, engine
from app.models import Article, Tag

# ---------------------------------------------------------------------------
# Теги: вложенное дерево (родитель -> список дочерних). Это только стартовый
# набор для проверки функциональности — дальше теги удобно редактировать
# через API (POST /tags/) без изменений кода.
# ---------------------------------------------------------------------------
TAG_TREE = [
    {
        "name": "Frontend",
        "slug": "frontend",
        "children": [
            {"name": "JavaScript", "slug": "javascript"},
            {"name": "TypeScript", "slug": "typescript"},
            {"name": "React", "slug": "react"},
            {"name": "Vue", "slug": "vue"},
            {"name": "CSS", "slug": "css"},
            {"name": "HTML", "slug": "html"},
            {"name": "Bootstrap", "slug": "bootstrap"},
        ],
    },
    {
        "name": "Backend",
        "slug": "backend",
        "children": [
            {"name": "Python", "slug": "python"},
            {"name": "Django", "slug": "django"},
            {"name": "FastAPI", "slug": "fastapi"},
            {"name": "SQL", "slug": "sql"},
            {"name": "PostgreSQL", "slug": "postgresql"},
        ],
    },
    {
        "name": "Deploy",
        "slug": "deploy",
        "children": [
            {"name": "Docker", "slug": "docker"},
            {"name": "Kubernetes", "slug": "kubernetes"},
            {"name": "Nginx", "slug": "nginx"},
            {"name": "CI/CD", "slug": "cicd"},
            {"name": "Git", "slug": "git"},
        ],
    },
    {
        "name": "Инженерная практика",
        "slug": "engineering",
        "children": [
            {"name": "Алгоритмы", "slug": "algorithms"},
            {"name": "Тестирование", "slug": "testing"},
            {"name": "Архитектура", "slug": "architecture"},
        ],
    },
]


# ---------------------------------------------------------------------------
# Статьи: каждая с набором тегов (по слагам из TAG_TREE выше).
# ---------------------------------------------------------------------------
SAMPLE_ARTICLES = [
    {
        "title": "Как создать карусель отзывов при помощи JavaScript",
        "content": (
            "Пошаговый разбор: разметка, стили и логика простой карусели "
            "без сторонних библиотек. Подходит для новичков, которые только "
            "начинают работать с DOM и событиями."
        ),
        "tags": ["frontend", "javascript"],
    },
    {
        "title": "Создание проекта на Django",
        "content": (
            "С чего начать первый проект на Django: установка, структура "
            "приложения, модели, миграции и первый view."
        ),
        "tags": ["backend", "python", "django"],
    },
    {
        "title": "Основы FastAPI за 10 минут",
        "content": (
            "Быстрый обзор FastAPI: роутинг, Pydantic-схемы, зависимости "
            "и автогенерируемая документация на /docs."
        ),
        "tags": ["backend", "python", "fastapi"],
    },
    {
        "title": "Что такое REST API простыми словами",
        "content": (
            "Разбираем базовые принципы REST: методы GET/POST/PUT/DELETE, "
            "статус-коды, идемпотентность и типичные ошибки начинающих."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "React Hooks: useState и useEffect на примерах",
        "content": (
            "Показываем на практике, как работают самые частые хуки React, "
            "какие грабли встречаются и как их избежать в реальных проектах."
        ),
        "tags": ["frontend", "javascript", "react"],
    },
    {
        "title": "SQL для начинающих: SELECT, JOIN, GROUP BY",
        "content": (
            "База данных — это не страшно. Разбираем самые нужные конструкции "
            "SQL на простых примерах с готовыми таблицами."
        ),
        "tags": ["backend", "sql"],
    },
    {
        "title": "Git: как не бояться merge conflict",
        "content": (
            "Пошаговая инструкция по разрешению конфликтов слияния в Git, "
            "плюс несколько привычек, которые помогают их избегать."
        ),
        "tags": ["deploy", "git"],
    },
    {
        "title": "CSS Grid vs Flexbox: когда что использовать",
        "content": (
            "Сравниваем два основных инструмента вёрстки в CSS и разбираем, "
            "для каких задач лучше подходит каждый из них."
        ),
        "tags": ["frontend", "css"],
    },
    {
        "title": "Что такое Docker и зачем он нужен разработчику",
        "content": (
            "Контейнеризация на пальцах: чем Docker отличается от виртуальной "
            "машины и почему это упрощает разработку и деплой."
        ),
        "tags": ["deploy", "docker"],
    },
    {
        "title": "Асинхронность в Python: async/await",
        "content": (
            "Разбираем, как работает asyncio, чем корутины отличаются от "
            "потоков и когда асинхронность действительно ускоряет код."
        ),
        "tags": ["backend", "python"],
    },
    {
        "title": "TypeScript для тех, кто знает JavaScript",
        "content": (
            "Минимальный набор знаний, чтобы начать использовать TypeScript "
            "в существующем JS-проекте без переписывания всего с нуля."
        ),
        "tags": ["frontend", "javascript", "typescript"],
    },
    {
        "title": "Как работает HTTP: от запроса до ответа",
        "content": (
            "Прослеживаем полный путь HTTP-запроса: DNS, TCP-соединение, "
            "заголовки, тело ответа и что происходит внутри браузера."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "PostgreSQL vs MySQL: что выбрать для проекта",
        "content": (
            "Сравниваем две популярные СУБД по типам данных, производительности "
            "и экосистеме — без холивара, только факты."
        ),
        "tags": ["backend", "sql", "postgresql"],
    },
    {
        "title": "Основы алгоритмической сложности O(n)",
        "content": (
            "Объясняем нотацию О-большое на простых примерах, чтобы "
            "перестать бояться вопросов про сложность алгоритмов на собеседованиях."
        ),
        "tags": ["engineering", "algorithms"],
    },
    {
        "title": "Как настроить CI/CD с нуля на GitHub Actions",
        "content": (
            "Простой пример пайплайна: тесты при каждом пуше и автоматический "
            "деплой при мерже в main."
        ),
        "tags": ["deploy", "cicd", "git"],
    },
    {
        "title": "Что такое SOLID и зачем следовать этим принципам",
        "content": (
            "Разбираем пять принципов SOLID на живых примерах кода, "
            "без академической зауми."
        ),
        "tags": ["engineering", "architecture"],
    },
    {
        "title": "Основы тестирования: unit, integration, e2e",
        "content": (
            "Чем отличаются разные уровни тестирования, зачем нужны все "
            "сразу и с какого начать, если тестов в проекте пока нет."
        ),
        "tags": ["engineering", "testing"],
    },
    {
        "title": "Vite вместо Webpack: стоит ли переезжать",
        "content": (
            "Сравниваем скорость сборки, конфигурацию и экосистему плагинов "
            "двух популярных сборщиков фронтенд-проектов."
        ),
        "tags": ["frontend", "javascript"],
    },
    {
        "title": "Что такое JWT и как работает авторизация по токену",
        "content": (
            "Разбираем структуру JSON Web Token, зачем нужна подпись и "
            "как не хранить токены там, где их легко украсть."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "Redux Toolkit: зачем он нужен, если есть useState",
        "content": (
            "Показываем, в какой момент проекту становится тесно с локальным "
            "состоянием компонентов и как Redux Toolkit упрощает жизнь."
        ),
        "tags": ["frontend", "javascript", "react"],
    },
    {
        "title": "Основы Linux-терминала для разработчика",
        "content": (
            "Минимальный набор команд, без которых не обойтись: навигация "
            "по файловой системе, права доступа, процессы и потоки вывода."
        ),
        "tags": ["deploy"],
    },
    {
        "title": "Что такое кэширование и зачем оно бэкенду",
        "content": (
            "От HTTP-кэша браузера до Redis: разбираем разные уровни "
            "кэширования и типичные ошибки, которые приводят к протухшим данным."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "Паттерн MVC простыми словами",
        "content": (
            "Модель, представление, контроллер — как это выглядит на практике "
            "в веб-фреймворках и почему не стоит пихать логику во view."
        ),
        "tags": ["engineering", "architecture"],
    },
    {
        "title": "Как работает event loop в JavaScript",
        "content": (
            "Разбираем call stack, callback queue и microtasks на конкретных "
            "примерах с setTimeout и промисами."
        ),
        "tags": ["frontend", "javascript"],
    },
    {
        "title": "Нормализация базы данных: 1NF, 2NF, 3NF",
        "content": (
            "Зачем вообще нормализовать таблицы и когда денормализация "
            "оправдана ради производительности."
        ),
        "tags": ["backend", "sql"],
    },
    {
        "title": "Основы Nginx: конфиг для простого сайта",
        "content": (
            "Разбираем минимальный конфигурационный файл Nginx: server, "
            "location, proxy_pass и раздача статики."
        ),
        "tags": ["deploy", "nginx"],
    },
    {
        "title": "Что такое WebSocket и чем он лучше polling",
        "content": (
            "Сравниваем способы получать обновления в реальном времени "
            "и разбираем простой пример чата на WebSocket."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "Чистый код: имена переменных и функций",
        "content": (
            "Простые правила именования, которые делают код читаемым "
            "даже без комментариев."
        ),
        "tags": ["engineering"],
    },
    {
        "title": "Основы Kubernetes для тех, кто знает Docker",
        "content": (
            "Под, деплоймент, сервис — базовые понятия Kubernetes на простых "
            "аналогиях, без погружения в operator'ы и Helm."
        ),
        "tags": ["deploy", "kubernetes", "docker"],
    },
    {
        "title": "Что такое рефакторинг и когда его делать",
        "content": (
            "Отличаем рефакторинг от переписывания с нуля и разбираем, "
            "как убедить руководителя выделить на это время."
        ),
        "tags": ["engineering"],
    },
    {
        "title": "GraphQL против REST: когда что выбрать",
        "content": (
            "Сравниваем два подхода к API на примере одного и того же "
            "запроса данных и разбираем плюсы и минусы каждого."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "Основы регулярных выражений на практике",
        "content": (
            "Разбираем самые нужные конструкции regex на примерах: "
            "email, телефон, извлечение чисел из текста."
        ),
        "tags": ["engineering"],
    },
    {
        "title": "Что такое design system и зачем она фронтенду",
        "content": (
            "Единая библиотека компонентов, токены дизайна и почему "
            "это экономит время команде, а не только дизайнеру."
        ),
        "tags": ["frontend", "css"],
    },
    {
        "title": "Основы Vue 3 Composition API",
        "content": (
            "Сравниваем Options API и Composition API на живом примере "
            "и разбираем, когда стоит переходить на новый подход."
        ),
        "tags": ["frontend", "javascript", "vue"],
    },
    {
        "title": "Что такое CORS и почему он вечно всех бесит",
        "content": (
            "Разбираем, зачем браузеры блокируют кросс-доменные запросы "
            "и как правильно настроить заголовки на сервере."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "Основы Elasticsearch: полнотекстовый поиск",
        "content": (
            "Индексы, инвертированный индекс и простой пример поиска "
            "по большому объёму текстовых данных."
        ),
        "tags": ["backend"],
    },
    {
        "title": "Что такое feature flag и зачем он нужен",
        "content": (
            "Как включать функциональность для части пользователей "
            "без нового деплоя и постепенно раскатывать изменения."
        ),
        "tags": ["deploy", "cicd"],
    },
    {
        "title": "Основы работы с Celery и очередями задач",
        "content": (
            "Зачем выносить долгие операции в фоновые задачи и как "
            "настроить простую очередь на Celery с Redis."
        ),
        "tags": ["backend", "python"],
    },
    {
        "title": "Что такое code review и как его не бояться",
        "content": (
            "Как давать и принимать конструктивную обратную связь по коду "
            "без переходов на личности и бесконечных споров о стиле."
        ),
        "tags": ["engineering", "git"],
    },
    {
        "title": "Основы работы с датами и часовыми поясами",
        "content": (
            "Почему UTC — это не опция, а обязательное правило, и какие "
            "баги возникают, если его игнорировать."
        ),
        "tags": ["backend"],
    },
    {
        "title": "Что такое монорепозиторий и когда он оправдан",
        "content": (
            "Разбираем плюсы и минусы хранения нескольких проектов "
            "в одном репозитории на примере фронтенда и бэкенда."
        ),
        "tags": ["deploy", "git", "architecture"],
    },
    {
        "title": "Основы работы с переменными окружения",
        "content": (
            "Как хранить конфигурацию и секреты отдельно от кода "
            "и не закоммитить пароль от базы данных по ошибке."
        ),
        "tags": ["deploy"],
    },
    {
        "title": "Что такое rate limiting и как его реализовать",
        "content": (
            "Защищаем API от перегрузки: алгоритмы token bucket и "
            "sliding window на простых примерах."
        ),
        "tags": ["backend", "algorithms"],
    },
    {
        "title": "Основы адаптивной вёрстки: mobile-first",
        "content": (
            "Почему стоит начинать вёрстку с мобильной версии и как "
            "media-запросы помогают не сломать десктоп."
        ),
        "tags": ["frontend", "css", "html"],
    },
    {
        "title": "Что такое дерево компонентов в React",
        "content": (
            "Разбираем, как React строит дерево и почему это важно "
            "понимать для оптимизации перерисовок."
        ),
        "tags": ["frontend", "react"],
    },
    {
        "title": "Основы работы с Webhooks",
        "content": (
            "Чем вебхуки отличаются от обычных API-запросов и как "
            "принять и проверить подпись входящего вебхука."
        ),
        "tags": ["backend", "architecture"],
    },
    {
        "title": "Что такое технический долг и как с ним жить",
        "content": (
            "Технический долг — это не всегда плохо. Разбираем, когда "
            "его стоит брать осознанно, а когда он тормозит команду."
        ),
        "tags": ["engineering"],
    },
    {
        "title": "Основы серверного рендеринга (SSR)",
        "content": (
            "Зачем нужен SSR, чем он отличается от CSR и SSG, и когда "
            "оправдано усложнение архитектуры ради него."
        ),
        "tags": ["frontend", "architecture"],
    },
    {
        "title": "Что такое idempotency key в платёжных API",
        "content": (
            "Как избежать двойного списания денег при повторной "
            "отправке одного и того же запроса из-за сетевых сбоев."
        ),
        "tags": ["backend", "architecture"],
    },
]


def _seed_tags(db):
    """Создаёт дерево тегов, если его ещё нет. Возвращает словарь slug -> Tag."""
    existing = {tag.slug: tag for tag in db.query(Tag).all()}
    if existing:
        print(f"Теги уже есть в базе ({len(existing)} шт.), пропускаю создание тегов.")
        return existing

    slug_to_tag = {}

    def create_branch(node, parent):
        tag = Tag(name=node["name"], slug=node["slug"], parent=parent)
        db.add(tag)
        db.flush()  # чтобы получить tag.id для детей
        slug_to_tag[node["slug"]] = tag
        for child in node.get("children", []):
            create_branch(child, tag)

    for root in TAG_TREE:
        create_branch(root, None)

    db.commit()
    print(f"Создано тегов: {len(slug_to_tag)}")
    return slug_to_tag


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        slug_to_tag = _seed_tags(db)

        existing_count = db.query(Article).count()
        if existing_count >= len(SAMPLE_ARTICLES):
            print(f"В базе уже {existing_count} статей, пропускаю заполнение статей.")
            return

        to_add = SAMPLE_ARTICLES[existing_count:]
        for data in to_add:
            tag_slugs = data.get("tags", [])
            article = Article(title=data["title"], content=data["content"])
            article.tags = [slug_to_tag[s] for s in tag_slugs if s in slug_to_tag]
            db.add(article)
        db.commit()
        print(
            f"Добавлено статей: {len(to_add)} "
            f"(всего теперь: {existing_count + len(to_add)})"
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
