'use client'
import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGES, type Language } from './locale'
import { MESSAGES } from './messages'

// 전역 singleton을 공유하지 않아 동시 SSR 요청의 언어가 서로 섞이지 않는다.
export function createI18n(language: Language) {
  const instance = createInstance()
  void instance.use(initReactI18next).init({
    resources: Object.fromEntries(LANGUAGES.map(code => [code, { translation: MESSAGES[code] }])),
    lng: language,
    fallbackLng: 'ja',
    supportedLngs: [...LANGUAGES],
    initAsync: false,
    interpolation: { escapeValue: false },
  })
  return instance
}
