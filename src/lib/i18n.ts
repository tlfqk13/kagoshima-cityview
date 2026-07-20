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
      // SSR/첫 렌더를 항상 ja로 고정 — hydration 일치용 (Node의 navigator.language='en-US'가
      // 감지되어 SSR이 영어로 렌더링되는 문제 방지). 실제 언어는 I18nProvider가 마운트 후 전환.
      lng: 'ja',
      fallbackLng: 'ja',
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
