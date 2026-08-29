// Убирает markdown-разметку и превращает текст статьи в обычный плоский
// текст — используется и в превью карточки статьи (ArticleCard.jsx), и в
// meta description для SEO (SeoHead.jsx — поисковикам нужен чистый текст
// без "###"/"```js"/звёздочек, а не сырой markdown-исходник).
export function toPlainExcerpt(markdown, maxLength = 220) {
  if (!markdown) return "";
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ") // блоки кода целиком
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // картинки
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // ссылки — оставляем текст
    .replace(/[#>*_`~-]/g, " ") // заголовки/акценты/списки/строки-разделители
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trim()}…` : plain;
}
