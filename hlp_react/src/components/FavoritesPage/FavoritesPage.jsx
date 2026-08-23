import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ArticleFeed from "../ArticleFeed/ArticleFeed";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";

export default function FavoritesPage() {
  const { t } = useTranslation();
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
            <p className="body_state">{t("common.loading")}</p>
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
              {t("common.backToArticles")}
            </Link>
            <p className="body_state">
              {t("favorites.guestNotice")}
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
            {t("common.backToArticles")}
          </Link>
          <h1 className="tag_page_title">{t("favorites.title")}</h1>
          <ArticleFeed
            key={favoriteIds.size}
            listUrl="/favorites/"
            emptyMessage={t("articleFeed.emptyFavorites")}
          />
        </div>
      </div>
    </div>
  );
}
