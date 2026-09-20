'use client'
import { useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '@/lib/i18n'
import type { Language } from '@/lib/locale'

export default function I18nProvider({ children, initialLanguage }: { children: React.ReactNode; initialLanguage: Language }) {
  const [i18n] = useState(() => createI18n(initialLanguage))
  useEffect(() => {
    void i18n.changeLanguage(initialLanguage)
  }, [i18n, initialLanguage])
  useEffect(() => {
    const updateHtmlLanguage = (language: string) => { document.documentElement.lang = language }
    updateHtmlLanguage(i18n.language)
    i18n.on('languageChanged', updateHtmlLanguage)
    return () => { i18n.off('languageChanged', updateHtmlLanguage) }
  }, [i18n])
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
