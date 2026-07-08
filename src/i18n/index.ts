import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';

export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'pt-BR',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React já faz sanitização
    },
    detection: {
      // Ordem de detecção: querystring > localStorage > navegador
      // querystring é necessário para o Puppeteer receber o idioma correto na URL
      order: ['querystring', 'localStorage', 'navigator'],
      // Chave usada no localStorage
      lookupLocalStorage: 'books-snd-language',
      // Chave usada no querystring (?lang=pt-BR)
      lookupQuerystring: 'lang',
      // Cachear a detecção
      caches: ['localStorage'],
    },
  });

export default i18n;
