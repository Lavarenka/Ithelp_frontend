// Единое место для всего, что связано с адресом сайта в проде — sitemap.xml,
// canonical-ссылки, hreflang, og:url и т.п. считают отсюда, а не хардкодят
// домен в каждом компоненте по отдельности. Если домен когда-нибудь
// поменяется, нужно обновить его тут, в backend_fastapi/app/config.py
// (site_base_url, на сервере — переменная SITE_BASE_URL в .env), в
// hlp_react/public/robots.txt (строка Sitemap) и в index.html (og:image).
export const SITE_BASE_URL = "https://it-hlp.com";
export const SITE_NAME = "it_hlp";

// Языки сайта. Английская версия — основная: открывается по адресу без
// параметров (так сайт и выглядит для поисковика, у него нет куки). Русская
// версия живёт по тому же пути с ?lang=ru — см. i18n/index.js (параметр в
// адресе важнее куки) и SeoHead (canonical и hreflang для каждой версии).
export const DEFAULT_LANG = "en";
export const SUPPORTED_LANGS = ["en", "ru"];

// Картинка для превью ссылки в соцсетях и мессенджерах (лежит в public/).
// Подключена статично в index.html — её нужно видеть и тем краулерам,
// которые не выполняют JS.
export const SITE_OG_IMAGE = `${SITE_BASE_URL}/og-image.png`;

// Адрес страницы на нужном языке: для английского — без параметров, для
// русского — с ?lang=ru. path — путь БЕЗ домена, например "/articles/12".
export function pageUrl(path = "/", lang = DEFAULT_LANG) {
  const base = `${SITE_BASE_URL}${path}`;
  return lang === DEFAULT_LANG ? base : `${base}?lang=${lang}`;
}

// Фолбэк-описание сайта — используется на страницах, для которых нет своего
// текста (главная, или у статьи почему-то пуст content). Описание зависит
// от языка страницы: русская версия не должна показывать английский
// сниппет в выдаче.
export const SITE_DEFAULT_DESCRIPTIONS = {
  en: "it_hlp is a blog about IT: web, mobile and game development, and design. Clear articles and practical tips.",
  ru: "it_hlp — блог про IT: веб-разработка, мобильные приложения, геймдев и дизайн. Понятные статьи и практические советы.",
};
export const SITE_DEFAULT_DESCRIPTION = SITE_DEFAULT_DESCRIPTIONS[DEFAULT_LANG];

// Подзаголовок для <title> главной страницы: вместо голого "it_hlp" в
// выдаче и во вкладке получится "it_hlp — a blog about IT". На остальных
// страницах заголовок берётся из самой страницы (см. SeoHead).
export const SITE_HOME_TITLES = {
  en: "a blog about IT",
  ru: "блог про IT",
};
