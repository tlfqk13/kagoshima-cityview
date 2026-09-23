'use client'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { LANGUAGES, normalizeLanguage, type Language } from '@/lib/locale'
import styles from './LanguageSwitcher.module.css'

// 버튼에 보이는 짧은 표기. aria-label은 언어 코드 대문자(`Switch to ZH-HANT`)로 통일한다.
const LABELS: Record<Language, string> = { ko: 'KO', en: 'EN', ja: 'JA', 'zh-Hant': '繁中' }

function persistLanguage(language: Language) {
  document.cookie = `i18next=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const currentLang = normalizeLanguage(i18n.language) ?? 'ja'

  function changeLanguage(language: Language) {
    persistLanguage(language)
    void i18n.changeLanguage(language)
    const url = new URL(window.location.href)
    url.searchParams.set('lang', language)
    // RSC도 다시 요청해 MDX 본문과 클라이언트 메뉴를 같은 언어로 전환한다.
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false })
  }

  return (
    <div className={styles.wrap}>
      {LANGUAGES.map(lang => (
        <button
          key={lang}
          className={currentLang === lang ? styles.on : styles.btn}
          onClick={() => changeLanguage(lang)}
          aria-label={`Switch to ${lang.toUpperCase()}`}
          aria-pressed={currentLang === lang}
          lang={lang}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  )
}
