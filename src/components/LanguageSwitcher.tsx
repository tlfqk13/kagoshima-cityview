'use client'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import styles from './LanguageSwitcher.module.css'

const LANGS = ['ko', 'en', 'ja'] as const
type LangCode = typeof LANGS[number]

function persistLanguage(language: LangCode) {
  document.cookie = `i18next=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const currentLang = LANGS.includes(i18n.language as LangCode)
    ? i18n.language
    : 'ja'

  function changeLanguage(language: LangCode) {
    persistLanguage(language)
    void i18n.changeLanguage(language)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', language)
    // RSC도 다시 요청해 MDX 본문과 클라이언트 메뉴를 같은 언어로 전환한다.
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false })
  }

  return (
    <div className={styles.wrap}>
      {LANGS.map(lang => (
        <button
          key={lang}
          className={currentLang === lang ? styles.on : styles.btn}
          onClick={() => changeLanguage(lang)}
          aria-label={`Switch to ${lang.toUpperCase()}`}
          aria-pressed={currentLang === lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
