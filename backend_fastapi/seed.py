"""Наполняет БД тестовыми статьями и тегами (меню). Запуск: python seed.py

title_en/content_en/name_en — рабочий пример перевода для демонстрации
локализации (см. Article.title_en/content_en и Tag.name_en в
app/models/article.py, app/models/tag.py), не претендует на качество
профессионального перевода — просто чтобы на английской версии сайта сразу
было что показать, а не сплошной RU-фолбэк."""

from app.database import SessionLocal, Base, engine
from app.models import Article, Tag

SAMPLE_ARTICLES = [
    {
        "title_ru": "Как создать карусель отзывов при помощи JavaScript",
        "content_ru": (
            "Пошаговый разбор: разметка, стили и логика простой карусели "
            "без сторонних библиотек. Подходит для новичков, которые только "
            "начинают работать с DOM и событиями."
        ),
        "title_en": "How to Build a Testimonial Carousel with JavaScript",
        "content_en": (
            "A step-by-step walkthrough: markup, styles, and the logic of a "
            "simple carousel with no third-party libraries. Good for "
            "beginners who are just starting out with the DOM and events."
        ),
    },
    {
        "title_ru": "Создание проекта на Django",
        "content_ru": (
            "С чего начать первый проект на Django: установка, структура "
            "приложения, модели, миграции и первый view."
        ),
        "title_en": "Starting a Django Project",
        "content_en": (
            "Where to begin with your first Django project: installation, "
            "app structure, models, migrations, and your first view."
        ),
    },
    {
        "title_ru": "Основы FastAPI за 10 минут",
        "content_ru": (
            "Быстрый обзор FastAPI: роутинг, Pydantic-схемы, зависимости "
            "и автогенерируемая документация на /docs."
        ),
        "title_en": "FastAPI Basics in 10 Minutes",
        "content_en": (
            "A quick tour of FastAPI: routing, Pydantic schemas, "
            "dependencies, and the auto-generated docs at /docs."
        ),
    },
    {
        "title_ru": "Что такое REST API простыми словами",
        "content_ru": (
            "Разбираем базовые принципы REST: методы GET/POST/PUT/DELETE, "
            "статус-коды, идемпотентность и типичные ошибки начинающих."
        ),
        "title_en": "What Is a REST API, in Plain English",
        "content_en": (
            "The basic principles of REST: GET/POST/PUT/DELETE methods, "
            "status codes, idempotency, and common beginner mistakes."
        ),
    },
    {
        "title_ru": "React Hooks: useState и useEffect на примерах",
        "content_ru": (
            "Показываем на практике, как работают самые частые хуки React, "
            "какие грабли встречаются и как их избежать в реальных проектах."
        ),
        "title_en": "React Hooks: useState and useEffect by Example",
        "content_en": (
            "A hands-on look at how the most common React hooks work, the "
            "pitfalls you'll run into, and how to avoid them in real projects."
        ),
    },
    {
        "title_ru": "SQL для начинающих: SELECT, JOIN, GROUP BY",
        "content_ru": (
            "База данных — это не страшно. Разбираем самые нужные конструкции "
            "SQL на простых примерах с готовыми таблицами."
        ),
        "title_en": "SQL for Beginners: SELECT, JOIN, GROUP BY",
        "content_en": (
            "Databases aren't scary. We cover the most useful SQL "
            "constructs with simple examples on ready-made tables."
        ),
    },
    {
        "title_ru": "Git: как не бояться merge conflict",
        "content_ru": (
            "Пошаговая инструкция по разрешению конфликтов слияния в Git, "
            "плюс несколько привычек, которые помогают их избегать."
        ),
        "title_en": "Git: How to Stop Fearing Merge Conflicts",
        "content_en": (
            "A step-by-step guide to resolving merge conflicts in Git, plus "
            "a few habits that help you avoid them in the first place."
        ),
    },
    {
        "title_ru": "CSS Grid vs Flexbox: когда что использовать",
        "content_ru": (
            "Сравниваем два основных инструмента вёрстки в CSS и разбираем, "
            "для каких задач лучше подходит каждый из них."
        ),
        "title_en": "CSS Grid vs Flexbox: When to Use Which",
        "content_en": (
            "Comparing the two main CSS layout tools and breaking down "
            "which tasks each one is best suited for."
        ),
    },
    {
        "title_ru": "Что такое Docker и зачем он нужен разработчику",
        "content_ru": (
            "Контейнеризация на пальцах: чем Docker отличается от виртуальной "
            "машины и почему это упрощает разработку и деплой."
        ),
        "title_en": "What Docker Is and Why Developers Need It",
        "content_en": (
            "Containerization explained simply: how Docker differs from a "
            "virtual machine, and why it makes development and deployment easier."
        ),
    },
    {
        "title_ru": "Асинхронность в Python: async/await",
        "content_ru": (
            "Разбираем, как работает asyncio, чем корутины отличаются от "
            "потоков и когда асинхронность действительно ускоряет код."
        ),
        "title_en": "Async in Python: async/await",
        "content_en": (
            "How asyncio actually works, how coroutines differ from "
            "threads, and when async code genuinely speeds things up."
        ),
    },
    {
        "title_ru": "TypeScript для тех, кто знает JavaScript",
        "content_ru": (
            "Минимальный набор знаний, чтобы начать использовать TypeScript "
            "в существующем JS-проекте без переписывания всего с нуля."
        ),
        "title_en": "TypeScript for JavaScript Developers",
        "content_en": (
            "The minimum you need to know to start using TypeScript in an "
            "existing JS project without rewriting everything from scratch."
        ),
    },
    {
        "title_ru": "Как работает HTTP: от запроса до ответа",
        "content_ru": (
            "Прослеживаем полный путь HTTP-запроса: DNS, TCP-соединение, "
            "заголовки, тело ответа и что происходит внутри браузера."
        ),
        "title_en": "How HTTP Works: From Request to Response",
        "content_en": (
            "Tracing the full path of an HTTP request: DNS, the TCP "
            "connection, headers, the response body, and what happens inside the browser."
        ),
    },
    {
        "title_ru": "PostgreSQL vs MySQL: что выбрать для проекта",
        "content_ru": (
            "Сравниваем две популярные СУБД по типам данных, производительности "
            "и экосистеме — без холивара, только факты."
        ),
        "title_en": "PostgreSQL vs MySQL: Which One to Pick",
        "content_en": (
            "Comparing two popular databases by data types, performance, "
            "and ecosystem — no flame war, just the facts."
        ),
    },
    {
        "title_ru": "Основы алгоритмической сложности O(n)",
        "content_ru": (
            "Объясняем нотацию О-большое на простых примерах, чтобы "
            "перестать бояться вопросов про сложность алгоритмов на собеседованиях."
        ),
        "title_en": "Big-O Notation Basics",
        "content_en": (
            "Explaining Big-O notation with simple examples, so algorithm "
            "complexity questions in interviews stop being scary."
        ),
    },
    {
        "title_ru": "Как настроить CI/CD с нуля на GitHub Actions",
        "content_ru": (
            "Простой пример пайплайна: тесты при каждом пуше и автоматический "
            "деплой при мерже в main."
        ),
        "title_en": "Setting Up CI/CD From Scratch with GitHub Actions",
        "content_en": (
            "A simple pipeline example: tests on every push and automatic "
            "deployment when merging into main."
        ),
    },
    {
        "title_ru": "Что такое SOLID и зачем следовать этим принципам",
        "content_ru": (
            "Разбираем пять принципов SOLID на живых примерах кода, "
            "без академической зауми."
        ),
        "title_en": "What SOLID Is and Why It's Worth Following",
        "content_en": (
            "The five SOLID principles explained with real code examples, "
            "no academic jargon."
        ),
    },
    {
        "title_ru": "Основы тестирования: unit, integration, e2e",
        "content_ru": (
            "Чем отличаются разные уровни тестирования, зачем нужны все "
            "сразу и с какого начать, если тестов в проекте пока нет."
        ),
        "title_en": "Testing Basics: Unit, Integration, E2E",
        "content_en": (
            "How the different testing levels differ, why you need all of "
            "them, and where to start if your project has no tests yet."
        ),
    },
    {
        "title_ru": "Vite вместо Webpack: стоит ли переезжать",
        "content_ru": (
            "Сравниваем скорость сборки, конфигурацию и экосистему плагинов "
            "двух популярных сборщиков фронтенд-проектов."
        ),
        "title_en": "Vite Instead of Webpack: Is It Worth Switching",
        "content_en": (
            "Comparing build speed, configuration, and plugin ecosystems "
            "of two popular frontend bundlers."
        ),
    },
    {
        "title_ru": "Что такое JWT и как работает авторизация по токену",
        "content_ru": (
            "Разбираем структуру JSON Web Token, зачем нужна подпись и "
            "как не хранить токены там, где их легко украсть."
        ),
        "title_en": "What JWT Is and How Token-Based Auth Works",
        "content_en": (
            "The structure of a JSON Web Token, why signing matters, and "
            "where NOT to store tokens if you don't want them stolen."
        ),
    },
    {
        "title_ru": "Redux Toolkit: зачем он нужен, если есть useState",
        "content_ru": (
            "Показываем, в какой момент проекту становится тесно с локальным "
            "состоянием компонентов и как Redux Toolkit упрощает жизнь."
        ),
        "title_en": "Redux Toolkit: Why Bother If You Have useState",
        "content_en": (
            "When a project outgrows local component state, and how Redux "
            "Toolkit makes life easier once it does."
        ),
    },
    {
        "title_ru": "Основы Linux-терминала для разработчика",
        "content_ru": (
            "Минимальный набор команд, без которых не обойтись: навигация "
            "по файловой системе, права доступа, процессы и потоки вывода."
        ),
        "title_en": "Linux Terminal Basics for Developers",
        "content_en": (
            "The minimum set of commands you can't do without: filesystem "
            "navigation, permissions, processes, and output streams."
        ),
    },
    {
        "title_ru": "Что такое кэширование и зачем оно бэкенду",
        "content_ru": (
            "От HTTP-кэша браузера до Redis: разбираем разные уровни "
            "кэширования и типичные ошибки, которые приводят к протухшим данным."
        ),
        "title_en": "What Caching Is and Why the Backend Needs It",
        "content_en": (
            "From the browser's HTTP cache to Redis: the different caching "
            "layers and the common mistakes that lead to stale data."
        ),
    },
    {
        "title_ru": "Паттерн MVC простыми словами",
        "content_ru": (
            "Модель, представление, контроллер — как это выглядит на практике "
            "в веб-фреймворках и почему не стоит пихать логику во view."
        ),
        "title_en": "The MVC Pattern, Explained Simply",
        "content_en": (
            "Model, view, controller — what this looks like in practice in "
            "web frameworks, and why you shouldn't cram logic into the view."
        ),
    },
    {
        "title_ru": "Как работает event loop в JavaScript",
        "content_ru": (
            "Разбираем call stack, callback queue и microtasks на конкретных "
            "примерах с setTimeout и промисами."
        ),
        "title_en": "How the JavaScript Event Loop Works",
        "content_en": (
            "The call stack, callback queue, and microtasks explained with "
            "concrete setTimeout and Promise examples."
        ),
    },
    {
        "title_ru": "Нормализация базы данных: 1NF, 2NF, 3NF",
        "content_ru": (
            "Зачем вообще нормализовать таблицы и когда денормализация "
            "оправдана ради производительности."
        ),
        "title_en": "Database Normalization: 1NF, 2NF, 3NF",
        "content_en": (
            "Why normalize tables in the first place, and when "
            "denormalization is justified for performance."
        ),
    },
    {
        "title_ru": "Основы Nginx: конфиг для простого сайта",
        "content_ru": (
            "Разбираем минимальный конфигурационный файл Nginx: server, "
            "location, proxy_pass и раздача статики."
        ),
        "title_en": "Nginx Basics: Config for a Simple Site",
        "content_en": (
            "A minimal Nginx config file explained: server, location, "
            "proxy_pass, and serving static files."
        ),
    },
    {
        "title_ru": "Что такое WebSocket и чем он лучше polling",
        "content_ru": (
            "Сравниваем способы получать обновления в реальном времени "
            "и разбираем простой пример чата на WebSocket."
        ),
        "title_en": "What WebSocket Is and Why It Beats Polling",
        "content_en": (
            "Comparing ways to get real-time updates and walking through a "
            "simple WebSocket chat example."
        ),
    },
    {
        "title_ru": "Чистый код: имена переменных и функций",
        "content_ru": (
            "Простые правила именования, которые делают код читаемым "
            "даже без комментариев."
        ),
        "title_en": "Clean Code: Naming Variables and Functions",
        "content_en": (
            "Simple naming rules that make code readable even without comments."
        ),
    },
    {
        "title_ru": "Основы Kubernetes для тех, кто знает Docker",
        "content_ru": (
            "Под, деплоймент, сервис — базовые понятия Kubernetes на простых "
            "аналогиях, без погружения в operator'ы и Helm."
        ),
        "title_en": "Kubernetes Basics for People Who Know Docker",
        "content_en": (
            "Pod, deployment, service — core Kubernetes concepts explained "
            "with simple analogies, no deep dive into operators or Helm."
        ),
    },
    {
        "title_ru": "Что такое рефакторинг и когда его делать",
        "content_ru": (
            "Отличаем рефакторинг от переписывания с нуля и разбираем, "
            "как убедить руководителя выделить на это время."
        ),
        "title_en": "What Refactoring Is and When to Do It",
        "content_en": (
            "Telling refactoring apart from a full rewrite, and how to "
            "convince your manager to set aside time for it."
        ),
    },
    {
        "title_ru": "GraphQL против REST: когда что выбрать",
        "content_ru": (
            "Сравниваем два подхода к API на примере одного и того же "
            "запроса данных и разбираем плюсы и минусы каждого."
        ),
        "title_en": "GraphQL vs REST: When to Choose Which",
        "content_en": (
            "Comparing two API approaches on the same data request example, "
            "with the pros and cons of each."
        ),
    },
    {
        "title_ru": "Основы регулярных выражений на практике",
        "content_ru": (
            "Разбираем самые нужные конструкции regex на примерах: "
            "email, телефон, извлечение чисел из текста."
        ),
        "title_en": "Regular Expressions in Practice",
        "content_en": (
            "The most useful regex constructs by example: email, phone "
            "numbers, and extracting numbers from text."
        ),
    },
    {
        "title_ru": "Что такое design system и зачем она фронтенду",
        "content_ru": (
            "Единая библиотека компонентов, токены дизайна и почему "
            "это экономит время команде, а не только дизайнеру."
        ),
        "title_en": "What a Design System Is and Why Frontend Needs One",
        "content_en": (
            "A shared component library, design tokens, and why it saves "
            "the whole team time, not just the designer."
        ),
    },
    {
        "title_ru": "Основы Vue 3 Composition API",
        "content_ru": (
            "Сравниваем Options API и Composition API на живом примере "
            "и разбираем, когда стоит переходить на новый подход."
        ),
        "title_en": "Vue 3 Composition API Basics",
        "content_en": (
            "Comparing the Options API and the Composition API with a live "
            "example, and when it's worth switching to the new approach."
        ),
    },
    {
        "title_ru": "Что такое CORS и почему он вечно всех бесит",
        "content_ru": (
            "Разбираем, зачем браузеры блокируют кросс-доменные запросы "
            "и как правильно настроить заголовки на сервере."
        ),
        "title_en": "What CORS Is and Why It's Endlessly Annoying",
        "content_en": (
            "Why browsers block cross-origin requests, and how to set up "
            "the right headers on the server."
        ),
    },
    {
        "title_ru": "Основы Elasticsearch: полнотекстовый поиск",
        "content_ru": (
            "Индексы, инвертированный индекс и простой пример поиска "
            "по большому объёму текстовых данных."
        ),
        "title_en": "Elasticsearch Basics: Full-Text Search",
        "content_en": (
            "Indexes, the inverted index, and a simple example of "
            "searching a large volume of text data."
        ),
    },
    {
        "title_ru": "Что такое feature flag и зачем он нужен",
        "content_ru": (
            "Как включать функциональность для части пользователей "
            "без нового деплоя и постепенно раскатывать изменения."
        ),
        "title_en": "What a Feature Flag Is and Why You Need One",
        "content_en": (
            "How to enable functionality for a subset of users without a "
            "new deploy, and roll out changes gradually."
        ),
    },
    {
        "title_ru": "Основы работы с Celery и очередями задач",
        "content_ru": (
            "Зачем выносить долгие операции в фоновые задачи и как "
            "настроить простую очередь на Celery с Redis."
        ),
        "title_en": "Celery and Task Queues Basics",
        "content_en": (
            "Why move long-running operations into background tasks, and "
            "how to set up a simple Celery queue with Redis."
        ),
    },
    {
        "title_ru": "Что такое code review и как его не бояться",
        "content_ru": (
            "Как давать и принимать конструктивную обратную связь по коду "
            "без переходов на личности и бесконечных споров о стиле."
        ),
        "title_en": "What Code Review Is and How to Stop Fearing It",
        "content_en": (
            "How to give and take constructive code feedback without "
            "personal jabs or endless style debates."
        ),
    },
    {
        "title_ru": "Основы работы с датами и часовыми поясами",
        "content_ru": (
            "Почему UTC — это не опция, а обязательное правило, и какие "
            "баги возникают, если его игнорировать."
        ),
        "title_en": "Dates and Time Zones Basics",
        "content_en": (
            "Why UTC isn't optional but a hard rule, and what bugs show up "
            "when you ignore it."
        ),
    },
    {
        "title_ru": "Что такое монорепозиторий и когда он оправдан",
        "content_ru": (
            "Разбираем плюсы и минусы хранения нескольких проектов "
            "в одном репозитории на примере фронтенда и бэкенда."
        ),
        "title_en": "What a Monorepo Is and When It's Worth It",
        "content_en": (
            "The pros and cons of keeping several projects in one "
            "repository, using a frontend + backend example."
        ),
    },
    {
        "title_ru": "Основы работы с переменными окружения",
        "content_ru": (
            "Как хранить конфигурацию и секреты отдельно от кода "
            "и не закоммитить пароль от базы данных по ошибке."
        ),
        "title_en": "Environment Variables Basics",
        "content_en": (
            "How to keep configuration and secrets separate from code, and "
            "avoid accidentally committing a database password."
        ),
    },
    {
        "title_ru": "Что такое rate limiting и как его реализовать",
        "content_ru": (
            "Защищаем API от перегрузки: алгоритмы token bucket и "
            "sliding window на простых примерах."
        ),
        "title_en": "What Rate Limiting Is and How to Implement It",
        "content_en": (
            "Protecting an API from overload: the token bucket and sliding "
            "window algorithms with simple examples."
        ),
    },
    {
        "title_ru": "Основы адаптивной вёрстки: mobile-first",
        "content_ru": (
            "Почему стоит начинать вёрстку с мобильной версии и как "
            "media-запросы помогают не сломать десктоп."
        ),
        "title_en": "Responsive Layout Basics: Mobile-First",
        "content_en": (
            "Why it's worth starting layout with the mobile version, and "
            "how media queries keep desktop from breaking."
        ),
    },
    {
        "title_ru": "Что такое дерево компонентов в React",
        "content_ru": (
            "Разбираем, как React строит дерево и почему это важно "
            "понимать для оптимизации перерисовок."
        ),
        "title_en": "What the React Component Tree Is",
        "content_en": (
            "How React builds its tree, and why understanding it matters "
            "for optimizing re-renders."
        ),
    },
    {
        "title_ru": "Основы работы с Webhooks",
        "content_ru": (
            "Чем вебхуки отличаются от обычных API-запросов и как "
            "принять и проверить подпись входящего вебхука."
        ),
        "title_en": "Webhooks Basics",
        "content_en": (
            "How webhooks differ from regular API requests, and how to "
            "receive and verify the signature of an incoming webhook."
        ),
    },
    {
        "title_ru": "Что такое технический долг и как с ним жить",
        "content_ru": (
            "Технический долг — это не всегда плохо. Разбираем, когда "
            "его стоит брать осознанно, а когда он тормозит команду."
        ),
        "title_en": "What Technical Debt Is and How to Live With It",
        "content_en": (
            "Technical debt isn't always bad. When it's worth taking on "
            "deliberately, and when it just slows the team down."
        ),
    },
    {
        "title_ru": "Основы серверного рендеринга (SSR)",
        "content_ru": (
            "Зачем нужен SSR, чем он отличается от CSR и SSG, и когда "
            "оправдано усложнение архитектуры ради него."
        ),
        "title_en": "Server-Side Rendering (SSR) Basics",
        "content_en": (
            "Why SSR exists, how it differs from CSR and SSG, and when the "
            "added architectural complexity is worth it."
        ),
    },
    {
        "title_ru": "Что такое idempotency key в платёжных API",
        "content_ru": (
            "Как избежать двойного списания денег при повторной "
            "отправке одного и того же запроса из-за сетевых сбоев."
        ),
        "title_en": "What an Idempotency Key Is in Payment APIs",
        "content_en": (
            "How to avoid double-charging a customer when the same "
            "request gets retried after a network hiccup."
        ),
    },
]


