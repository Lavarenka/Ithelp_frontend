import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Блок кода с кнопкой "скопировать". Подсветку синтаксиса делает
 * rehype-highlight на уровне MarkdownContent — сюда уже приходит готовый
 * <code className="hljs language-xxx">, наша задача — обернуть его в
 * "окно" с заголовком языка и кнопкой копирования.
 */
export default function CodeBlock({ className, children }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const language = (className || "").replace("language-", "").replace("hljs", "").trim() || "text";
  const codeText = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
    } catch {
      // Фоллбэк для окружений без Clipboard API (например, http без TLS) —
      // временный textarea + document.execCommand.
      const textarea = document.createElement("textarea");
      textarea.value = codeText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // тихо игнорируем — кнопка просто не сработает
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="code-block">
      <div className="code-block_header">
        <span className="code-block_lang">{language}</span>
        <button type="button" className="code-block_copy-btn" onClick={handleCopy}>
          <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
          {copied ? ` ${t("codeBlock.copied")}` : ` ${t("codeBlock.copy")}`}
        </button>
      </div>
      <pre className={className}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
