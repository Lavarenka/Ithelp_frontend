import i18n from "./i18n";

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

// Добавляет ?lang=/&lang= с текущим языком интерфейса (i18n.language) к пути
// запроса — бэкенд использует его, чтобы отдавать статьи/теги на нужном
// языке (см. routers/articles.py, routers/tags.py: параметр lang с запасным
// вариантом на RU, если перевода ещё нет). Используется и в apiRequest ниже,
// и в местах, где идёт обычный fetch() напрямую (см. компоненты, которые
// импортируют её из api.js — HeaderSection, ArticlePage, TagPage и т.д.).
export function withLang(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${encodeURIComponent(i18n.language)}`;
}

// --- Отслеживание запросов к API (для плавной смены языка) ---
// При переключении RU/EN App.jsx гасит текст, меняет язык и проявляет его
// обратно только когда компоненты успели перезапросить статьи/теги на новом
// языке (см. waitForPendingRequests ниже и toggleLanguage в App.jsx). Для
// этого все запросы к API идут через apiFetch/apiRequest, которые ведут
// счётчик "запросов в полёте".
let pendingRequests = 0;
const idleWaiters = new Set();

function trackRequest(promise) {
  pendingRequests += 1;
  return promise.finally(() => {
    pendingRequests -= 1;
    if (pendingRequests === 0) {
      idleWaiters.forEach((resolve) => resolve());
      idleWaiters.clear();
    }
  });
}

/**
 * Ждёт, пока не останется незавершённых запросов к API, но не дольше maxMs —
 * медленный или зависший запрос не должен оставить страницу погасшей.
 */
export function waitForPendingRequests(maxMs) {
  return new Promise((resolve) => {
    if (pendingRequests === 0) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      idleWaiters.delete(finish);
      resolve();
    };
    const timer = setTimeout(finish, maxMs);
    idleWaiters.add(finish);
  });
}

/**
 * Обычный fetch к API с ?lang= (см. withLang) и учётом в счётчике запросов.
 * Для мест, которым не нужен токен и разбор ошибок из apiRequest —
 * компоненты сами проверяют response.ok.
 */
export function apiFetch(path, init) {
  return trackRequest(fetch(`${API_BASE_URL}${withLang(path)}`, init));
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

  const response = await apiFetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    throw new Error(
      await extractErrorMessage(response, i18n.t("common.requestError", { status: response.status }))
    );
  }

  if (response.status === 204) return null;
  return response.json();
}
