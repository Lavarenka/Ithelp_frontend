import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../../api";

export const OAUTH_RETURN_TO_KEY = "it_hlp_oauth_return_to";

const PROVIDER_UI = {
  google: { icon: "fa-brands fa-google", labelKey: "auth.continueWithGoogle" },
  github: { icon: "fa-brands fa-github", labelKey: "auth.continueWithGithub" },
};

// Список включённых провайдеров один на всю страницу — запрашиваем один раз,
// а не при каждом открытии модалки.
let providersPromise = null;
function fetchProviders() {
  if (!providersPromise) {
    providersPromise = fetch(`${API_BASE_URL}/auth/oauth/providers`)
      .then((response) => (response.ok ? response.json() : { providers: [] }))
      .then((data) => data.providers ?? [])
      .catch(() => {
        providersPromise = null; // бэкенд недоступен — попробуем при следующем открытии
        return [];
      });
  }
  return providersPromise;
}

// Кнопки «Войти через Google / GitHub» в модалке входа/регистрации. Это
// обычные ссылки на бэкенд (полный переход страницы, а не fetch): дальше
// бэкенд сам уводит на Google/GitHub и обратно, а в конце присылает человека
// на /auth/callback (см. OAuthCallbackPage и backend app/routers/oauth.py).
// Показываются только те провайдеры, для которых на бэкенде заданы ключи.
export default function OAuthButtons() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchProviders().then((list) => {
      if (!cancelled) setProviders(list.filter((name) => PROVIDER_UI[name]));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  // Запоминаем, где человек был, чтобы после входа вернуть его туда же, а не на главную.
  const rememberReturnPath = () => {
    try {
      sessionStorage.setItem(OAUTH_RETURN_TO_KEY, window.location.pathname + window.location.search);
    } catch {
      // приватный режим и т.п. — просто вернёмся на главную
    }
  };

  return (
    <div className="auth-modal_oauth">
      <div className="auth-modal_oauth-divider">
        <span>{t("auth.orContinueWith")}</span>
      </div>
      {providers.map((name) => (
        <a
          key={name}
          href={`${API_BASE_URL}/auth/oauth/${name}/login`}
          className={`btn auth-modal_oauth-btn auth-modal_oauth-btn--${name}`}
          onClick={rememberReturnPath}
        >
          <i className={`${PROVIDER_UI[name].icon} me-2`} aria-hidden="true"></i>
          {t(PROVIDER_UI[name].labelKey)}
        </a>
      ))}
    </div>
  );
}
