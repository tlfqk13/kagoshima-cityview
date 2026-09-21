'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { SITE_LINKS } from '@/components/Nav'
import styles from './Footer.module.css'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <Link href="/" className={styles.logo}>
          {t('nav.logoPre')} <em>{t('nav.logoEm')}</em> {t('nav.logoPost')}
        </Link>
        <nav aria-label={t('nav.site')}>
          <ul className={styles.links}>
            {SITE_LINKS.map(link => (
              <li key={link.href}>
                <Link href={link.href}>{t(link.key)}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={styles.right}>
        <div>{t('footer.source')}</div>
        <div>
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('footer.license')}
          </a>
        </div>
        <div className={styles.disclaimer}>{t('footer.disclaimer')}</div>
      </div>
    </footer>
  )
}
