import "./Avatar.css";

// Маленькая круглая аватарка, используется везде, где рядом с текстом
// раньше был просто username — шапка (HeaderSection), комментарии
// (CommentSection), карточки статей (ArticleCard). Если у пользователя нет
// своей картинки (avatar == null — ещё не загружал в профиле), показываем
// ту же иконку-силуэт, что и в ProfilePage (см. .profile-page_avatar-preview),
// чтобы визуально не было двух разных "заглушек" по сайту.
export default function Avatar({ src, alt = "", size = "md", className = "" }) {
  const sizeClass = `avatar avatar--${size}`;
  return (
    <span className={`${sizeClass} ${className}`.trim()}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <i className="fa-solid fa-user" aria-hidden="true"></i>
      )}
    </span>
  );
}
