import { useTranslation } from "react-i18next";
import Header from "./components/HeaderSection/HeaderSection";
import BodySection from "./components/BodySection/BodySection";
import Sitebar from "./components/SitebarSection/SitebarSection";
import Footer from "./components/FooterSection/FooterSection";

import { Routes, Route, useLocation } from "react-router-dom";
import ArticlePage from "./components/CardSection/ArticlePage";
import TagPage from "./components/TagPage/TagPage";
import AdminPage from "./components/AdminPage/AdminPage";
import FavoritesPage from "./components/FavoritesPage/FavoritesPage";
import VerifyEmailPage from "./components/VerifyEmailPage/VerifyEmailPage";
import ProfilePage from "./components/ProfilePage/ProfilePage";
import CookieBanner from "./components/CookieBanner/CookieBanner";
import EmailVerifyBanner from "./components/EmailVerifyBanner/EmailVerifyBanner";

function App() {
  // Админка — самостоятельная страница без сайдбара (там своя раскладка:
  // вкладки на всю ширину), поэтому у неё нет .layout/.layout_sidebar.
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Язык сайта — теперь настоящий i18next, а не локальная заглушка.
  // i18n.language уже учитывает куку (см. src/i18n/index.js: если куки нет —
  // язык "en" по умолчанию, это жёсткое требование). isEn здесь оставлен как
  // производное значение — им по-прежнему пользуются header--ru/footer--ru
  // для лёгкой красноватой подсветки на русской версии.
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const toggleLanguage = () => {
    i18n.changeLanguage(isEn ? "ru" : "en");
  };

  return (
    <div className="wrapper">
      <Header isEn={isEn} onToggleLanguage={toggleLanguage} />
      <EmailVerifyBanner />

      <main className="main">
        <div className="page-container">
          {isAdminRoute ? (
            <Routes>
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          ) : (
            <div className="layout">
              <Routes>
                <Route path="/" element={<BodySection />} />
                <Route path="/articles/:id" element={<ArticlePage />} />
                <Route path="/tags/:slug" element={<TagPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
              <Sitebar />
            </div>
          )}
        </div>
      </main>
      <Footer isEn={isEn} />

      <CookieBanner />
    </div>
  );
}

export default App;
