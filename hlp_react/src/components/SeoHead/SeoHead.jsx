import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import {
  SITE_NAME,
  SITE_DEFAULT_DESCRIPTIONS,
  SITE_HOME_TITLES,
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  pageUrl,
} from "../../seoConfig";

// Единая точка для всех <head>-тегов, которые важны для SEO: title,
// meta description, canonical, hreflang, Open Graph и Twitter Card.
// Используется на каждой публичной странице (см. ArticlePage/TagPage/
// AboutPage/BodySection) вместо того, чтобы руками собирать <Helmet> в
// каждом компоненте отдельно — так все страницы гарантированно получают
// одинаковый набор тегов.
//
// path — путь БЕЗ домена (например "/articles/12"), из него собираются
// canonical, og:url и hreflang-ссылки (см. pageUrl в seoConfig.js).
//
// Двуязычность: у каждой страницы два адреса — английский без параметров и
// русский с ?lang=ru. canonical указывает на адрес текущего языка, а
// hreflang-ссылки перечисляют обе версии (и x-default на английскую) —
// так Google индексирует оба языка отдельно, а не считает их дублями.
//
// noindex — для страниц, которые не должны попадать в индекс (профиль,
// избранное, страница логина/верификации почты — персональный контент,
// одинаковый URL для всех пользователей, но с разным содержимым). Для них
// hreflang не нужен.
export default function SeoHead({ title, description, path, noindex = false, type = "website" }) {
  const { i18n } = useTranslation();
  const lang = SUPPORTED_LANGS.includes(i18n.language) ? i18n.language : DEFAULT_LANG;
  const resolvedDescription = description?.trim() || SITE_DEFAULT_DESCRIPTIONS[lang];
  const safePath = path || "/";
  // Главная (path "/" без title): "it_hlp — a blog about IT". Остальные
  // страницы: "<заголовок страницы> — it_hlp".
  const fullTitle = title
    ? `${title} — ${SITE_NAME}`
    : safePath === "/"
      ? `${SITE_NAME} — ${SITE_HOME_TITLES[lang]}`
      : SITE_NAME;
  const url = pageUrl(safePath, lang);
  const locale = lang === "ru" ? "ru_RU" : "en_US";
  const alternateLocale = lang === "ru" ? "en_US" : "ru_RU";

  return (
    <Helmet prioritizeSeoTags>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Языковые версии страницы — не для noindex-страниц */}
      {!noindex && <link rel="alternate" hrefLang="en" href={pageUrl(safePath, "en")} />}
      {!noindex && <link rel="alternate" hrefLang="ru" href={pageUrl(safePath, "ru")} />}
      {!noindex && (
        <link rel="alternate" hrefLang="x-default" href={pageUrl(safePath, DEFAULT_LANG)} />
      )}

      {/* Open Graph — превью при шаринге в соцсетях/мессенджерах.
          og:image намеренно не здесь, а статично в index.html: его должны
          видеть и краулеры, которые не выполняют JS. */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={alternateLocale} />

      {/* Twitter Card — крупная карточка с картинкой (twitter:image — статично
          в index.html, по той же причине, что и og:image) */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
    </Helmet>
  );
}
