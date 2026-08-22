import Header from "./components/HeaderSection/HeaderSection";
import BodySection from "./components/BodySection/BodySection";
import Sitebar from "./components/SitebarSection/SitebarSection";
import Footer from "./components/FooterSection/FooterSection";

import { Routes, Route, useLocation } from "react-router-dom";
import ArticlePage from "./components/CardSection/ArticlePage";
import TagPage from "./components/TagPage/TagPage";
import AdminPage from "./components/AdminPage/AdminPage";
import FavoritesPage from "./components/FavoritesPage/FavoritesPage";
import CookieBanner from "./components/CookieBanner/CookieBanner";

function App() {
  // Админка — самостоятельная страница без сайдбара (там своя раскладка:
  // вкладки на всю ширину), поэтому у неё нет .layout/.layout_sidebar.
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="wrapper">
      <Header />

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
              </Routes>
              <Sitebar />
            </div>
          )}
        </div>
      </main>
      <Footer />

      <CookieBanner />
    </div>
  );
}

export default App;
