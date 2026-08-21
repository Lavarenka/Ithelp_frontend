import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ArticleFeed from "../ArticleFeed/ArticleFeed";
import { API_BASE_URL } from "../../api";

export default function TagPage() {
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
            response.status === 404 ? "Тег не найден" : `Ошибка запроса: ${response.status}`
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
  }, [slug]);

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <Link to="/" className="article_back mb-3 d-inline-block">
            &laquo; Назад к статьям
          </Link>

          {tagError && <p className="body_state text-danger">{tagError}</p>}
          {!tagError && (
            <h1 className="tag_page_title">
              Статьи по тегу: {tag ? tag.name : slug}
            </h1>
          )}

          {!tagError && (
            <ArticleFeed
              key={slug}
              listUrl={`/tags/${slug}/articles`}
              emptyMessage="По этому тегу пока нет статей."
            />
          )}
        </div>
      </div>
    </div>
  );
}