# Меню тегов — двуязычная иерархия "родитель -> подтеги", как в реальном
# сайте (см. HeaderSection.jsx, TagMenuItem: клик по родителю показывает
# статьи всех вложенных подтегов). slug НЕ переводится — это стабильный
# идентификатор в URL (/tags/frontend), одинаковый для RU и EN версии сайта.
# match_keywords — не поле модели, используется только ниже в
# _link_articles_to_tags(), чтобы после сидинга статей сразу расставить им
# теги по словам в русском заголовке (иначе меню сидело бы пустым).
SAMPLE_TAGS = [
    {
        "name_ru": "Frontend",
        "name_en": "Frontend",
        "slug": "frontend",
        "match_keywords": [],
        "children": [
            {"name_ru": "JavaScript", "name_en": "JavaScript", "slug": "javascript",
             "match_keywords": ["javascript", "event loop", "регулярных выражений"]},
            {"name_ru": "TypeScript", "name_en": "TypeScript", "slug": "typescript",
             "match_keywords": ["typescript"]},
            {"name_ru": "React", "name_en": "React", "slug": "react",
             "match_keywords": ["react"]},
            {"name_ru": "Vue", "name_en": "Vue", "slug": "vue",
             "match_keywords": ["vue"]},
            {"name_ru": "CSS", "name_en": "CSS", "slug": "css",
             "match_keywords": ["css", "адаптивной вёрстки"]},
            {"name_ru": "Дизайн-системы", "name_en": "Design Systems", "slug": "design-systems",
             "match_keywords": ["design system"]},
        ],
    },
    {
        "name_ru": "Backend",
        "name_en": "Backend",
        "slug": "backend",
        "match_keywords": [],
        "children": [
            {"name_ru": "Python", "name_en": "Python", "slug": "python",
             "match_keywords": ["python", "асинхронность"]},
            {"name_ru": "Django", "name_en": "Django", "slug": "django",
             "match_keywords": ["django"]},
            {"name_ru": "FastAPI", "name_en": "FastAPI", "slug": "fastapi",
             "match_keywords": ["fastapi"]},
            {"name_ru": "SQL / базы данных", "name_en": "SQL / Databases", "slug": "sql",
             "match_keywords": ["sql", "postgresql", "нормализация", "elasticsearch"]},
            {"name_ru": "API-дизайн", "name_en": "API Design", "slug": "api-design",
             "match_keywords": ["rest api", "graphql", "jwt", "idempotency", "rate limiting", "webhook"]},
        ],
    },
    {
        "name_ru": "Деплой и инфраструктура",
        "name_en": "Deployment & Infrastructure",
        "slug": "deploy",
        "match_keywords": [],
        "children": [
            {"name_ru": "Docker", "name_en": "Docker", "slug": "docker",
             "match_keywords": ["docker"]},
            {"name_ru": "Kubernetes", "name_en": "Kubernetes", "slug": "kubernetes",
             "match_keywords": ["kubernetes"]},
            {"name_ru": "Nginx", "name_en": "Nginx", "slug": "nginx",
             "match_keywords": ["nginx"]},
            {"name_ru": "CI/CD", "name_en": "CI/CD", "slug": "cicd",
             "match_keywords": ["ci/cd"]},
            {"name_ru": "Git", "name_en": "Git", "slug": "git",
             "match_keywords": ["git:"]},
        ],
    },
    {
        "name_ru": "Инженерная культура",
        "name_en": "Engineering",
        "slug": "engineering",
        "match_keywords": [],
        "children": [
            {"name_ru": "Алгоритмы", "name_en": "Algorithms", "slug": "algorithms",
             "match_keywords": ["алгоритмической сложности"]},
            {"name_ru": "Тестирование", "name_en": "Testing", "slug": "testing",
             "match_keywords": ["тестирования"]},
            {"name_ru": "Архитектура", "name_en": "Architecture", "slug": "architecture",
             "match_keywords": ["mvc", "solid", "монорепозиторий", "технический долг", "рефакторинг",
                                 "серверного рендеринга", "чистый код", "code review"]},
        ],
    },
]


