// Относительное время публикации ("5 минут назад", "3 дня назад") — для
// карточек статей в ленте (см. ArticleCard.jsx). Раньше там была статичная
// заглушка t("articleCard.timeFallback") ("14 минут назад" всегда, для
// любой статьи) — теперь считаем по-настоящему от article.created_at.
//
// Intl.RelativeTimeFormat выбран вместо ручного форматирования специально
// из-за русской плюрализации (1 минута / 2 минуты / 5 минут) — движок
// браузера уже умеет её правильно, незачем писать свою табличку окончаний.

const UNITS = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "week", seconds: 60 * 60 * 24 * 7 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
];

// locale: "ru" | "en" (то же значение, что i18n.language на сайте)
export function formatRelativeTime(isoString, locale) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const diffSeconds = (date.getTime() - Date.now()) / 1000; // отрицательное — событие в прошлом
  const absSeconds = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat(locale === "ru" ? "ru" : "en", { numeric: "auto" });

  if (absSeconds < 45) {
    return rtf.format(0, "second"); // "сейчас" / "now"
  }

  for (const { unit, seconds } of UNITS) {
    if (absSeconds >= seconds) {
      const value = Math.round(diffSeconds / seconds);
      return rtf.format(value, unit);
    }
  }

  return rtf.format(Math.round(diffSeconds / 60), "minute");
}
