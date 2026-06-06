'use client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

let initPromise: Promise<unknown> | null = null

if (!i18n.isInitialized && !initPromise) {
  initPromise = i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ko: { translation: ko },
        en: { translation: en },
        ja: { translation: ja },
      },
      fallbackLng: 'ko',
      supportedLngs: ['ko', 'en', 'ja'],
      detection: {
        order: ['querystring', 'cookie', 'navigator'],
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        caches: ['cookie'],
      },
      interpolation: { escapeValue: false },
    })
}

export default i18n