def _flatten_tags(tree):
    """Плоский список (без вложенности, но с parent_slug) — удобнее для
    последовательного создания записей Tag (сначала родители, потом дети)."""
    flat = []
    for root in tree:
        children = root.get("children", [])
        flat.append({**{k: v for k, v in root.items() if k != "children"}, "parent_slug": None})
        for child in children:
            flat.append({**child, "parent_slug": root["slug"]})
    return flat


def _seed_tags(db) -> dict[str, Tag]:
    """Создаёт теги из SAMPLE_TAGS, если их ещё нет (по slug — он уникален и
    не переводится, поэтому надёжный ключ для проверки "уже существует").
    Возвращает {slug: Tag} по ВСЕМ тегам из SAMPLE_TAGS (и только что
    созданным, и уже существовавшим) — пригодится для расстановки тегов по
    статьям в _link_articles_to_tags() ниже."""
    flat = _flatten_tags(SAMPLE_TAGS)
    existing_by_slug = {t.slug: t for t in db.query(Tag).all()}

    created = 0
    # Сначала родительские теги (parent_slug is None), потом дети — иначе
    # при создании ребёнка родителя может ещё не быть в existing_by_slug.
    for data in sorted(flat, key=lambda t: t["parent_slug"] is not None):
        if data["slug"] in existing_by_slug:
            continue
        parent = existing_by_slug.get(data["parent_slug"]) if data["parent_slug"] else None
        tag = Tag(
            name_ru=data["name_ru"],
            name_en=data["name_en"],
            slug=data["slug"],
            parent_id=parent.id if parent else None,
        )
        db.add(tag)
        db.flush()  # чтобы tag.id был доступен для детей этого тега на следующей итерации
        existing_by_slug[data["slug"]] = tag
        created += 1

    if created:
        db.commit()
        print(f"Добавлено тегов: {created} (всего теперь: {len(existing_by_slug)})")
    else:
        print(f"Теги уже есть ({len(existing_by_slug)}), пропускаю заполнение.")

    return existing_by_slug


