import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Cookies from "js-cookie";

import en from "./locales/en.json";
import ru from "./locales/ru.json";

export const LANGUAGE_COOKIE = "it_hlp_lang";
const SUPPORTED_LANGUAGES = ["en", "ru"];
const DEFAULT_LANGUAGE = "en";

// Язык берём только из куки, которую сами же и пишем при переключении —
// никакого автоопределения по браузеру/системе: если куки нет (первый
// visita), сайт обязан открыться на английском, это жёсткое требование.
function resolveInitialLanguage() {
  const fromCookie = Cookies.get(LANGUAGE_COOKIE);
  if (fromCookie && SUPPORTED_LANGUAGES.includes(fromCookie)) {
    return fromCookie;
  }
  return DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
  returnEmptyString: false,
});

// Держим куку в актуальном состоянии при каждой смене языка (в т.ч. при
// вызове i18n.changeLanguage откуда угодно, не только через тумблер в шапке).
i18n.on("languageChanged", (lng) => {
  Cookies.set(LANGUAGE_COOKIE, lng, { expires: 365, sameSite: "Lax" });
});

export default i18n;
