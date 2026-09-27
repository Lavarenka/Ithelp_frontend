import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { OAUTH_RETURN_TO_KEY } from "../AuthModal/OAuthButtons";
import SeoHead from "../SeoHead/SeoHead";

const KNOWN_ERRORS = [
  "oauth_cancelled",
  "oauth_state_mismatch",
  "oauth_failed",
  "oauth_no_email",
  "oauth_blocked",
  "oauth_not_configured",
];

// Сюда бэкенд возвращает человека после входа через Google/GitHub (см.
// backend app/routers/oauth.py): /auth/callback#token=... при успехе или
// #error=<код> при ошибке. Токен во фрагменте (#) — его браузер не отправляет
// на сервер. Сразу убираем фрагмент из адресной строки, чтобы токен не
// остался в истории браузера и не попал в скриншот/скопированную ссылку.
function readFragment() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return { token: params.get("token"), error: params.get("error") };
}

// Куда вернуть человека после входа — страница, с которой он нажал кнопку
// (сохраняет OAuthButtons). Только пути внутри сайта — не даём увести на
// чужой адрес через подложенное значение.
function readReturnTo() {
  let returnTo = "/";
  try {
    returnTo = sessionStorage.getItem(OAUTH_RETURN_TO_KEY) || "/";
  } catch {
    // нет sessionStorage — на главную
  }
  if (!returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.startsWith("/auth/callback")) {
    return "/";
  }
  return returnTo;
}

export default function OAuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  // Фрагмент и адрес возврата читаем один раз при первом рендере: эффект ниже
  // их очищает, а в dev-режиме (StrictMode) он запускается дважды — второй
  // запуск без этого увидел бы уже пустые значения и увёл бы на главную.
  const [{ token, error }] = useState(readFragment);
  const [returnTo] = useState(readReturnTo);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    window.history.replaceState(null, "", window.location.pathname);
    try {
      sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
    } catch {
      // нет sessionStorage — нечего чистить
    }
    if (!token) return;

    loginWithToken(token);
    navigate(returnTo, { replace: true });
  }, [token, returnTo, loginWithToken, navigate]);

  const errorCode = token ? null : KNOWN_ERRORS.includes(error) ? error : "oauth_failed";

  return (
    <div className="layout_main">
      <div className="body_row">
        <div className="body">
          <SeoHead path="/auth/callback" noindex />
          {errorCode ? (
            <>
              <p className="body_state text-danger">{t(`auth.oauthErrors.${errorCode}`)}</p>
              <Link to="/" className="article_back d-inline-block">
                {t("common.backToArticles")}
              </Link>
            </>
          ) : (
            <p className="body_state">{t("auth.oauthSigningIn")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
