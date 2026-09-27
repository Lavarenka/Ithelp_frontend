// Грубая оценка времени чтения статьи ("N мин чтения" на странице статьи,
// см. ArticlePage.jsx) — считаем по количеству слов в тексте (включая
// markdown-разметку, точность здесь не критична — это просто ориентир для
// читателя, как на большинстве блогов). Средняя скорость чтения ~200 слов
// в минуту — общепринятая оценка, используемая большинством подобных сайтов.
const WORDS_PER_MINUTE = 200;

export function estimateReadingMinutes(text) {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
