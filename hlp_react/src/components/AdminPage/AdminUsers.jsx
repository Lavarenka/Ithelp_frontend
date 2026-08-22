import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../api";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 20;

export default function AdminUsers() {
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
      window.alert("Нельзя снять права admin с самого себя.");
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
      window.alert("Нельзя заблокировать самого себя.");
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
      window.alert("Нельзя удалить самого себя.");
      return;
    }
    if (!window.confirm(`Удалить пользователя «${u.username}»? Это действие необратимо.`)) return;
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
      {isLoading && <p className="admin-section_state">Загрузка…</p>}
      {error && <p className="admin-section_state admin-section_state--error">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Регистрация</th>
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
                        {isSelf && <span className="admin-table_you"> (вы)</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "text-bg-dark" : "text-bg-secondary"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.is_active ? (
                          <span className="badge text-bg-success">активен</span>
                        ) : (
                          <span className="badge text-bg-danger">заблокирован</span>
                        )}
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString("ru-RU")}</td>
                      <td className="admin-table_actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark me-2"
                          disabled={isPending}
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === "admin" ? "Сделать user" : "Сделать admin"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning me-2"
                          disabled={isPending}
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? "Заблокировать" : "Разблокировать"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={isPending}
                          onClick={() => handleDelete(u)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-table_empty">
                      Пользователей пока нет.
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
              « Назад
            </button>
            <span>
              Страница {page + 1} из {totalPages} ({total} всего)
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-dark"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд »
            </button>
          </div>
        </>
      )}
    </div>
  );
}
