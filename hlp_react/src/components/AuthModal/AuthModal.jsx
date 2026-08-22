import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./AuthModal.css";

// Модалка авторизации/регистрации на кнопке-ключике в шапке (см. HeaderSection.jsx,
// data-bs-target="#loginModal"). Переключение между режимами — без перезагрузки
// модалки, просто меняем локальный state.
export default function AuthModal() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setError(null);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
  };

  const closeModal = () => {
    // Bootstrap-модалка закрывается либо кликом по data-bs-dismiss, либо через JS API.
    // Программно кликаем по скрытой кнопке закрытия — не требует импорта bootstrap.js API.
    const modalEl = document.getElementById("loginModal");
    if (!modalEl) return;
    const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
    closeBtn?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      resetForm();
      closeModal();
    } catch (err) {
      setError(err.message || "Что-то пошло не так");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content auth-modal">
          <div className="modal-header">
            <h5 className="modal-title" id="loginModalLabel">
              {mode === "login" ? "Вход" : "Регистрация"}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="auth-username">
                  {mode === "login" ? "Логин или email" : "Логин"}
                </label>
                <input
                  id="auth-username"
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={mode === "register" ? 3 : undefined}
                  autoComplete={mode === "login" ? "username" : "off"}
                />
              </div>

              {mode === "register" && (
                <div className="mb-3">
                  <label className="form-label" htmlFor="auth-email">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label" htmlFor="auth-password">
                  Пароль
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              {error && <p className="auth-modal_error mb-3">{error}</p>}

              <button type="submit" className="btn btn-dark w-100" disabled={isSubmitting}>
                {isSubmitting ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
              </button>
            </form>

            <p className="auth-modal_switch mb-0">
              {mode === "login" ? (
                <>
                  Нет аккаунта?{" "}
                  <button type="button" className="auth-modal_switch-btn" onClick={() => switchMode("register")}>
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{" "}
                  <button type="button" className="auth-modal_switch-btn" onClick={() => switchMode("login")}>
                    Войти
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
