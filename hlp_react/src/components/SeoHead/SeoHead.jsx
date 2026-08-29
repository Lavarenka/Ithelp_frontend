import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { SITE_BASE_URL, SITE_NAME, SITE_DEFAULT_DESCRIPTION } from "../../seoConfig";

// Единая точка для всех <head>-тегов, которые важны для SEO: title,
// meta description, canonical, Open Graph и Twitter Card. Используется на
// каждой публичной странице (см. ArticlePage/TagPage/AboutPage/BodySection)
// вместо того, чтобы руками собирать <Helmet> в каждом компоненте отдельно —
// так все страницы гарантированно получают одинаковый набор тегов.
//
// path — путь БЕЗ домена (например "/articles/12"), из него собирается
// canonical/og:url через SITE_BASE_URL (см. seoConfig.js — там же лежит
// временная заглушка домена, поменять на реальный нужно только там).
//
// noindex — для страниц, которые не должны попадать в индекс (профиль,
// избранное, страница логина/верификации почты — персональный контент,
// одинаковый URL для всех пользователей, но с разным содержимым).
export default function SeoHead({ title, description, path, noindex = false, type = "website" }) {
  const { i18n } = useTranslation();
  const resolvedDescription = description?.trim() || SITE_DEFAULT_DESCRIPTION;
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_BASE_URL}${path || "/"}`;
  const locale = i18n.language === "ru" ? "ru_RU" : "en_US";

  return (
    <Helmet prioritizeSeoTags>
      <html lang={i18n.language} />
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph — превью при шаринге в соцсетях/мессенджерах */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={locale} />

      {/* Twitter Card — тот же принцип, summary без картинки (og:image пока
          не заведён — на сайте нет реального лого/обложки для соцсетей,
          добавить можно позже через SITE_OG_IMAGE в seoConfig.js) */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
    </Helmet>
  );
}
