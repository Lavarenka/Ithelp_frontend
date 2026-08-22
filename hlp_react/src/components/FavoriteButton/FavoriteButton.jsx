import { useState } from "react";
import { useFavorites } from "../../context/FavoritesContext";
import "./FavoriteButton.css";

/**
 * Кнопка-закладка "в избранное" — используется и на карточке в ленте, и на
 * странице статьи. Подсвечивается, когда статья в избранном; для гостя клик
 * не шлёт запрос, а просто показывает всплывающую подсказку "войдите".
 */
export default function FavoriteButton({ articleId, size = "normal", className = "" }) {
  const { isFavorited, isPending, toggleFavorite } = useFavorites();
  const [guestHint, setGuestHint] = useState(false);
  const active = isFavorited(articleId);
  const pending = isPending(articleId);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleFavorite(articleId);
    } catch {
      setGuestHint(true);
      setTimeout(() => setGuestHint(false), 2000);
    }
  };

  return (
    <div className={`favorite-btn-wrap favorite-btn-wrap--${size} ${className}`}>
      <button
        type="button"
        className={`favorite-btn ${active ? "favorite-btn--active" : ""}`}
        onClick={handleClick}
        disabled={pending}
        title={active ? "Убрать из избранного" : "Добавить в избранное"}
        aria-pressed={active}
      >
        <i className={active ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"}></i>
      </button>
      {guestHint && <span className="favorite-btn_hint">Войдите, чтобы добавить в избранное</span>}
    </div>
  );
}
