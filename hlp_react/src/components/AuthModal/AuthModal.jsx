import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../api";
import "./AuthModal.css";

// Простая капча "реши пример" — без сторонних сервисов (см. app/captcha.py на
// бэкенде). Чекбокс "Я не робот" визуально раскрывает вопрос, но реальная
// защита — это проверка ответа на бэкенде при отправке формы; сам чекбокс
// ничего не проверяет, это просто способ не показывать пример сразу всем.
function useCaptcha() {
  const [captchaId, setCaptchaId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchChallenge = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/captcha`);
      if (!response.ok) throw new Error("captcha fetch failed");
      const data = await response.json();
      setCaptchaId(data.captcha_id);
      setQuestion(data.question);
      setAnswer("");
    } catch {
      // Если капча не загрузилась — оставляем captchaId пустым, кнопка
      // отправки формы просто не даст сабмитнуть без вопроса/ответа.
      setCaptchaId(null);
      setQuestion(null);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setCaptchaId(null);
    setQuestion(null);
    setAnswer("");
  };

  return { captchaId, question, answer, setAnswer, isLoading, fetchChallenge, reset };
}

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
  const captcha = useCaptcha();
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [loginNeedsCaptcha, setLoginNeedsCaptcha] = useState(false);

  const passwordsMismatch =
    mode === "register" && passwordConfirm.length > 0 && password !== passwordConfirm;

  const captchaRequiredNow = mode === "register" || loginNeedsCaptcha;
  const captchaSatisfied =
    !captchaRequiredNow || (captchaChecked && captcha.captchaId && captcha.answer.trim() !== "");

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setError(null);
    setCaptchaChecked(false);
    setLoginNeedsCaptcha(false);
    captcha.reset();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError(null);
    setPasswordConfirm("");
    setCaptchaChecked(false);
    setLoginNeedsCaptcha(false);
    captcha.reset();
  };

  const closeModal = () => {
    // Bootstrap-модалка закрывается либо кликом по data-bs-dismiss, либо через JS API.
    // Программно кликаем по скрытой кнопке закрытия — не требует импорта bootstrap.js API.
    const modalEl = document.getElementById("loginModal");
    if (!modalEl) return;
    const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]');
    closeBtn?.click();
  };

  const handleCaptchaCheckboxChange = async (e) => {
    const checked = e.target.checked;
    setCaptchaChecked(checked);
    if (checked && !captcha.captchaId) {
      await captcha.fetchChallenge();
    }
    if (!checked) {
      captcha.reset();
    }
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

    setIsSubmitting(true);
    try {
      const captchaPayload = captchaRequiredNow
        ? { captchaId: captcha.captchaId, answer: Number(captcha.answer) }
        : null;

      if (mode === "login") {
        await login(username, password, captchaPayload);
      } else {
        await register(username, email, password, passwordConfirm, captchaPayload);
      }
      resetForm();
      closeModal();
    } catch (err) {
      if (err.code === "captcha_required") {
        // Бэкенд только что решил, что для этого логина пора требовать
        // капчу — показываем поле и просим пользователя попробовать снова,
        // не считая это "неверным логином/паролем".
        setLoginNeedsCaptcha(true);
        setCaptchaChecked(true);
        await captcha.fetchChallenge();
        setError(t("auth.captchaNowRequired"));
      } else if (err.code === "captcha_invalid") {
        await captcha.fetchChallenge();
        setError(err.message || t("auth.genericError"));
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
                  <div className="form-check">
                    <input
                      id="auth-captcha-checkbox"
                      type="checkbox"
                      className="form-check-input"
                      checked={captchaChecked}
                      onChange={handleCaptchaCheckboxChange}
                    />
                    <label className="form-check-label" htmlFor="auth-captcha-checkbox">
                      {t("auth.captchaCheckbox")}
                    </label>
                  </div>

                  {captchaChecked && (
                    <div className="auth-modal_captcha-challenge">
                      {captcha.isLoading && (
                        <span className="auth-modal_captcha-loading">{t("common.loading")}</span>
                      )}
                      {!captcha.isLoading && captcha.question && (
                        <>
                          <label className="form-label" htmlFor="auth-captcha-answer">
                            {t("auth.captchaQuestion", { question: captcha.question })}
                          </label>
                          <input
                            id="auth-captcha-answer"
                            type="number"
                            className="form-control"
                            value={captcha.answer}
                            onChange={(e) => captcha.setAnswer(e.target.value)}
                            required
                          />
                        </>
                      )}
                      {!captcha.isLoading && !captcha.question && (
                        <button
                          type="button"
                          className="auth-modal_captcha-retry"
                          onClick={() => captcha.fetchChallenge()}
                        >
                          {t("auth.captchaLoadFailed")}
                        </button>
                      )}
                    </div>
                  )}
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
