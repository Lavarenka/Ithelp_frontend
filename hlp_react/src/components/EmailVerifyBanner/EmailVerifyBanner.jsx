import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import "./EmailVerifyBanner.css";

// Ненавязчивый баннер под шапкой — показывается только залогиненным
// пользователям с ещё не подтверждённым email (см. email_verified в
// User на бэкенде). Подтверждение "мягкое": сайтом можно пользоваться и
// без него, баннер просто предлагает подтвердить и даёт кнопку "отправить
// письмо ещё раз" на случай, если первое не дошло/потерялось.
export default function EmailVerifyBanner() {
  const { t } = useTranslation();
  const { isAuthenticated, user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sendState, setSendState] = useState("idle"); // "idle" | "sending" | "sent" | "error"

  if (!isAuthenticated || !user || user.email_verified || dismissed) {
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

      <button
        type="button"
        className="email-verify-banner_close"
        onClick={() => setDismissed(true)}
        aria-label={t("common.cancel")}
      >
        ×
      </button>
    </div>
  );
}
