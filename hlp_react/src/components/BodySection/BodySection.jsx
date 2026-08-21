import { useEffect, useState, useCallback, useRef } from "react";
import "./BodySection.css";
import ArticleCard from "../CardSection/ArticleCard";
import { API_BASE_URL } from "../../api";

const PAGE_SIZE = 6;

export default function BodySection() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Держим счётчик уже загруженных статей в ref, а не только в articles.length —
  // так наблюдатель скролла всегда видит актуальное значение без лишних
  // пересозданий колбэка при каждом обновлении списка.
  const loadedCountRef = useRef(0);
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(async ({ isInitial }) => {
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const skip = isInitial ? 0 : loadedCountRef.current;
      const response = await fetch(
        `${API_BASE_URL}/articles/?skip=${skip}&limit=${PAGE_SIZE}`
      );
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      const data = await response.json();

      setArticles((prev) => {
        const next = isInitial ? data.items : [...prev, ...data.items];
        loadedCountRef.current = next.length;
        return next;
      });
      setTotal(data.total);
      if (isInitial) setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Первая загрузка
  useEffect(() => {
    loadedCountRef.current = 0;
    fetchPage({ isInitial: true });
  }, [fetchPage]);

  const hasMore = total === null || loadedCountRef.current < total;

  // Подгрузка следующей страницы, когда "якорь" внизу списка появляется в зоне видимости
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting;
        if (isVisible && hasMore && !loadingMore) {
          fetchPage({ isInitial: false });
        }
      },
      { rootMargin: "300px" } // начинаем подгружать чуть заранее, до того как якорь окажется на экране
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, loadingMore, error, articles.length]);

  const hasArticles = articles.length > 0;

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          {loading && <p className="body_state">Загрузка статей…</p>}
          {error && (
            <p className="body_state text-danger">
              Не удалось загрузить статьи: {error}
            </p>
          )}
          {!loading && !error && (
            <>
              {!hasArticles && (
                <p className="body_state">Пока нет статей.</p>
              )}
              {hasArticles &&
                articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}

              {hasArticles && hasMore && (
                <div ref={sentinelRef} className="scroll_sentinel">
                  {loadingMore && (
                    <p className="body_state body_state--inline">
                      Загружаем ещё…
                    </p>
                  )}
                </div>
              )}

              {hasArticles && !hasMore && (
                <p className="body_state body_state--inline">
                  Это все статьи.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
