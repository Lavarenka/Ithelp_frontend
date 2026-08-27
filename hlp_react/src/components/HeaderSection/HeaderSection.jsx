import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Header.css";
import { API_BASE_URL } from "../../api";
import TypingLogo from "./TypingLogo";
import AuthModal from "../AuthModal/AuthModal";
import SearchModal from "../SearchModal/SearchModal";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";

const COMPACT_SCROLL_THRESHOLD = 40;

// Один пункт меню: тег с (опционально) вложенными подтегами.
// Клик по самому тегу — это ссылка на /tags/:slug (родительский тег покажет
// статьи всех вложенных подтегов, это делает бэкенд). Стрелка/наведение
// раскрывает список подтегов, если они есть.
function TagMenuItem({ tag }) {
  const hasChildren = tag.children && tag.children.length > 0;

  if (!hasChildren) {
    return (
      <li className="nav-item">
        <Link className="nav-link text-underlined" to={`/tags/${tag.slug}`}>
          {tag.name}
        </Link>
      </li>
    );
  }

  return (
    <li className="nav-item dropdown">
      <Link
        className="nav-link dropdown-toggle text-underlined"
        to={`/tags/${tag.slug}`}
        role="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {tag.name}
      </Link>
      <ul className="dropdown-menu">
        {tag.children.map((child) => (
          <li key={child.id}>
            <Link className="dropdown-item" to={`/tags/${child.slug}`}>
              {child.name}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

// Переключатель языка RU/EN — пока просто заглушка-переключатель без
// реального перевода: меняет только общее состояние языка в App (см.
// пропсы isEn/onToggle), которое сейчас влияет лишь на лёгкую подсветку
// шапки/подвала (header--ru/footer--ru), а текст интерфейса и список
// статей не трогает. Когда подключим i18n и фильтрацию статей по языку,
// это состояние переедет в LanguageContext, а сюда добавится вызов
// i18n.changeLanguage(...).
function LanguageToggle({ isEn, onToggle }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={`lang-toggle ${isEn ? "lang-toggle--en" : ""}`}
      onClick={onToggle}
      title={t("header.languageTitle")}
      aria-label={t("header.languageAriaLabel")}
    >
      <span className="lang-toggle_pill" aria-hidden="true"></span>
      <span className="lang-toggle_half">RU</span>
      <span className="lang-toggle_half">EN</span>
    </button>
  );
}

export default function Header({ isEn, onToggleLanguage }) {
  const { t } = useTranslation();
  const [isCompact, setIsCompact] = useState(false);
  const [tags, setTags] = useState([]);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count: favoritesCount } = useFavorites();

  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > COMPACT_SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTags = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setTags(data);
      } catch {
        // Меню по тегам необязательно для базовой работы сайта —
        // если бэкенд недоступен, молча оставляем список пустым.
      }
    };

    fetchTags();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
       <header
         className={`header mb-4 sticky-top ${isCompact ? "header--compact" : ""} ${!isEn ? "header--ru" : ""}`}
         id="header-nav"
       >
        <div className="container">
            <div className="row header_row align-items-center">
                <div className="col-4 col-lg-2 d-flex align-items-center justify-content-center logo header_link order-2 order-lg-1">
                    <h1>
                        <Link to="/"><TypingLogo /></Link>
                    </h1>
                </div>

                <div className="col-4 col-lg text-center d-flex align-items-center justify-content-center order-1 order-lg-2 header_row_menu">
                    <nav className="navbar navbar-expand-lg " data-bs-theme="dark">
                        <div className="container-fluid">

                            <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar"
                                    aria-expanded="false" aria-label="Toggle navigation">
                                <span className="navbar-toggler-icon"></span>
                            </button>
                            <div className="offcanvas offcanvas-start" id="offcanvasNavbar" tabIndex="-1"
                                 aria-labelledby="offcanvasNavbarLabel">
                                <div className="offcanvas-header">
                                    <h5 className="offcanvas-title" id="offcanvasLabel">{t("header.menu")}</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="offcanvas"
                                            aria-label="Close"></button>
                                </div>
                                <div className="offcanvas-body ">
                                    <ul className="navbar-nav ">
                                        <li className="nav-item">
                                            <Link className="nav-link text-underlined" aria-current="page" to="/">{t("header.home")}</Link>
                                        </li>
                                        <li className="nav-item">
                                            <a className="nav-link text-underlined" href="#">{t("header.about")}</a>
                                        </li>
                                        {tags.map((tag) => (
                                          <TagMenuItem key={tag.id} tag={tag} />
                                        ))}
                                    </ul>
                                </div>


                            </div>
                        </div>
                    </nav>
                </div>

                <div className="col col-lg-2 d-flex align-items-center justify-content-center order-3 header_icons header_link">

                    <button type="button" className="btn header_search" data-bs-toggle="modal"
                            data-bs-target="#searchModal" title={t("header.search")}>
                        <i className="fa-solid fa-magnifying-glass fa-rotate-90 fa-xl  "></i>
                    </button>

                    <LanguageToggle isEn={isEn} onToggle={onToggleLanguage} />

                    {isAuthenticated && (
                        <Link to="/favorites" className="btn header_search header_favorites" title={t("header.favorites")}>
                            <i className="fa-solid fa-bookmark fa-xl"></i>
                            {favoritesCount > 0 && (
                                <span className="header_favorites_badge">{favoritesCount}</span>
                            )}
                        </Link>
                    )}

                    {isAuthenticated ? (
                        <div className="dropdown header_user">
                            <button
                                type="button"
                                className="btn header_search header_user_toggle dropdown-toggle"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                title={user?.email}
                            >
                                <span className="header_username">{user?.username}</span>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end header_user_menu">
                                <li>
                                    <Link className="dropdown-item" to="/profile">
                                        <i className="fa-solid fa-user me-2"></i>
                                        {t("header.profile")}
                                    </Link>
                                </li>
                                {isAdmin && (
                                    <li>
                                        <Link className="dropdown-item" to="/admin">
                                            <i className="fa-solid fa-gauge me-2"></i>
                                            {t("header.admin")}
                                        </Link>
                                    </li>
                                )}
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button type="button" className="dropdown-item" onClick={logout}>
                                        <i className="fa-solid fa-arrow-right-from-bracket me-2"></i>
                                        {t("header.logout")}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <button type="button" className="btn header_search" data-bs-toggle="modal"
                                data-bs-target="#loginModal" title={t("header.login")}>
                            <i className="fa-solid fa-key fa-xl"></i>
                        </button>
                    )}

                </div>
            </div>
        </div>
    </header>

    <AuthModal />
    <SearchModal />

    </>
  );
}
