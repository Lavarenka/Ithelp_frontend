import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import ReCaptcha from "../ReCaptcha/ReCaptcha";
import "./AuthModal.css";

// Модалка авторизации/регистрации на кнопке-ключике в шапке (см. HeaderSection.jsx,
// data-bs-target="#loginModal"). Переключение между режимами — без перезагрузки
// модалки, просто меняем локальный state.
export default function AuthModal() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // На регистрации капча обязательна всегда. На логине она изначально
  // скрыта и появляется только после того, как бэкенд ответит
  // code === "captcha_required" (после нескольких неудачных попыток подряд
  // для этого же логина — см. app/login_attempts.py).
  // Капча — Google reCAPTCHA v2 (см. components/ReCaptcha). captchaToken —
  // одноразовый токен от Google после галочки «Я не робот»; проверяет его
  // бэкенд (backend_fastapi/app/captcha.py).
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [loginNeedsCaptcha, setLoginNeedsCaptcha] = useState(false);

  const passwordsMismatch =
    mode === "register" && passwordConfirm.length > 0 && password !== passwordConfirm;

  const captchaRequiredNow = mode === "register" || loginNeedsCaptcha;
  const captchaSatisfied = !captchaRequiredNow || Boolean(captchaToken);

  // Токен одноразовый: если форма ушла с ним на бэкенд, но вход/регистрация
  // не удались, повторно его использовать нельзя — сбрасываем галочку.
  const resetCaptcha = () => {
    recaptchaRef.current?.reset();
    setCaptchaToken(null);
  };

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setError(null);
    setLoginNeedsCaptcha(false);
    resetCaptcha();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
    setPasswordConfirm("");
    setLoginNeedsCaptcha(false);
    resetCaptcha();
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

    if (mode === "register" && password !== passwordConfirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (captchaRequiredNow && !captchaSatisfied) {
      setError(t("auth.captchaRequired"));
      return;
    }

    // Объявлен до try — он нужен и в catch (сбросить использованный токен).
    const captchaPayload = captchaRequiredNow ? captchaToken : null;
    setIsSubmitting(true);
    try {

      if (mode === "login") {
        await login(username, password, captchaPayload);
      } else {
        await register(username, email, password, passwordConfirm, captchaPayload);
      }
      resetForm();
      closeModal();
    } catch (err) {
      if (captchaPayload) resetCaptcha();
      if (err.code === "captcha_required") {
        // Бэкенд только что решил, что для этого логина пора требовать
        // капчу — показываем её и просим пользователя попробовать снова,
        // не считая это "неверным логином/паролем".
        setLoginNeedsCaptcha(true);
        setError(t("auth.captchaNowRequired"));
      } else {
        setError(err.message || t("auth.genericError"));
      }
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
              {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
            </h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="auth-username">
                  {mode === "login" ? t("auth.usernameOrEmail") : t("auth.username")}
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
                    {t("auth.email")}
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
                  {t("auth.password")}
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

              {mode === "register" && (
                <div className="mb-3">
                  <label className="form-label" htmlFor="auth-password-confirm">
                    {t("auth.passwordConfirm")}
                  </label>
                  <input
                    id="auth-password-confirm"
                    type="password"
                    className={`form-control ${passwordsMismatch ? "is-invalid" : ""}`}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  {passwordsMismatch && (
                    <div className="auth-modal_field-error">{t("auth.passwordMismatch")}</div>
                  )}
                </div>
              )}

              {captchaRequiredNow && (
                <div className="mb-3 auth-modal_captcha">
                  <ReCaptcha ref={recaptchaRef} onChange={setCaptchaToken} />
                </div>
              )}

              {error && <p className="auth-modal_error mb-3">{error}</p>}

              <button
                type="submit"
                className="btn btn-dark w-100"
                disabled={isSubmitting || (mode === "register" && passwordsMismatch)}
              >
                {isSubmitting ? t("auth.submitWait") : mode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
              </button>
            </form>

            <p className="auth-modal_switch mb-0">
              {mode === "login" ? (
                <>
                  {t("auth.noAccount")}{" "}
                  <button type="button" className="auth-modal_switch-btn" onClick={() => switchMode("register")}>
                    {t("auth.submitRegister")}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.haveAccount")}{" "}
                  <button type="button" className="auth-modal_switch-btn" onClick={() => switchMode("login")}>
                    {t("auth.submitLogin")}
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
