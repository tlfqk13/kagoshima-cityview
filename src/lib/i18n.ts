'use client'
import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from './locale'

import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

// 전역 singleton을 공유하지 않아 동시 SSR 요청의 언어가 서로 섞이지 않는다.
export function createI18n(language: Language) {
  const instance = createInstance()
  void instance.use(initReactI18next).init({
    resources: { ko: { translation: ko }, en: { translation: en }, ja: { translation: ja } },
    lng: language,
    fallbackLng: 'ja',
    supportedLngs: ['ko', 'en', 'ja'],
    initAsync: false,
    interpolation: { escapeValue: false },
  })
  return instance
}
