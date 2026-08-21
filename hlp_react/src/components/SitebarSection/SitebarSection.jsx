import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./SitebarSection.css";
import { API_BASE_URL } from "../../api";

const POPULAR_LIMIT = 4;

export default function Sitebar() {
  const [popularArticles, setPopularArticles] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchPopular = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/articles/popular/?limit=${POPULAR_LIMIT}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setPopularArticles(data);
      } catch {
        // Блок "Популярные статьи" необязателен для базовой работы сайта —
        // если бэкенд недоступен, молча оставляем список пустым.
      }
    };

    fetchPopular();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="layout_sidebar sitebar">
          <div className="advertising mb-3">
            <span className="advertising_label">реклама</span>
            <p className="mb-0">обучение питонычу онлайн за 30 мин</p>
          </div>
          {popularArticles.length > 0 && (
            <div className="star">
              <div className="star_h1">
                <h1>Популярные статьи:</h1>
              </div>
              <hr />
              {popularArticles.map((article) => (
                <div className="star_item mb-2" key={article.id}>
                  <div className="star_item_h2">
                    <Link to={`/articles/${article.id}`}>{article.title}</Link>
                  </div>

                  <div className="star_icons d-flex" title="Количество просмотров">
                    <div className="d-flex me-3">
                      <div>
                        <i className="fa-regular fa-eye"></i>
                      </div>
                      <div>
                        <p>{article.views}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </>
  );
}
