import { useEffect, useState, useCallback } from "react";
import "./BodySection.css";
import ArticleCard from "../CardSection/ArticleCard";
import { API_BASE_URL } from "../../api";

export default function BodySection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [articles, setArticles] = useState([]);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/articles/?skip=0&limit=10`
      );
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      const data = await response.json();
      setArticles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <>
      <div className="col">
        <div className="container-fluid h-100 ">
          <div className="row body_row">
            <div className="col-12 body">
              {loading && <p>loading...</p>}
              {error && (
                <p className="text-danger">
                  Не удалось загрузить статьи: {error}
                </p>
              )}
              {!loading && !error && (
                <div>
                  {articles.length === 0 && <p>Пока нет статей.</p>}
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </div>
            <div className="paginate d-flex justify-content-center">
              <div className="">
                <nav aria-label="Page navigation example">
                  <ul className="pagination_">
                    <li className="page-item me-2">
                      <a className="page-link" href="#" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                      </a>
                    </li>
                    <li className="page-item me-2">
                      <a className="page-link" href="#">
                        1
                      </a>
                    </li>
                    <li className="page-item me-2">
                      <a className="page-link" href="#">
                        2
                      </a>
                    </li>
                    <li className="page-item me-2">
                      <a className="page-link" href="#">
                        3
                      </a>
                    </li>
                    <li className="page-item ">
                      <a className="page-link" href="#" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
