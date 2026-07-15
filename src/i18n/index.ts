import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ro from './ro.json';
import en from './en.json';

export const SUPPORTED_LANGS = ['ro', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const STORAGE_KEY = 'tb-lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ro: { translation: ro },
      en: { translation: en },
    },
    fallbackLng: 'ro',
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    nonExplicitSupportedLngs: true, // 'ro-RO' → 'ro'
    interpolation: { escapeValue: false }, // React handles escaping
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in sync for SEO + a11y
const updateHtmlLang = (lng: string) => {
  const base = lng.split('-')[0];
  if (typeof document !== 'undefined') {
    document.documentElement.lang = SUPPORTED_LANGS.includes(base as Lang) ? base : 'ro';
  }
};

updateHtmlLang(i18n.language);
i18n.on('languageChanged', updateHtmlLang);

export default i18n;
