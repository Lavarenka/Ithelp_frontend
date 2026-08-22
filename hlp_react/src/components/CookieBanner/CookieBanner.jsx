import { useEffect, useState } from "react";
import "./CookieBanner.css";

const STORAGE_KEY = "it_hlp_cookie_consent";

/**
 * Плашка согласия на использование localStorage/куки — как на большинстве
 * сайтов. Сайт технически не ставит cookie-файлы (авторизация хранится в
 * localStorage), но с точки зрения пользователя разница не всегда очевидна,
 * а такой баннер — общепринятая практика для прозрачности. Показывается
 * один раз; выбор запоминается в localStorage и баннер больше не всплывает.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Сообщение об использовании данных">
      <div className="cookie-banner_text">
        Мы используем локальное хранилище браузера для авторизации и других настроек сайта.
        Продолжая пользоваться сайтом, вы соглашаетесь с этим.
      </div>
      <button type="button" className="btn btn-dark cookie-banner_btn" onClick={accept}>
        Понятно
      </button>
    </div>
  );
}
