import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../../api";
import { useAuth } from "../../context/AuthContext";

// Страница по ссылке из письма подтверждения (см. app/mailer.py на
// бэкенде: ссылка вида /verify-email?token=...). Не требует авторизации —
// пользователь может открыть письмо в другом браузере/вкладке без сессии;
// если сессия есть — после успеха обновляем user через refreshUser, чтобы
// баннер "подтвердите email" пропал сразу же, без перезахода.
export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "already" | "error"
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage(t("auth.verifyEmailMissingToken"));
      return;
    }

    // StrictMode в dev монтирует эффекты дважды (mount -> cleanup -> mount).
    // AbortController тут не "флаг на всё будущее", а привязан к КОНКРЕТНОМУ
    // запуску эффекта: пробный (первый) запрос StrictMode оборвётся своим же
    // cleanup'ом ещё до того, как успеет применить результат к состоянию, а
    // настоящий (второй) запуск получит свой контроллер и спокойно доведёт
    // fetch до конца. Токен на бэкенде одноразовый, но обрываем именно сетевой
    // запрос (AbortError), а не "решаем не отправлять его вовсе" — так что
    // сервер получает только один реальный запрос с этим токеном.
    const controller = new AbortController();
    const run = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
          { signal: controller.signal }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || t("auth.verifyEmailFailed"));
        }
        setStatus(data?.already_verified ? "already" : "success");
        await refreshUser();
      } catch (err) {
        if (err.name === "AbortError") return;
        setStatus("error");
        setErrorMessage(err.message || t("auth.verifyEmailFailed"));
      }
    };

    run();
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <Link to="/" className="article_back mb-3 d-inline-block">
            {t("common.backToArticles")}
          </Link>

          {status === "loading" && <p className="body_state">{t("common.loading")}</p>}
          {status === "success" && (
            <p className="body_state">{t("auth.verifyEmailSuccess")}</p>
          )}
          {status === "already" && (
            <p className="body_state">{t("auth.verifyEmailAlready")}</p>
          )}
          {status === "error" && (
            <p className="body_state text-danger">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
