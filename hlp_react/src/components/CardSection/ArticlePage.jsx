import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { API_BASE_URL, withLang } from "../../api";
import FavoriteButton from "../FavoriteButton/FavoriteButton";
import MarkdownContent from "../MarkdownContent/MarkdownContent";
import CommentSection from "../CommentSection/CommentSection";
import SeoHead from "../SeoHead/SeoHead";
import { toPlainExcerpt } from "../../utils/markdown";
import { SITE_BASE_URL, SITE_NAME } from "../../seoConfig";

const ArticlePage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        // lang не в зависимостях эффекта (см. ниже) — сознательно: смена
        // языка сайта, пока статья уже открыта, не должна заново дёргать
        // /articles/{id} и увеличивать views ещё раз (бэкенд считает
        // каждый GET за просмотр). Прочитается на актуальном языке при
        // следующем заходе на страницу.
        const response = await fetch(`${API_BASE_URL}${withLang(`/articles/${id}`)}`);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? t("articlePage.notFound")
              : t("common.requestError", { status: response.status })
          );
        }
        const data = await response.json();
        if (!cancelled) {
          setArticle(data);
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
  }, [id, t]);

  const tags = article?.tags ?? [];

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
              <p className="card_time mb-3">
                {t("articlePage.views", { count: article.views ?? 0 })}
              </p>
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

              <CommentSection articleId={article.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
