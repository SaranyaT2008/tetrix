import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import ta from "@/locales/ta.json";
import hi from "@/locales/hi.json";

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "ta", label: "தமிழ்", short: "தமிழ்" },
  { code: "hi", label: "हिन्दी", short: "हिन्दी" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
      hi: { translation: hi },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
  });
}

export default i18next;
