import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ArticleFeed from "../ArticleFeed/ArticleFeed";
import { API_BASE_URL } from "../../api";

export default function TagPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [tag, setTag] = useState(null);
  const [tagError, setTagError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTag = async () => {
      setTag(null);
      setTagError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/tags/${slug}`);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? t("tagPage.notFound")
              : t("common.requestError", { status: response.status })
          );
        }
        const data = await response.json();
        if (!cancelled) setTag(data);
      } catch (err) {
        if (!cancelled) setTagError(err.message);
      }
    };

    fetchTag();
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <Link to="/" className="article_back mb-3 d-inline-block">
            {t("common.backToArticles")}
          </Link>

          {tagError && <p className="body_state text-danger">{tagError}</p>}
          {!tagError && (
            <h1 className="tag_page_title">
              {t("tagPage.title", { tag: tag ? tag.name : slug })}
            </h1>
          )}

          {!tagError && (
            <ArticleFeed
              key={slug}
              listUrl={`/tags/${slug}/articles`}
              emptyMessage={t("articleFeed.emptyTag")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
