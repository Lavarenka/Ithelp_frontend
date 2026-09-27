import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { apiFetch } from "../../api";
import FavoriteButton from "../FavoriteButton/FavoriteButton";
import MarkdownContent from "../MarkdownContent/MarkdownContent";
import CommentSection from "../CommentSection/CommentSection";
import SeoHead from "../SeoHead/SeoHead";
import Avatar from "../Avatar/Avatar";
import { toPlainExcerpt } from "../../utils/markdown";
import { formatRelativeTime } from "../../utils/relativeTime";
import { estimateReadingMinutes } from "../../utils/readingTime";
import { SITE_BASE_URL, SITE_NAME } from "../../seoConfig";
import "./ArticlePage.css";

const ArticlePage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // id статьи, которая уже загружена на странице. Если эффект сработал, а id
  // тот же — значит, сменился только язык сайта: перечитываем статью на
  // новом языке, но БЕЗ засчитывания просмотра (count_view=false на бэкенде)
  // и без показа "Загрузка..." (старый текст просто заменится новым — он в
  // этот момент всё равно погашен, см. toggleLanguage в App.jsx).
  const loadedIdRef = useRef(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef(null);
  // Число комментариев для строки со статистикой (иконка с числом рядом с
  // просмотрами) — изначально берём из ArticleOut.comments_count (снимок на
  // момент открытия страницы), но дальше держим в синхроне с тем, что
  // реально показывает CommentSection (см. её onTotalChange) — иначе число
  // "замерзало" на старом значении после добавления/одобрения комментария.
  const [commentsCount, setCommentsCount] = useState(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setCommentsCount(null);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const isLanguageRefetch = loadedIdRef.current === id;

    const fetchArticle = async () => {
      if (!isLanguageRefetch) setLoading(true);
      setError(null);
      try {
        const path = isLanguageRefetch ? `/articles/${id}?count_view=false` : `/articles/${id}`;
        const response = await apiFetch(path);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? i18n.t("articlePage.notFound")
              : i18n.t("common.requestError", { status: response.status })
          );
        }
        const data = await response.json();
        if (!cancelled) {
          setArticle(data);
          loadedIdRef.current = id;
          if (isLanguageRefetch) return;
          // Просмотр статьи увеличивает views на бэкенде — оповещаем
          // остальную страницу (сайдбар "Популярные статьи"), чтобы
          // счётчик обновился без ручной перезагрузки. Простое глобальное
          // событие вместо контекста — статья не единственное место,
          // которое меняет views, а слушателей может быть 0 (это нормально).
          window.dispatchEvent(new CustomEvent("it_hlp:article-viewed"));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchArticle();
    return () => {
      cancelled = true;
    };
    // t сюда сознательно не входит (тексты ошибок берём через i18n.t): ссылка
    // на t меняется при смене языка, и раньше из-за этого статья при
    // переключении RU/EN перезапрашивалась обычным GET и получала лишний
    // просмотр. Теперь смену языка отслеживаем явно через i18n.language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, i18n.language]);

  const tags = article?.tags ?? [];
  const readingMinutes = useMemo(() => estimateReadingMinutes(article?.content), [article?.content]);
  const publishedAbsolute = article?.created_at
    ? new Date(article.created_at).toLocaleDateString(i18n.language === "en" ? "en-US" : "ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  // Копируем ссылку на статью в буфер обмена — раньше кнопка "Поделиться"
  // была только на карточке в ленте (ArticleCard) и никуда не вела (href="#").
  // Здесь делаем её по-настоящему рабочей: Clipboard API с запасным вариантом
  // через execCommand для браузеров/контекстов, где он недоступен (например,
  // без HTTPS).
  const handleShare = async () => {
    const url = `${SITE_BASE_URL}/articles/${id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Буфер обмена недоступен (нет разрешения и т.п.) — не критично, просто
      // ничего не показываем вместо копирования.
    }
  };

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body article_page">
          <Link to="/" className="article_back mb-3 d-inline-block">
            {t("common.backToArticles")}
          </Link>

          {loading && <p className="body_state">{t("articlePage.loading")}</p>}
          {error && <p className="body_state text-danger">{error}</p>}
          {!loading && !error && article && (
            <>
              <SeoHead
                title={article.title}
                description={toPlainExcerpt(article.content, 160)}
                path={`/articles/${id}`}
                type="article"
              />
              {/* JSON-LD (schema.org Article) — не покрывается SeoHead, т.к.
                  это единственное место на сайте, где нужна структурированная
                  разметка такого типа; отдельный <Helmet> здесь не мешает
                  тому, что уже задан в SeoHead — react-helmet-async сливает
                  теги из нескольких <Helmet> на странице. */}
              <Helmet>
                <script type="application/ld+json">
                  {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Article",
                    headline: article.title,
                    description: toPlainExcerpt(article.content, 160),
                    ...(article.created_at && { datePublished: article.created_at }),
                    ...(article.author?.username && {
                      author: {
                        "@type": "Person",
                        name: article.author.username,
                      },
                    }),
                    publisher: {
                      "@type": "Organization",
                      name: SITE_NAME,
                    },
                    mainEntityOfPage: {
                      "@type": "WebPage",
                      "@id": `${SITE_BASE_URL}/articles/${id}`,
                    },
                  })}
                </script>
              </Helmet>
              <div className="d-flex align-items-start justify-content-between gap-3">
                <h1>{article.title}</h1>
                <FavoriteButton articleId={article.id} size="large" />
              </div>

              {/* Автор + дата публикации + время чтения — раньше на странице
                  статьи не было ни того, ни другого, ни третьего (только
                  голый счётчик просмотров текстом), хотя все данные уже
                  приходят с бэкенда в ArticleOut (author, created_at) — не
                  показывались только на этой странице (в ленте — ArticleCard
                  — автор и дата уже были). */}
              <div className="d-flex align-items-center mt-3 mb-3">
                <Avatar
                  src={article.author?.avatar}
                  alt={article.author?.username}
                  size="md"
                  className="me-2"
                />
                <div>
                  <div className="article_meta_author">
                    {article.author?.username ?? t("articleCard.authorFallback")}
                  </div>
                  <div className="article_meta_sub">
                    <span title={publishedAbsolute}>
                      {formatRelativeTime(article.created_at, i18n.language)}
                    </span>
                    <span className="article_meta_dot">·</span>
                    <span>{t("articlePage.readingTime", { minutes: readingMinutes })}</span>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-3 article_stats mb-3">
                <div className="d-flex align-items-center gap-1" title={t("sidebar.viewsTitle")}>
                  <i className="fa-regular fa-eye"></i>
                  <span>{article.views ?? 0}</span>
                </div>
                <div className="d-flex align-items-center gap-1" title={t("sidebar.commentsTitle")}>
                  <i className="fa-regular fa-comment"></i>
                  <span>{commentsCount ?? article.comments_count ?? 0}</span>
                </div>
                <button
                  type="button"
                  className={`article_share_btn${linkCopied ? " article_share_btn--copied" : ""}`}
                  onClick={handleShare}
                >
                  <i className={linkCopied ? "fa-solid fa-check" : "fa-solid fa-share"}></i>
                  <span>{linkCopied ? t("articlePage.linkCopied") : t("articleCard.shareTitle")}</span>
                </button>
              </div>

              {tags.length > 0 && (
                <div className="d-flex card_tags mb-3">
                  {tags.map((tag) => (
                    <div className="me-2" key={tag.id}>
                      <Link to={`/tags/${tag.slug}`} className="card_tag_link">
                        <span className="badge text-bg-secondary">{tag.name}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              {/* Контент статьи — Markdown (заголовки, картинки, списки,
                  блоки кода с кнопкой "копировать"). Раньше был обычный
                  <p>{article.content}</p> — теперь рендерим через
                  MarkdownContent, а сырой текст (для старых статей без
                  markdown-разметки) отображается как обычный абзац, т.к.
                  Markdown-парсер не ломается на plain-тексте. */}
              <MarkdownContent content={article.content} />

              <CommentSection articleId={article.id} onTotalChange={setCommentsCount} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
