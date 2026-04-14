import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../../locales/en/translation.json";
import uk from "../../locales/uk/translation.json";

i18n.use(LanguageDetector).init({
  resources: {
    en: { translation: en },
    uk: { translation: uk },
  },
  fallbackLng: "en",
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ["navigator"],
  },
});

export default i18n;
