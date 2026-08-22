// Базовый адрес бэкенда. При необходимости можно вынести в .env (VITE_API_URL).
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "it_hlp_token";

async function extractErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
  } catch {
    // тело не JSON — используем запасной текст
  }
  return fallback;
}

/**
 * Авторизованный запрос к API — подставляет токен из localStorage и
 * бросает Error с читаемым текстом (из FastAPI {"detail": "..."}) при
 * неуспешном ответе. Для админки, где почти все запросы требуют admin-токен.
 */
export async function apiRequest(path, { method = "GET", body, ...rest } = {}) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const headers = { ...(rest.headers || {}) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Ошибка запроса: ${response.status}`));
  }

  if (response.status === 204) return null;
  return response.json();
}
