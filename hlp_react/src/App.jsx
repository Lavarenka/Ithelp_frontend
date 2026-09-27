import { useRef, useState } from "react";
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
import AboutPage from "./components/AboutPage/AboutPage";
import OAuthCallbackPage from "./components/OAuthCallbackPage/OAuthCallbackPage";
import CookieBanner from "./components/CookieBanner/CookieBanner";
import EmailVerifyBanner from "./components/EmailVerifyBanner/EmailVerifyBanner";
import { waitForPendingRequests } from "./api";

// Должно совпадать с длительностью transition: opacity в index.css
// (.wrapper--lang-fading) — сначала ждём, пока текст погаснет, потом меняем язык.
const LANG_FADE_MS = 200;
// Сколько максимум держать текст погашенным, дожидаясь ответов бэкенда на
// новом языке. Если сервер медленный, лучше показать страницу как есть,
// чем держать её пустой.
const LANG_MAX_WAIT_MS = 1500;
// Пауза на перерисовку React: до ожидания запросов — чтобы компоненты
// успели их отправить, после — чтобы успели показать полученные данные.
const LANG_RENDER_DELAY_MS = 50;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Плавная смена языка. Сам текст CSS-переходом не анимируется (строка
  // просто подменяется), поэтому делаем так: текст плавно гаснет →
  // в этот момент меняем язык → текст плавно проявляется уже на новом.
  // pendingLang — язык, на который переключаемся: переключатель RU/EN и
  // цвет шапки/подвала реагируют на него СРАЗУ по клику (их плавный
  // transition идёт параллельно с затуханием текста), а i18n.language
  // меняется только когда текст уже погас.
  const [pendingLang, setPendingLang] = useState(null);
  const [isLangFading, setIsLangFading] = useState(false);
  // Номер текущего переключения — если пользователь кликнул ещё раз, пока
  // предыдущее переключение не закончилось, старое просто прекращается и
  // не трогает состояние (не проявит текст раньше времени и т.п.).
  const langSwitchRef = useRef(0);
  const isEn = (pendingLang ?? i18n.language) === "en";

  const toggleLanguage = async () => {
    const next = isEn ? "ru" : "en";
    const switchId = ++langSwitchRef.current;
    const isCurrent = () => switchId === langSwitchRef.current;

    // Пользователям с "уменьшить анимацию" в системе — мгновенно, как раньше.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPendingLang(null);
      setIsLangFading(false);
      i18n.changeLanguage(next);
      return;
    }

    setPendingLang(next);
    setIsLangFading(true);

    await delay(LANG_FADE_MS);
    if (!isCurrent()) return;
    await i18n.changeLanguage(next);
    if (!isCurrent()) return;
    setPendingLang(null);

    // Статьи, теги в меню, популярное в сайдбаре перезапрашиваются на новом
    // языке — проявляем текст, только когда они пришли, иначе он проявился
    // бы на старом языке и резко сменился.
    await delay(LANG_RENDER_DELAY_MS);
    if (!isCurrent()) return;
    await waitForPendingRequests(LANG_MAX_WAIT_MS);
    // Ответ пришёл, но компонентам ещё нужно разобрать JSON и
    // перерисоваться — даём им на это ещё мгновение.
    await delay(LANG_RENDER_DELAY_MS);
    if (!isCurrent()) return;
    setIsLangFading(false);
  };

  return (
    <div className={`wrapper ${isLangFading ? "wrapper--lang-fading" : ""}`}>
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
                <Route path="/about" element={<AboutPage />} />
                <Route path="/auth/callback" element={<OAuthCallbackPage />} />
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
