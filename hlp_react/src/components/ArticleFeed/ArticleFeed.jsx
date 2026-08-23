import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import ArticleCard from "../CardSection/ArticleCard";
import { apiRequest } from "../../api";

const PAGE_SIZE = 6;
// Пока нет WebSocket/SSE — раз в 20с тихо подтягиваем свежие счётчики
// (просмотры/избранное/комментарии) для уже загруженных статей, чтобы,
// например, число комментариев в ленте обновлялось само после того как
// админ кого-то опубликует — без перезагрузки страницы. Список статей
// (порядок/наличие карточек, бесконечный скролл) этот опрос не трогает —
// только обновляет цифры у уже отрисованных карточек по id.
const COUNTS_POLL_INTERVAL = 20000;

/**
 * Общая лента статей с бесконечной подгрузкой по скроллу.
 * Принимает listUrl — путь на бэкенде, который отдаёт { items, total } и
 * поддерживает ?skip=&limit= (например "/articles/" или "/tags/frontend/articles").
 * Вынесено из BodySection, чтобы тот же механизм переиспользовать на странице тега.
 */
export default function ArticleFeed({ listUrl, emptyMessage }) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t("articleFeed.emptyDefault");
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

  const fetchPage = useCallback(
    async ({ isInitial }) => {
      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const skip = isInitial ? 0 : loadedCountRef.current;
        const separator = listUrl.includes("?") ? "&" : "?";
        // apiRequest сам подставит токен, если пользователь залогинен (тогда
        // бэкенд проставит is_favorited для каждой статьи) — и просто не
        // добавит заголовок для гостя, публичные списки от этого не ломаются.
        const data = await apiRequest(`${listUrl}${separator}skip=${skip}&limit=${PAGE_SIZE}`);

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
    },
    [listUrl]
  );

  // Первая загрузка — перезапускается, если сменился listUrl (например, перешли на другой тег)
  useEffect(() => {
    loadedCountRef.current = 0;
    setArticles([]);
    setTotal(null);
    fetchPage({ isInitial: true });
  }, [fetchPage]);

  const hasMore = total === null || loadedCountRef.current < total;

  // Тихий фоновый опрос: перезапрашивает ровно то же количество статей,
  // что уже подгружено (skip=0, limit=loadedCountRef.current), и обновляет
  // только числовые поля (comments_count/views/favorites_count) у карточек
  // с совпадающим id — состав ленты, порядок и бесконечный скролл не
  // трогаем, чтобы не сбить пользователю позицию прокрутки или список.
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      if (loadedCountRef.current === 0) return;
      try {
        const separator = listUrl.includes("?") ? "&" : "?";
        const data = await apiRequest(
          `${listUrl}${separator}skip=0&limit=${loadedCountRef.current}`
        );
        const freshById = new Map(data.items.map((a) => [a.id, a]));
        setArticles((prev) =>
          prev.map((a) => {
            const fresh = freshById.get(a.id);
            if (!fresh) return a;
            return {
              ...a,
              comments_count: fresh.comments_count,
              views: fresh.views,
              favorites_count: fresh.favorites_count,
              is_favorited: fresh.is_favorited,
            };
          })
        );
      } catch {
        // Тихий опрос — ошибку молча пропускаем, старые цифры остаются
        // на экране до следующей попытки.
      }
    }, COUNTS_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [listUrl]);

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
    <>
      {loading && <p className="body_state">{t("articleFeed.loading")}</p>}
      {error && (
        <p className="body_state text-danger">
          {t("articleFeed.loadError", { error })}
        </p>
      )}
      {!loading && !error && (
        <>
          {!hasArticles && <p className="body_state">{resolvedEmptyMessage}</p>}
          {hasArticles &&
            articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}

          {hasArticles && hasMore && (
            <div ref={sentinelRef} className="scroll_sentinel">
              {loadingMore && (
                <p className="body_state body_state--inline">
                  {t("articleFeed.loadingMore")}
                </p>
              )}
            </div>
          )}

          {hasArticles && !hasMore && (
            <p className="body_state body_state--inline">{t("articleFeed.allLoaded")}</p>
          )}
        </>
      )}
    </>
  );
}
