'use client'
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  // hydration은 SSR과 동일하게 'ja'로 시작 — 마운트 후 감지 언어(querystring > cookie > navigator)로 전환
  useEffect(() => {
    const detected = i18n.services.languageDetector?.detect?.()
    const lang = (Array.isArray(detected) ? detected[0] : detected)?.split('-')[0]
    if (lang && ['ko', 'en', 'ja'].includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }, [])
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
