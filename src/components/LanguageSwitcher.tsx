'use client'
import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

const LANGS = ['ko', 'en', 'ja'] as const
type LangCode = typeof LANGS[number]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = LANGS.includes(i18n.language as LangCode)
    ? i18n.language
    : 'ja'

  return (
    <div className={styles.wrap}>
      {LANGS.map(lang => (
        <button
          key={lang}
          className={currentLang === lang ? styles.on : styles.btn}
          onClick={() => i18n.changeLanguage(lang)}
          aria-label={`Switch to ${lang.toUpperCase()}`}
          aria-pressed={currentLang === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
