import { Link } from "react-router-dom";
import ArticleFeed from "../ArticleFeed/ArticleFeed";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";

export default function FavoritesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  // favoriteIds меняется на каждый toggle — используем как key для ArticleFeed,
  // чтобы список сразу перезапрашивался после добавления/удаления с этой же
  // страницы (иначе убранная из избранного статья осталась бы видна до reload).
  const { favoriteIds } = useFavorites();

  if (isLoading) {
    return (
      <div className="layout_main">
        <div className="body_row">
          <div className="body">
            <p className="body_state">Загрузка…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="layout_main">
        <div className="body_row">
          <div className="body">
            <Link to="/" className="article_back mb-3 d-inline-block">
              « Назад к статьям
            </Link>
            <p className="body_state">
              Войдите, чтобы видеть избранные статьи.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <Link to="/" className="article_back mb-3 d-inline-block">
            « Назад к статьям
          </Link>
          <h1 className="tag_page_title">Избранное</h1>
          <ArticleFeed
            key={favoriteIds.size}
            listUrl="/favorites/"
            emptyMessage="Пока нет избранных статей — нажмите на значок закладки у статьи, чтобы добавить."
          />
        </div>
      </div>
    </div>
  );
}
