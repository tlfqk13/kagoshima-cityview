'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from './ThemeProvider'
import { IconClose, IconMenu } from './icons'
import type { Theme } from '@/lib/theme'
import styles from './Nav.module.css'

// 사이트 주요 페이지 — 푸터 사이트 링크와 같은 목록을 쓴다
export const SITE_LINKS = [
  { href: '/map', key: 'nav.map' },
  { href: '/story', key: 'nav.story' },
  { href: '/accuracy', key: 'nav.accuracy' },
  { href: '/downloads', key: 'nav.downloads' },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Nav() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname() ?? '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(pathname)
  const onMap = isActive(pathname, '/map')

  // 페이지가 바뀌면 모바일 메뉴를 닫는다 (렌더 중 상태 조정 — effect 불필요)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }

  function cycleTheme() {
    const next: Record<string, Theme> = { system: 'light', light: 'dark', dark: 'system' }
    setTheme(next[theme] as Theme)
  }

  const themeIcon = theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '⊙'

  // 상단 메뉴에는 '지도' 링크를 두지 않는다 — 오른쪽 '지도 열기' 버튼과 목적지가 같아 중복이기 때문.
  // 모바일 메뉴·푸터(사이트맵 역할)에는 그대로 남긴다.
  const renderLinks = (items: readonly (typeof SITE_LINKS)[number][]) => items.map(link => {
    const active = isActive(pathname, link.href)
    return (
      <li key={link.href}>
        <Link href={link.href} aria-current={active ? 'page' : undefined} className={active ? styles.active : undefined}>
          {t(link.key)}
        </Link>
      </li>
    )
  })
  const desktopLinks = renderLinks(SITE_LINKS.filter(link => link.href !== '/map'))
  const menuLinks = renderLinks(SITE_LINKS)

  return (
    <nav className={styles.nav} aria-label={t('nav.site')}>
      <Link href="/" className={styles.logo}>
        {t('nav.logoPre')} <em>{t('nav.logoEm')}</em> {t('nav.logoPost')}
      </Link>
      <ul className={styles.links}>{desktopLinks}</ul>
      <div className={styles.right}>
        <button
          type="button"
          className={styles.themeBtn}
          onClick={cycleTheme}
          aria-label={t('nav.toggleTheme')}
          title={theme}
        >
          {themeIcon}
        </button>
        <LanguageSwitcher />
        {/* 지도 화면에서는 같은 곳으로 가는 버튼이므로 숨긴다 */}
        {!onMap && (
          <Link href="/map" className={styles.ctaBtn}>
            {t('nav.openMap')} →
          </Link>
        )}
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setMenuOpen(open => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.menu')}
        >
          {menuOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <ul id="site-menu" className={styles.mobileMenu}>
          <li>
            <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className={pathname === '/' ? styles.active : undefined}>
              {t('nav.logoPre')} {t('nav.logoEm')} {t('nav.logoPost')}
            </Link>
          </li>
          {menuLinks}
        </ul>
      )}
    </nav>
  )
}
