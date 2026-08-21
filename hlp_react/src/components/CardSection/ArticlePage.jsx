import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from "../../api";

const ArticlePage = () => {
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
        const response = await fetch(`${API_BASE_URL}/articles/${id}`);
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Статья не найдена"
              : `Ошибка запроса: ${response.status}`
          );
        }
        const data = await response.json();
        if (!cancelled) setArticle(data);
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
  }, [id]);

  const tags = article?.tags ?? [];

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body article_page">
          <Link to="/" className="article_back mb-3 d-inline-block">
            &laquo; Назад к статьям
          </Link>

          {loading && <p className="body_state">Загрузка статьи…</p>}
          {error && <p className="body_state text-danger">{error}</p>}
          {!loading && !error && article && (
            <>
              <h1>{article.title}</h1>
              <p className="card_time mb-3">
                Просмотров: {article.views ?? 0}
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
              <p className="article_content">{article.content}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
