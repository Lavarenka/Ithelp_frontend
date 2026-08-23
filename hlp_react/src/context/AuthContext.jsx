import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import { API_BASE_URL } from "../api";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "it_hlp_token";

// Достаём читаемое сообщение об ошибке из ответа FastAPI (обычно {"detail": "..."}).
async function extractErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
  } catch {
    // тело не JSON — используем запасной текст
  }
  return fallback;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  // Пока не проверили токен (или его нет) — не знаем, залогинен ли пользователь.
  // Нужно, чтобы не мигать иконкой "войти" на долю секунды при перезагрузке страницы.
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const applySession = useCallback((accessToken, userData) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // При старте (или если токен уже лежал в localStorage) — подтягиваем профиль,
  // чтобы проверить, что токен ещё валиден, и получить актуальные данные пользователя.
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error("invalid token");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Синхронизация между вкладками: localStorage общий для всех вкладок одного
  // домена, но событие "storage" срабатывает только в ДРУГИХ вкладках, не в
  // той, где произошло изменение (это ограничение самого браузера). Поэтому
  // если вкладка А была открыта ДО входа во вкладке Б, вкладка А сама по себе
  // не узнает о новом токене — без этого слушателя. Событие приходит и на
  // логин (newValue = токен), и на логаут в другой вкладке (newValue = null).
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== TOKEN_STORAGE_KEY) return;
      setToken(event.newValue);
      if (!event.newValue) setUser(null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = useCallback(
    async (usernameOrEmail, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, i18n.t("auth.loginFailed")));
      }
      const data = await response.json();
      applySession(data.access_token, data.user);
      return data.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (username, email, password) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, i18n.t("auth.registerFailed")));
      }
      const data = await response.json();
      applySession(data.access_token, data.user);
      return data.user;
    },
    [applySession]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      isLoading,
      login,
      register,
      logout,
    }),
    [token, user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}
