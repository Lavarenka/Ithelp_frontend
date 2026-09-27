import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import { API_BASE_URL } from "../api";

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "it_hlp_token";

// Достаём читаемое сообщение об ошибке из ответа FastAPI. detail обычно
// строка, но /auth/login и /auth/register иногда отдают структурированный
// {"detail": {"code": "...", "detail": "..."}} (см. app/routers/auth.py на
// бэкенде) — тогда возвращаем и текст, и code, чтобы вызывающий код (капча)
// мог на него отреагировать, а не просто показать сообщение.
async function extractErrorMessage(response, fallback) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return { message: data.detail, code: null };
    if (data.detail && typeof data.detail === "object") {
      return {
        message: typeof data.detail.detail === "string" ? data.detail.detail : fallback,
        code: typeof data.detail.code === "string" ? data.detail.code : null,
      };
    }
  } catch {
    // тело не JSON — используем запасной текст
  }
  return { message: fallback, code: null };
}

function authError(message, code) {
  const err = new Error(message);
  if (code) err.code = code;
  return err;
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

  // Вход по уже готовому токену — после возврата с Google/GitHub (см.
  // OAuthCallbackPage). Профиль подтянет эффект ниже, который следит за token.
  const loginWithToken = useCallback((accessToken) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    setToken(accessToken);
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
    async (usernameOrEmail, password, captchaToken) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username_or_email: usernameOrEmail,
          password,
          captcha_token: captchaToken ?? null,
        }),
      });
      if (!response.ok) {
        const { message, code } = await extractErrorMessage(response, i18n.t("auth.loginFailed"));
        throw authError(message, code);
      }
      const data = await response.json();
      applySession(data.access_token, data.user);
      return data.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (username, email, password, passwordConfirm, captchaToken) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          password_confirm: passwordConfirm,
          captcha_token: captchaToken ?? null,
        }),
      });
      if (!response.ok) {
        const { message, code } = await extractErrorMessage(response, i18n.t("auth.registerFailed"));
        throw authError(message, code);
      }
      const data = await response.json();
      applySession(data.access_token, data.user);
      return data.user;
    },
    [applySession]
  );

  // Перечитывает /auth/me — используется после подтверждения email на
  // странице /verify-email, чтобы баннер "подтвердите почту" пропал сразу,
  // без выхода/входа заново (токен тот же, меняется только email_verified).
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setUser(data);
    } catch {
      // тихо игнорируем — баннер просто останется до следующего обновления страницы
    }
  }, [token]);

  const resendVerification = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const { message, code } = await extractErrorMessage(response, i18n.t("auth.genericError"));
      throw authError(message, code);
    }
    return response.json();
  }, [token]);

  // Обновление профиля (страница "Профиль") — смена username и/или аватарки.
  // payload может содержать username, avatar (data-URI) и/или clear_avatar —
  // см. UserProfileUpdate на бэкенде (app/schemas/user.py). Обновляет user
  // в контексте сразу из ответа, без отдельного refreshUser().
  const updateProfile = useCallback(
    async (payload) => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const { message, code } = await extractErrorMessage(response, i18n.t("auth.genericError"));
        throw authError(message, code);
      }
      const data = await response.json();
      setUser(data);
      return data;
    },
    [token]
  );

  // Смена (или первичная установка — для OAuth-only пользователей) пароля,
  // страница "Профиль". currentPassword может быть null/undefined — бэкенд
  // сам решает, обязателен ли он (see UserOut.has_password / PATCH
  // /auth/me/password на бэкенде). Не трогает user в контексте — пароль не
  // входит в UserOut целиком (только has_password), а он тут не меняется.
  const changePassword = useCallback(
    async (currentPassword, newPassword, newPasswordConfirm) => {
      const response = await fetch(`${API_BASE_URL}/auth/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword || null,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        }),
      });
      if (!response.ok) {
        const { message, code } = await extractErrorMessage(response, i18n.t("auth.genericError"));
        throw authError(message, code);
      }
      return response.json();
    },
    [token]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      isLoading,
      login,
      loginWithToken,
      register,
      logout,
      refreshUser,
      resendVerification,
      updateProfile,
      changePassword,
    }),
    [
      token,
      user,
      isLoading,
      login,
      loginWithToken,
      register,
      logout,
      refreshUser,
      resendVerification,
      updateProfile,
      changePassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри <AuthProvider>");
  return ctx;
}