def _link_articles_to_tags(db, tags_by_slug: dict[str, Tag]) -> None:
    """Расставляет тегам статьи по ключевым словам в русском заголовке
    (match_keywords в SAMPLE_TAGS) — чисто для наглядности демо-данных,
    чтобы пункты меню сразу вели на непустые списки статей, а не были
    декорацией. Трогает только статьи, у которых сейчас вообще нет тегов —
    повторный запуск seed.py не будет каждый раз переназначать теги заново
    или дублировать существующие привязки вручную расставленные админом."""
    flat = _flatten_tags(SAMPLE_TAGS)
    keyword_map = [
        (tags_by_slug[t["slug"]], [kw.lower() for kw in t.get("match_keywords", [])])
        for t in flat
        if t.get("match_keywords")
    ]

    articles = db.query(Article).filter(~Article.tags.any()).all()
    linked = 0
    for article in articles:
        title_lower = article.title_ru.lower()
        matched_tags = [tag for tag, keywords in keyword_map if any(kw in title_lower for kw in keywords)]
        if matched_tags:
            article.tags = matched_tags
            linked += 1

    if linked:
        db.commit()
        print(f"Привязаны теги к статьям: {linked}")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Article).count()
        if existing >= len(SAMPLE_ARTICLES):
            print(f"В базе уже {existing} статей, пропускаю заполнение.")
        else:
            # Добавляем только недостающие статьи, чтобы можно было безопасно
            # перезапускать seed после того, как добавили новые темы в список.
            to_add = SAMPLE_ARTICLES[existing:]
            for data in to_add:
                db.add(Article(**data))
            db.commit()
            print(f"Добавлено статей: {len(to_add)} (всего теперь: {existing + len(to_add)})")

        tags_by_slug = _seed_tags(db)
        _link_articles_to_tags(db, tags_by_slug)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
