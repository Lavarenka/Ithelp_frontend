import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import "./EmailVerifyBanner.css";

// Как часто тихо перепроверяем /auth/me, пока баннер показан — чтобы он
// сам пропал, если пользователь подтвердил почту в ДРУГОЙ вкладке (перешёл
// по ссылке из письма) и не обновлял текущую страницу вручную.
const POLL_INTERVAL = 15000;

// Ненавязчивый баннер под шапкой — показывается только залогиненным
// пользователям с ещё не подтверждённым email (см. email_verified в
// User на бэкенде). Подтверждение "мягкое": сайтом можно пользоваться и
// без него, баннер просто предлагает подтвердить и даёт кнопку "отправить
// письмо ещё раз" на случай, если первое не дошло/потерялось. Закрыть его
// крестиком нельзя — пользователь должен видеть напоминание, пока
// действительно не подтвердит почту (см. запрос пользователя).
export default function EmailVerifyBanner() {
  const { t } = useTranslation();
  const { isAuthenticated, user, resendVerification, refreshUser } = useAuth();
  const [sendState, setSendState] = useState("idle"); // "idle" | "sending" | "sent" | "error"

  const shouldPoll = isAuthenticated && Boolean(user) && !user.email_verified;

  // Тихий фоновый опрос — если пользователь подтвердил почту по ссылке из
  // письма в другой вкладке, refreshUser() подтянет email_verified: true и
  // компонент сам перестанет рендериться (условие ниже), без ручного
  // обновления страницы.
  useEffect(() => {
    if (!shouldPoll) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [shouldPoll, refreshUser]);

  if (!isAuthenticated || !user || user.email_verified) {
    return null;
  }

  const handleResend = async () => {
    setSendState("sending");
    try {
      await resendVerification();
      setSendState("sent");
    } catch {
      setSendState("error");
    }
  };

  return (
    <div className="email-verify-banner" role="status">
      <span className="email-verify-banner_text">
        {t("auth.emailVerifyBannerText", { email: user.email })}
      </span>

      {sendState === "sent" ? (
        <span className="email-verify-banner_sent">{t("auth.emailVerifyResendSent")}</span>
      ) : (
        <button
          type="button"
          className="email-verify-banner_resend"
          onClick={handleResend}
          disabled={sendState === "sending"}
        >
          {sendState === "sending" ? t("auth.emailVerifyResending") : t("auth.emailVerifyResend")}
        </button>
      )}

      {sendState === "error" && (
        <span className="email-verify-banner_error">{t("auth.genericError")}</span>
      )}
    </div>
  );
}
