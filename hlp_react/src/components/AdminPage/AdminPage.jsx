import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import AdminArticles from "./AdminArticles";
import AdminTags from "./AdminTags";
import AdminUsers from "./AdminUsers";
import AdminComments from "./AdminComments";
import "./AdminPage.css";

function useTabs(t) {
  return [
    { key: "articles", label: t("admin.tabs.articles"), icon: "fa-newspaper" },
    { key: "tags", label: t("admin.tabs.tags"), icon: "fa-tags" },
    { key: "users", label: t("admin.tabs.users"), icon: "fa-users" },
    { key: "comments", label: t("admin.tabs.comments"), icon: "fa-comments" },
  ];
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("articles");
  const TABS = useTabs(t);

  // Пока не выяснили, залогинен ли пользователь (проверка токена ещё идёт) —
  // показываем нейтральную заглушку, чтобы не мигнуть "доступ запрещён" зря.
  if (isLoading) {
    return (
      <div className="admin-page">
        <p className="admin-page_state">{t("admin.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-page_denied">
          <h1>{t("admin.deniedTitle")}</h1>
          <p>{t("admin.deniedText")}</p>
          <Link to="/" className="admin-page_denied-link">
            {t("admin.backToSite")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page_header">
        <h1>{t("admin.title")}</h1>
        <p className="admin-page_subtitle">
          {t("admin.loggedInAsPrefix")} <strong>{user.username}</strong> {t("admin.loggedInAsSuffix")}
        </p>
        <Link to="/" className="admin-page_back">
          {t("admin.backToSite")}
        </Link>
      </div>

      <div className="admin-page_tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-page_tab ${activeTab === tab.key ? "admin-page_tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={`fa-solid ${tab.icon} me-2`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-page_content">
        {activeTab === "articles" && <AdminArticles />}
        {activeTab === "tags" && <AdminTags />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "comments" && <AdminComments />}
      </div>
    </div>
  );
}
