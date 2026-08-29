// Единое место для всего, что связано с адресом сайта в проде — sitemap.xml,
// canonical-ссылки, og:url и т.п. считают отсюда, а не хардкодят домен в
// каждом компоненте по отдельности. Сейчас it-hlp.ru — временная заглушка
// (сайт ещё не задеплоен на реальный домен), поменять на настоящий адрес
// нужно будет только тут (и в соответствующей переменной на бэкенде —
// см. backend_fastapi/app/config.py, site_base_url).
export const SITE_BASE_URL = "https://it-hlp.ru";
export const SITE_NAME = "it_hlp";

// Фолбэк-описание сайта — используется на страницах, для которых нет своего
// текста (например, если у статьи почему-то пуст content). Тоже дублирует
// смысл about.heroLead из локалей, но meta description должен быть очень
// коротким и однозначным на английском по умолчанию (сайт стартует на EN,
// см. i18n/index.js) — отдельная константа проще, чем городить это через i18n
// ради одного случая на грани ошибки.
export const SITE_DEFAULT_DESCRIPTION =
  "it_hlp — a blog about web development: JavaScript, Python, Docker, databases and everything in between, explained in plain language.";
