import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../../api";

const PAGE_SIZE = 20;
// Пока нет WebSocket/SSE — опрашиваем сервер раз в 10с, чтобы новый
// комментарий пользователя появился в админке без ручного обновления.
const POLL_INTERVAL = 10000;

function useStatusFilters(t) {
  return [
    { key: "pending", label: t("admin.comments.filterPending") },
    { key: "approved", label: t("admin.comments.filterApproved") },
    { key: "rejected", label: t("admin.comments.filterRejected") },
    { key: "", label: t("admin.comments.filterAll") },
  ];
}

function useStatusLabels(t) {
  return {
    pending: t("admin.comments.statusPending"),
    approved: t("admin.comments.statusApproved"),
    rejected: t("admin.comments.statusRejected"),
  };
}

function formatDate(iso, locale) {
  return new Date(iso).toLocaleString(locale === "en" ? "en-US" : "ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminComments() {
  const { t, i18n } = useTranslation();
  const STATUS_FILTERS = useStatusFilters(t);
  const STATUS_LABELS = useStatusLabels(t);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());

  // Нужен внутри интервала, чтобы не пересоздавать таймер и в то же время
  // видеть актуальный набор "занятых" строк (busyIds меняется чаще, чем
  // хотелось бы держать в зависимостях setInterval).
  const busyIdsRef = useRef(busyIds);
  useEffect(() => {
    busyIdsRef.current = busyIds;
  }, [busyIds]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // При фоновом опросе (silent=true) не показываем спиннер и не затираем
  // уже отрисованную таблицу ошибкой — только тихо подменяем данные.
  const loadComments = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      if (!silent) setError(null);
      try {
        const params = new URLSearchParams({
          skip: String(page * PAGE_SIZE),
          limit: String(PAGE_SIZE),
        });
        if (statusFilter) params.set("status", statusFilter);
        const data = await apiRequest(`/comments?${params.toString()}`);
        setComments(data.items);
        setTotal(data.total);
        if (silent) setError(null);
      } catch (err) {
        if (!silent) setError(err.message);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [statusFilter, page]
  );

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Фоновое обновление: подхватывает новые комментарии пользователей, пока
  // админ держит вкладку открытой. Пропускаем тик, если админ прямо сейчас
  // модерирует/удаляет строку — чтобы список не переехал у него под курсором.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && busyIdsRef.current.size === 0) {
        loadComments({ silent: true });
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadComments]);

  const handleFilterChange = (key) => {
    setStatusFilter(key);
    setPage(0);
  };

  const setBusy = (id, busy) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleModerate = async (comment, status) => {
    setBusy(comment.id, true);
    try {
      await apiRequest(`/comments/${comment.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await loadComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(comment.id, false);
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm(t("admin.comments.confirmDelete", { username: comment.author.username }))) return;
    setBusy(comment.id, true);
    try {
      await apiRequest(`/comments/${comment.id}`, { method: "DELETE" });
      await loadComments();
    } catch (err) {
      setError(err.message);
      setBusy(comment.id, false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section_toolbar">
        <div className="admin-comments_filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              type="button"
              className={`btn btn-sm ${statusFilter === f.key ? "btn-dark" : "btn-outline-dark"}`}
              onClick={() => handleFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="admin-section_state">{t("common.loading")}</p>}
      {error && <p className="admin-section_state admin-section_state--error">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.comments.tableArticle")}</th>
                  <th>{t("admin.comments.tableAuthor")}</th>
                  <th>{t("admin.comments.tableText")}</th>
                  <th>{t("admin.comments.tableDate")}</th>
                  <th>{t("admin.comments.tableStatus")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr
                    key={comment.id}
                    className={comment.status === "pending" ? "admin-table_row--pending" : ""}
                  >
                    <td className="admin-table_title">{comment.article.title}</td>
                    <td>{comment.author.username}</td>
                    <td className="admin-comments_text">{comment.text}</td>
                    <td>{formatDate(comment.created_at, i18n.language)}</td>
                    <td>
                      <span className={`admin-comments_status admin-comments_status--${comment.status}`}>
                        {STATUS_LABELS[comment.status] ?? comment.status}
                      </span>
                    </td>
                    <td className="admin-table_actions">
                      {comment.status !== "approved" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success me-2"
                          disabled={busyIds.has(comment.id)}
                          onClick={() => handleModerate(comment, "approved")}
                        >
                          {t("admin.comments.approve")}
                        </button>
                      )}
                      {comment.status !== "rejected" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-2"
                          disabled={busyIds.has(comment.id)}
                          onClick={() => handleModerate(comment, "rejected")}
                        >
                          {t("admin.comments.reject")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={busyIds.has(comment.id)}
                        onClick={() => handleDelete(comment)}
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
                {comments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-table_empty">
                      {t("common.notFound")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t("pagination.prev")}
            </button>
            <span>
              {t("pagination.pageOfTotal", { page: page + 1, totalPages, total })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("pagination.next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
