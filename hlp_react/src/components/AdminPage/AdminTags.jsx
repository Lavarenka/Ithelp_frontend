import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../../api";

const EMPTY_FORM = { name: "", slug: "", parent_id: "" };

// Плоское представление дерева тегов с отступом — удобно для селекта "родитель"
// и для таблицы, где сразу видна иерархия.
function flattenTree(tree, depth = 0) {
  const result = [];
  for (const tag of tree) {
    result.push({ ...tag, depth });
    if (tag.children && tag.children.length > 0) {
      result.push(...flattenTree(tag.children, depth + 1));
    }
  }
  return result;
}

export default function AdminTags() {
  const { t } = useTranslation();
  const [tree, setTree] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null); // null скрыт, "new" создание, число — id тега
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const flatTags = flattenTree(tree);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/tags/");
      setTree(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const startCreate = () => {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setForm({
      name: tag.name,
      slug: tag.slug,
      parent_id: tag.parent_id != null ? String(tag.parent_id) : "",
    });
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        parent_id: form.parent_id === "" ? null : Number(form.parent_id),
      };
      if (editingId === "new") {
        await apiRequest("/tags/", { method: "POST", body: payload });
      } else {
        await apiRequest(`/tags/${editingId}`, { method: "PUT", body: payload });
      }
      cancelEdit();
      await loadTags();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tag) => {
    const hasChildren = tag.children && tag.children.length > 0;
    const warning = hasChildren
      ? t("admin.tags.confirmDeleteWithChildren", { name: tag.name })
      : t("admin.tags.confirmDelete", { name: tag.name });
    if (!window.confirm(warning)) return;
    try {
      await apiRequest(`/tags/${tag.id}`, { method: "DELETE" });
      await loadTags();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section_toolbar">
        <div />
        <button type="button" className="btn btn-dark" onClick={startCreate}>
          <i className="fa-solid fa-plus me-2"></i>
          {t("admin.tags.newTag")}
        </button>
      </div>

      {editingId !== null && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{editingId === "new" ? t("admin.tags.formTitleNew") : t("admin.tags.formTitleEdit")}</h3>

          <div className="mb-3">
            <label className="form-label">{t("admin.tags.fieldName")}</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={100}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">{t("admin.tags.fieldSlug")}</label>
            <input
              type="text"
              className="form-control"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              required
              maxLength={120}
              pattern="[a-z0-9\-]+"
              title={t("admin.tags.slugPatternTitle")}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">{t("admin.tags.fieldParent")}</label>
            <select
              className="form-select"
              value={form.parent_id}
              onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
            >
              <option value="">{t("admin.tags.noParentOption")}</option>
              {flatTags
                .filter((t) => (editingId === "new" ? true : t.id !== editingId))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {"— ".repeat(t.depth)}
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

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
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.tags.tableName")}</th>
                <th>{t("admin.tags.tableSlug")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {flatTags.map((tag) => (
                <tr key={tag.id}>
                  <td style={{ paddingLeft: `${12 + tag.depth * 24}px` }}>
                    {tag.depth > 0 && <span className="admin-table_tree-marker">└ </span>}
                    {tag.name}
                  </td>
                  <td className="admin-table_slug">{tag.slug}</td>
                  <td className="admin-table_actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-dark me-2"
                      onClick={() => startEdit(tag)}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(tag)}
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
              {flatTags.length === 0 && (
                <tr>
                  <td colSpan={3} className="admin-table_empty">
                    {t("admin.tags.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
