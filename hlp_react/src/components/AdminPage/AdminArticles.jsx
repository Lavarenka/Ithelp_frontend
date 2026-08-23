import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../../api";

const PAGE_SIZE = 10;

const EMPTY_FORM = { title: "", content: "", tag_ids: [] };

export default function AdminArticles() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [allTags, setAllTags] = useState([]); // плоский список тегов для мультивыбора в форме
  const [editingId, setEditingId] = useState(null); // null = форма скрыта, "new" = создание
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      const data = await apiRequest(`/articles/?${params.toString()}`);
      setArticles(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Плоский список тегов для чекбоксов в форме — дерево превращаем в плоский
  // список "Родитель / Подтег", чтобы было видно вложенность без рекурсивного UI.
  useEffect(() => {
    let cancelled = false;
    const loadTags = async () => {
      try {
        const tree = await apiRequest("/tags/");
        const flat = [];
        for (const root of tree) {
          flat.push({ id: root.id, label: root.name });
          for (const child of root.children || []) {
            flat.push({ id: child.id, label: `${root.name} / ${child.name}` });
          }
        }
        if (!cancelled) setAllTags(flat);
      } catch {
        // список тегов для формы необязателен — просто не будет мультивыбора
      }
    };
    loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const startCreate = () => {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const startEdit = (article) => {
    setEditingId(article.id);
    setForm({
      title: article.title,
      content: article.content,
      tag_ids: (article.tags || []).map((t) => t.id),
    });
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const toggleTag = (tagId) => {
    setForm((f) => ({
      ...f,
      tag_ids: f.tag_ids.includes(tagId)
        ? f.tag_ids.filter((id) => id !== tagId)
        : [...f.tag_ids, tagId],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      if (editingId === "new") {
        await apiRequest("/articles/", {
          method: "POST",
          body: { title: form.title, content: form.content, tag_ids: form.tag_ids },
        });
      } else {
        await apiRequest(`/articles/${editingId}`, {
          method: "PUT",
          body: { title: form.title, content: form.content, tag_ids: form.tag_ids },
        });
      }
      cancelEdit();
      await loadArticles();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(t("admin.articles.confirmDelete", { title: article.title }))) return;
    try {
      await apiRequest(`/articles/${article.id}`, { method: "DELETE" });
      await loadArticles();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section_toolbar">
        <form className="admin-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="form-control"
            placeholder={t("admin.articles.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-outline-dark">
            {t("admin.articles.searchButton")}
          </button>
        </form>
        <button type="button" className="btn btn-dark" onClick={startCreate}>
          <i className="fa-solid fa-plus me-2"></i>
          {t("admin.articles.newArticle")}
        </button>
      </div>

      {editingId !== null && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{editingId === "new" ? t("admin.articles.formTitleNew") : t("admin.articles.formTitleEdit")}</h3>

          <div className="mb-3">
            <label className="form-label">{t("admin.articles.fieldTitle")}</label>
            <input
              type="text"
              className="form-control"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              maxLength={200}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">{t("admin.articles.fieldContent")}</label>
            <textarea
              className="form-control"
              rows={6}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              required
            />
          </div>

          {allTags.length > 0 && (
            <div className="mb-3">
              <label className="form-label">{t("admin.articles.fieldTags")}</label>
              <div className="admin-form_tags">
                {allTags.map((tag) => (
                  <label key={tag.id} className="admin-form_tag-checkbox">
                    <input
                      type="checkbox"
                      checked={form.tag_ids.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                    />
                    {tag.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {formError && <p className="admin-form_error">{formError}</p>}

          <div className="admin-form_actions">
            <button type="submit" className="btn btn-dark" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("common.save")}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="admin-section_state">{t("common.loading")}</p>}
      {error && <p className="admin-section_state admin-section_state--error">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.articles.tableId")}</th>
                  <th>{t("admin.articles.tableTitle")}</th>
                  <th>{t("admin.articles.tableAuthor")}</th>
                  <th>{t("admin.articles.tableTags")}</th>
                  <th>{t("admin.articles.tableViews")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td>{article.id}</td>
                    <td className="admin-table_title">{article.title}</td>
                    <td>{article.author?.username ?? "—"}</td>
                    <td>
                      {(article.tags || []).map((t) => (
                        <span key={t.id} className="badge text-bg-secondary me-1">
                          {t.name}
                        </span>
                      ))}
                    </td>
                    <td>{article.views}</td>
                    <td className="admin-table_actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark me-2"
                        onClick={() => startEdit(article)}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(article)}
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
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
