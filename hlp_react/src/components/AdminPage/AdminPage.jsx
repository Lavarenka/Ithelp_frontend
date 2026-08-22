import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminArticles from "./AdminArticles";
import AdminTags from "./AdminTags";
import AdminUsers from "./AdminUsers";
import "./AdminPage.css";

const TABS = [
  { key: "articles", label: "Статьи", icon: "fa-newspaper" },
  { key: "tags", label: "Теги", icon: "fa-tags" },
  { key: "users", label: "Пользователи", icon: "fa-users" },
];

export default function AdminPage() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("articles");

  // Пока не выяснили, залогинен ли пользователь (проверка токена ещё идёт) —
  // показываем нейтральную заглушку, чтобы не мигнуть "доступ запрещён" зря.
  if (isLoading) {
    return (
      <div className="admin-page">
        <p className="admin-page_state">Загрузка…</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-page_denied">
          <h1>Доступ запрещён</h1>
          <p>Эта страница доступна только администраторам.</p>
          <Link to="/" className="admin-page_denied-link">
            « Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page_header">
        <h1>Админка</h1>
        <p className="admin-page_subtitle">
          Вы вошли как <strong>{user.username}</strong> (admin)
        </p>
        <Link to="/" className="admin-page_back">
          « Вернуться на сайт
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
      </div>
    </div>
  );
}
