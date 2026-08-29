import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./SitebarSection.css";
import { API_BASE_URL, withLang } from "../../api";

const POPULAR_LIMIT = 4;
// Пока нет WebSocket/SSE — раз в 20с тихо перезапрашиваем топ статей, чтобы
// число комментариев в сайдбаре тоже обновлялось само (например, после
// того как админ кого-то опубликует), а не только по событию просмотра.
const POLL_INTERVAL = 20000;

export default function Sitebar() {
  const { t, i18n } = useTranslation();
  const [popularArticles, setPopularArticles] = useState([]);

  const fetchPopular = useCallback(async ({ signal } = {}) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}${withLang(`/articles/popular/?limit=${POPULAR_LIMIT}`)}`,
        { signal }
      );
      if (!response.ok) return;
      const data = await response.json();
      setPopularArticles(data);
    } catch {
      // Включая AbortError (отмена при размонтировании/повторном вызове) —
      // блок "Популярные статьи" необязателен для базовой работы сайта,
      // при любой ошибке просто оставляем список как есть.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPopular({ signal: controller.signal });
    return () => controller.abort();
    // i18n.language — перезапрашиваем при смене языка, чтобы заголовки
    // статей в сайдбаре обновились на переведённые.
  }, [fetchPopular, i18n.language]);

  // Пересчитываем список после каждого просмотра статьи (событие шлёт
  // ArticlePage) — иначе счётчики в сайдбаре "застывают" до перезагрузки
  // страницы, хотя реальные views на бэкенде уже выросли.
  useEffect(() => {
    const handleArticleViewed = () => {
      fetchPopular();
    };
    window.addEventListener("it_hlp:article-viewed", handleArticleViewed);
    return () => window.removeEventListener("it_hlp:article-viewed", handleArticleViewed);
  }, [fetchPopular]);

  // Тихий фоновый опрос — подхватывает изменившееся число комментариев (и
  // просмотров/порядок топа) без перезагрузки страницы и без ожидания
  // события "article-viewed" (которое стреляет только на самой странице
  // статьи, а не когда комментарий одобрили в админке).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchPopular();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchPopular]);

  return (
    <>
      <div className="layout_sidebar sitebar">
          <div className="advertising mb-3">
            <span className="advertising_label">{t("sidebar.adLabel")}</span>
            <p className="mb-0">{t("sidebar.adText")}</p>
          </div>
          {popularArticles.length > 0 && (
            <div className="star">
              <div className="star_h1">
                <h1>{t("sidebar.popularTitle")}</h1>
              </div>
              <hr />
              {popularArticles.map((article) => (
                <div className="star_item mb-2" key={article.id}>
                  <div className="star_item_h2">
                    <Link to={`/articles/${article.id}`}>{article.title}</Link>
                  </div>

                  <div className="star_icons d-flex">
                    <div className="d-flex me-3" title={t("sidebar.viewsTitle")}>
                      <div>
                        <i className="fa-regular fa-eye"></i>
                      </div>
                      <div>
                        <p>{article.views}</p>
                      </div>
                    </div>
                    <div className="d-flex me-3" title={t("sidebar.commentsTitle")}>
                      <div>
                        <i className="fa-regular fa-comment"></i>
                      </div>
                      <div>
                        <p>{article.comments_count ?? 0}</p>
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
