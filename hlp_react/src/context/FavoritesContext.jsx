import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import { apiRequest } from "../api";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

/**
 * Глобальное состояние избранного: набор id избранных статей (для мгновенной
 * подсветки иконки-закладки на любой карточке без похода в API) + счётчик
 * для бейджа в шапке. Один источник правды, чтобы клик на карточке в ленте
 * сразу отражался и в счётчике шапки, и на странице /favorites.
 */
export function FavoritesProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [count, setCount] = useState(0);
  const [pendingIds, setPendingIds] = useState(() => new Set());

  // При входе/выходе (или после проверки токена на старте) — синхронизируем
  // список избранного с сервером. При логауте просто чистим локально.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      setCount(0);
      return;
    }
    let cancelled = false;
    apiRequest("/favorites/?limit=200")
      .then((data) => {
        if (cancelled) return;
        setFavoriteIds(new Set(data.items.map((a) => a.id)));
        setCount(data.total);
      })
      .catch(() => {
        // избранное не критично для работы сайта — просто оставляем пустым
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  const toggleFavorite = useCallback(
    async (articleId) => {
      if (!isAuthenticated) {
        throw new Error(i18n.t("favorites.loginRequiredError"));
      }
      if (pendingIds.has(articleId)) return; // защита от дабл-клика во время запроса

      const wasFavorited = favoriteIds.has(articleId);
      setPendingIds((prev) => new Set(prev).add(articleId));

      // Оптимистичное обновление — сайт реагирует мгновенно, откатываем при ошибке.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        wasFavorited ? next.delete(articleId) : next.add(articleId);
        return next;
      });
      setCount((c) => c + (wasFavorited ? -1 : 1));

      try {
        const result = await apiRequest(`/favorites/${articleId}`, {
          method: wasFavorited ? "DELETE" : "POST",
        });
        // Подстраховка под серверный ответ на случай рассинхрона (например,
        // статья уже была в избранном с другой вкладки).
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          result.is_favorited ? next.add(articleId) : next.delete(articleId);
          return next;
        });
      } catch (err) {
        // откатываем оптимистичное обновление
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          wasFavorited ? next.add(articleId) : next.delete(articleId);
          return next;
        });
        setCount((c) => c + (wasFavorited ? 1 : -1));
        throw err;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      }
    },
    [isAuthenticated, favoriteIds, pendingIds]
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      count,
      isFavorited: (articleId) => favoriteIds.has(articleId),
      isPending: (articleId) => pendingIds.has(articleId),
      toggleFavorite,
    }),
    [favoriteIds, count, pendingIds, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites должен использоваться внутри <FavoritesProvider>");
  return ctx;
}
