// Загрузка скрипта Google reCAPTCHA v2 и ключ сайта.
//
// Site key — ПУБЛИЧНЫЙ ключ (его и так видно в коде страницы), поэтому он
// живёт на фронтенде, в .env как VITE_RECAPTCHA_SITE_KEY. Секретный ключ —
// только на бэкенде (backend_fastapi/.env, RECAPTCHA_SECRET_KEY).
//
// Если ключ не задан — берём официальный тестовый ключ Google: виджет
// работает, но с красной надписью «только для тестирования» и пропускает
// всех. Для локальной разработки это удобно, для продакшена — нет
// (см. DEPLOY_CHECKLIST.md).
const GOOGLE_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() || GOOGLE_TEST_SITE_KEY;

const ONLOAD_CALLBACK = "__itHlpRecaptchaOnload";
let loadPromise = null;

// Скрипт грузится один раз на всю страницу и только когда капча реально
// понадобилась (открыли регистрацию / вход потребовал капчу) — не тянем
// скрипт Google на каждую страницу сайта заранее.
//
// lang — язык виджета. Google берёт его только при загрузке скрипта, поэтому
// язык капчи фиксируется при первом показе; если после этого переключить
// язык сайта, виджет останется на прежнем языке до перезагрузки страницы.
export function loadRecaptcha(lang) {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window[ONLOAD_CALLBACK] = () => resolve(window.grecaptcha);

    const script = document.createElement("script");
    script.src =
      "https://www.google.com/recaptcha/api.js" +
      `?onload=${ONLOAD_CALLBACK}&render=explicit&hl=${encodeURIComponent(lang)}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      // Даём возможность попробовать ещё раз (кнопка «повторить» в ReCaptcha).
      loadPromise = null;
      script.remove();
      reject(new Error("reCAPTCHA script failed to load"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
