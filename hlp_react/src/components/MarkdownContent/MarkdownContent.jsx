import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import CodeBlock from "./CodeBlock";
import "highlight.js/styles/github-dark.css";
import "./MarkdownContent.css";

// react-markdown по умолчанию пропускает только http(s)/mailto/xmpp/irc —
// data: URI (например, вставленный скриншот) обрезается в пустую строку из
// соображений безопасности. Разрешаем data: отдельно, но только для
// картинок (data:image/...) — на ссылки <a> это не распространяется.
function urlTransform(url, key, node) {
  if (node?.tagName === "img" && /^data:image\//i.test(url)) {
    return url;
  }
  return defaultUrlTransform(url, key, node);
}

/**
 * Рендерит content статьи как Markdown: заголовки, списки, картинки,
 * таблицы (remark-gfm), подсветка кода (rehype-highlight) + кнопка
 * "копировать" на блоках кода (CodeBlock).
 */
export default function MarkdownContent({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        urlTransform={urlTransform}
        components={{
          // react-markdown с rehype-highlight оборачивает подсвеченный код в
          // <pre><code class="hljs language-xxx">...</code></pre> — здесь мы
          // заменяем рендер <pre>, чтобы вставить своё окно с копированием
          // вместо стандартного <pre>.
          pre({ children }) {
            const codeEl = Array.isArray(children) ? children[0] : children;
            const codeProps = codeEl?.props || {};
            return <CodeBlock className={codeProps.className}>{codeProps.children}</CodeBlock>;
          },
          // Обычный `inline code` (не блок) оставляем как есть — просто стилизуем через CSS
          img({ src, alt }) {
            return (
              <img src={src} alt={alt || ""} loading="lazy" className="markdown-content_img" />
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
