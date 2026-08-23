import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../../api";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingId, setPendingId] = useState(null); // id пользователя, у которого сейчас крутится действие

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      const data = await apiRequest(`/users/?${params.toString()}`);
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleRole = async (u) => {
    const nextRole = u.role === "admin" ? "user" : "admin";
    const isSelf = u.id === currentUser.id;
    if (isSelf && nextRole !== "admin") {
      window.alert(t("admin.users.alertCannotDemoteSelf"));
      return;
    }
    setPendingId(u.id);
    setError(null);
    try {
      await apiRequest(`/users/${u.id}/role`, { method: "PUT", body: { role: nextRole } });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  };

  const toggleActive = async (u) => {
    const isSelf = u.id === currentUser.id;
    if (isSelf && u.is_active) {
      window.alert(t("admin.users.alertCannotBlockSelf"));
      return;
    }
    setPendingId(u.id);
    setError(null);
    try {
      await apiRequest(`/users/${u.id}/active`, {
        method: "PUT",
        body: { is_active: !u.is_active },
      });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (u) => {
    if (u.id === currentUser.id) {
      window.alert(t("admin.users.alertCannotDeleteSelf"));
      return;
    }
    if (!window.confirm(t("admin.users.confirmDelete", { username: u.username }))) return;
    setPendingId(u.id);
    setError(null);
    try {
      await apiRequest(`/users/${u.id}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="admin-section">
      {isLoading && <p className="admin-section_state">{t("common.loading")}</p>}
      {error && <p className="admin-section_state admin-section_state--error">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.users.tableId")}</th>
                  <th>{t("admin.users.tableUsername")}</th>
                  <th>{t("admin.users.tableEmail")}</th>
                  <th>{t("admin.users.tableRole")}</th>
                  <th>{t("admin.users.tableStatus")}</th>
                  <th>{t("admin.users.tableRegistered")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const isPending = pendingId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>
                        {u.username}
                        {isSelf && <span className="admin-table_you">{t("admin.users.you")}</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "text-bg-dark" : "text-bg-secondary"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.is_active ? (
                          <span className="badge text-bg-success">{t("admin.users.statusActive")}</span>
                        ) : (
                          <span className="badge text-bg-danger">{t("admin.users.statusBlocked")}</span>
                        )}
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString(i18n.language === "en" ? "en-US" : "ru-RU")}</td>
                      <td className="admin-table_actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark me-2"
                          disabled={isPending}
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === "admin" ? t("admin.users.makeUser") : t("admin.users.makeAdmin")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning me-2"
                          disabled={isPending}
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? t("admin.users.block") : t("admin.users.unblock")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={isPending}
                          onClick={() => handleDelete(u)}
                        >
                          {t("common.delete")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-table_empty">
                      {t("admin.users.empty")}
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
