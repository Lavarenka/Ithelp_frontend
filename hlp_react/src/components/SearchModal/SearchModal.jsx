import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_BASE_URL, withLang } from "../../api";
import "./SearchModal.css";

// Пауза перед запросом после последнего нажатия клавиши — чтобы не бить
// по бэкенду на каждую букву, а ждать, пока пользователь закончит печатать.
const DEBOUNCE_MS = 300;

// Экранируем спецсимволы регулярных выражений в пользовательском запросе —
// иначе поиск, например, "C++" сломал бы RegExp (см. highlightMatches ниже).
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Разбивает text по всем вхождениям query (регистронезависимо) и оборачивает
// совпавшие куски в <mark> — используется и для заголовка, и для сниппета
// результата поиска, чтобы пользователь сразу видел, где нашлось совпадение
// (бэкенд ищет по title ИЛИ content, поэтому подсвечивать нужно в обоих
// местах одинаково, а не только там, где бэкенд построил сниппет).
function highlightMatches(text, query) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "gi"));
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark key={i} className="search-modal_highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// Живой поиск по заголовку и тексту статьи (см. /articles/search/ на
// бэкенде — routers/articles.py, search_articles). Модалка открывается
// кнопкой-лупой в шапке (см. HeaderSection.jsx, data-bs-target="#searchModal"),
// как и логин/регистрация — обычный Bootstrap .modal, без React-состояния
// открыт/закрыт: этим управляет сам Bootstrap через data-атрибуты.
export default function SearchModal() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "done" | "error"
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed) {
      setResults([]);
      setTotal(0);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${withLang(`/articles/search/?q=${encodeURIComponent(trimmed)}`)}`
        );
        if (!response.ok) throw new Error("search failed");
        const data = await response.json();
        setResults(data.items);
        setTotal(data.total);
        setStatus("done");
      } catch {
        setResults([]);
        setTotal(0);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Модалка Bootstrap не размонтирует своё содержимое при закрытии — просто
  // прячет его через display:none — поэтому сбрасываем поиск сами при
  // каждом открытии, чтобы не показывать прошлый запрос/результаты.
  const handleShown = () => {
    setQuery("");
    setResults([]);
    setTotal(0);
    setStatus("idle");
    inputRef.current?.focus();
  };

  useEffect(() => {
    const modalEl = document.getElementById("searchModal");
    if (!modalEl) return;
    modalEl.addEventListener("shown.bs.modal", handleShown);
    return () => modalEl.removeEventListener("shown.bs.modal", handleShown);
  }, []);

  // Клик по результату должен и закрыть модалку, и перейти на статью. Раньше
  // тут был data-bs-dismiss="modal" прямо на <Link> — но у Bootstrap на
  // document висит свой делегированный обработчик клика по [data-bs-dismiss],
  // и он гасит переход react-router (event.preventDefault() успевает
  // сработать раньше, чем Link решает вызвать navigate — Link видит
  // event.defaultPrevented и просто не переходит). Поэтому закрываем модалку
  // вручную через JS API Bootstrap, а не через data-атрибут — тогда клику
  // ничего не мешает, и переход отрабатывает как обычная ссылка.
  const closeModal = () => {
    const modalEl = document.getElementById("searchModal");
    if (!modalEl || !window.bootstrap?.Modal) return;
    window.bootstrap.Modal.getInstance(modalEl)?.hide();
  };

  return (
    <div className="modal fade" id="searchModal" tabIndex="-1" aria-labelledby="searchModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content search-modal">
          <div className="modal-header">
            <h5 className="modal-title" id="searchModalLabel">
              {t("header.search")}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <div className="search-modal_input-wrap">
              <i className="fa-solid fa-magnifying-glass search-modal_input-icon"></i>
              <input
                ref={inputRef}
                type="search"
                className="form-control search-modal_input"
                placeholder={t("search.placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="search-modal_results">
              {status === "loading" && (
                <p className="body_state body_state--inline">{t("common.loading")}</p>
              )}
              {status === "error" && (
                <p className="body_state body_state--inline text-danger">{t("search.error")}</p>
              )}
              {status === "done" && results.length === 0 && (
                <p className="body_state body_state--inline">{t("search.empty")}</p>
              )}
              {status === "idle" && query.trim() === "" && (
                <p className="body_state body_state--inline">{t("search.hint")}</p>
              )}

              {results.length > 0 && (
                <>
                  <ul className="search-modal_list">
                    {results.map((article) => (
                      <li key={article.id} className="search-modal_item">
                        <Link
                          to={`/articles/${article.id}`}
                          className="search-modal_item-link"
                          onClick={closeModal}
                        >
                          <div className="search-modal_item-title">
                            {highlightMatches(article.title, query)}
                          </div>
                          <div className="search-modal_item-snippet">
                            {highlightMatches(article.snippet, query)}
                          </div>
                          {article.tags.length > 0 && (
                            <div className="search-modal_item-tags">
                              {article.tags.map((tag) => (
                                <span key={tag.id} className="badge text-bg-secondary me-1">
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {total > results.length && (
                    <p className="body_state body_state--inline search-modal_more">
                      {t("search.moreResults", { count: total - results.length })}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
