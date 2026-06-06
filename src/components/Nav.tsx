'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import styles from './Nav.module.css'

export default function Nav() {
  const { t } = useTranslation()

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
        <LanguageSwitcher />
        <Link href="/map" className={styles.ctaBtn}>
          {t('nav.openMap')} →
        </Link>
      </div>
    </nav>
  )
}
