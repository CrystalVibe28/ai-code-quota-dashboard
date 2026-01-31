import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
import zhCN from './locales/zh-CN.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '正體中文' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' }
] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW },
      'zh-CN': { translation: zhCN }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language'
    }
  })

export default i18n
