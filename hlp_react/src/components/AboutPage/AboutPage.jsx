import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../../api";
import "./AboutPage.css";

// Иконка для каждой рубрики верхнего уровня — подобраны по slug (см.
// backend_fastapi/seed.py: frontend/backend/deploy/engineering). Если когда-
// нибудь появится рубрика с другим slug — просто покажется дефолтная иконка,
// страница не сломается.
const TOPIC_ICONS = {
  frontend: "fa-solid fa-display",
  backend: "fa-solid fa-server",
  deploy: "fa-solid fa-cloud-arrow-up",
  engineering: "fa-solid fa-diagram-project",
};
const DEFAULT_TOPIC_ICON = "fa-solid fa-tag";

// Реальные фичи сайта — то, что уже работает (не выдумка/маркетинг), см.
// перечень в SearchModal/FavoritesContext/CommentSection/TagPage/ProfilePage.
const FEATURES = [
  { icon: "fa-magnifying-glass", key: "search" },
  { icon: "fa-bookmark", key: "favorites" },
  { icon: "fa-comments", key: "comments" },
  { icon: "fa-tags", key: "tags" },
  { icon: "fa-user", key: "profile" },
  { icon: "fa-language", key: "i18n" },
];

export default function AboutPage() {
  const { t } = useTranslation();
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchTopics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tags/`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setTopics(data);
      } catch {
        // Блок с темами необязателен для страницы — если бэкенд недоступен,
        // просто не показываем его (как и меню тегов в шапке, см. HeaderSection).
      }
    };

    fetchTopics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body about-page">
          <Link to="/" className="article_back mb-3 d-inline-block">
            {t("common.backToArticles")}
          </Link>

          {/* --- Hero --- */}
          <section className="about-hero">
            <h1 className="about-hero_title">{t("about.heroTitle")}</h1>
            <p className="about-hero_lead">{t("about.heroLead")}</p>
          </section>

          {/* --- История/описание --- */}
          <section className="about-section">
            <p className="about-text">{t("about.storyP1")}</p>
            <p className="about-text">{t("about.storyP2")}</p>
            <p className="about-text about-text--note">
              <i className="fa-solid fa-circle-info me-2" aria-hidden="true"></i>
              {t("about.wipNote")}
            </p>
          </section>

          {/* --- Возможности сайта --- */}
          <section className="about-section">
            <h2 className="about-section_title">{t("about.featuresTitle")}</h2>
            <div className="about-features">
              {FEATURES.map((f) => (
                <div className="about-feature" key={f.key}>
                  <i className={`fa-solid ${f.icon} about-feature_icon`} aria-hidden="true"></i>
                  <div>
                    <div className="about-feature_title">{t(`about.features.${f.key}.title`)}</div>
                    <div className="about-feature_text">{t(`about.features.${f.key}.text`)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* --- Темы блога (реальные теги из API) --- */}
          {topics.length > 0 && (
            <section className="about-section">
              <h2 className="about-section_title">{t("about.topicsTitle")}</h2>
              <div className="about-topics">
                {topics.map((topic) => (
                  <Link to={`/tags/${topic.slug}`} className="about-topic" key={topic.id}>
                    <i className={`${TOPIC_ICONS[topic.slug] ?? DEFAULT_TOPIC_ICON} about-topic_icon`} aria-hidden="true"></i>
                    <span className="about-topic_name">{topic.name}</span>
                    {topic.children?.length > 0 && (
                      <span className="about-topic_count">{topic.children.length}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* --- Контакты --- */}
          <section className="about-section">
            <h2 className="about-section_title">{t("about.contactTitle")}</h2>
            <p className="about-text">
              <i className="fa-solid fa-clock me-2" aria-hidden="true"></i>
              {t("about.contactSoon")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
