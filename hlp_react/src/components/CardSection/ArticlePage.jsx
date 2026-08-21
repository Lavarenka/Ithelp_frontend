import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!article) return <div>Article not found</div>;

  return (
    <div className="col">
      <div className="container-fluid h-100 ">
        <div className="row body_row">
          <div className="col-12 body">
            <h1>{article.title}</h1>

            <p>{article.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
