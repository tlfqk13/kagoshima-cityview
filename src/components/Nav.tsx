'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from './ThemeProvider'
import type { Theme } from '@/lib/theme'
import styles from './Nav.module.css'

export default function Nav() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  function cycleTheme() {
    const next: Record<string, Theme> = { system: 'light', light: 'dark', dark: 'system' }
    setTheme(next[theme] as Theme)
  }

  const themeIcon = theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '⊙'

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        가고시마 <em>시티뷰</em> 버스 가이드
      </Link>
      <ul className={styles.links}>
        <li><Link href="/">{t('nav.story')}</Link></li>
        <li><Link href="/map">{t('nav.map')}</Link></li>
      </ul>
      <div className={styles.right}>
        <button
          className={styles.themeBtn}
          onClick={cycleTheme}
          aria-label={t('nav.toggleTheme')}
          title={theme}
        >
          {themeIcon}
        </button>
        <LanguageSwitcher />
        <Link href="/map" className={styles.ctaBtn}>
          {t('nav.openMap')} →
        </Link>
      </div>
    </nav>
  )
}
