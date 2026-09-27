import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadRecaptcha, RECAPTCHA_SITE_KEY } from "../../recaptcha";

// Виджет Google reCAPTCHA v2 «Я не робот».
//
// onChange(token) — вызывается с токеном, когда человек прошёл проверку, и с
// null, когда токен протух (~2 минуты) или виджет сброшен. Токен уходит на
// бэкенд вместе с формой, где его проверяет Google (backend_fastapi/app/captcha.py).
//
// ref.reset() — сбросить галочку. Токен одноразовый: после любой отправки
// формы, которая не привела к успеху, его нужно получить заново.
const ReCaptcha = forwardRef(function ReCaptcha({ onChange }, ref) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  // onChange может меняться на каждом рендере родителя — держим актуальную
  // версию в ref, чтобы не пересоздавать виджет из-за этого.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [attempt, setAttempt] = useState(0);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
      onChangeRef.current?.(null);
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    loadRecaptcha(i18n.language)
      .then((grecaptcha) => {
        if (cancelled || !containerRef.current) return;
        // grecaptcha.render требует пустой элемент — создаём свежий каждый
        // раз (в dev StrictMode эффект запускается дважды).
        const target = document.createElement("div");
        containerRef.current.replaceChildren(target);
        widgetIdRef.current = grecaptcha.render(target, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token) => onChangeRef.current?.(token),
          "expired-callback": () => onChangeRef.current?.(null),
          "error-callback": () => onChangeRef.current?.(null),
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      widgetIdRef.current = null;
    };
    // i18n.language сознательно не в зависимостях — см. loadRecaptcha().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <div className="recaptcha">
      <div ref={containerRef} />
      {status === "loading" && (
        <span className="auth-modal_captcha-loading">{t("common.loading")}</span>
      )}
      {status === "error" && (
        <button
          type="button"
          className="auth-modal_captcha-retry"
          onClick={() => setAttempt((n) => n + 1)}
        >
          {t("auth.captchaLoadFailed")}
        </button>
      )}
    </div>
  );
});

export default ReCaptcha;
