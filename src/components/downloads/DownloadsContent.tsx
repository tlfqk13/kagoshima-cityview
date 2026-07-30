'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import styles from './DownloadsContent.module.css'

interface Item {
  href: string
  titleKey: string
  descKey: string
  external?: boolean
}

const ITEMS: Item[] = [
  { href: '/card', titleKey: 'cardTitle', descKey: 'cardDesc' },
  { href: '/downloads/tourism-office-ja.pdf', titleKey: 'tourismTitle', descKey: 'tourismDesc', external: true },
  { href: '/downloads/hotels-ja.pdf', titleKey: 'hotelTitle', descKey: 'hotelDesc', external: true },
  { href: '/downloads/incident-guide-ja.pdf', titleKey: 'incidentTitle', descKey: 'incidentDesc', external: true },
]

// 정류장 QR 카드·제안 문서 다운로드 허브
export default function DownloadsContent() {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{t('downloads.eyebrow')}</div>
        <h1 className={styles.h1}>{t('downloads.title')}</h1>
        <p className={styles.intro}>{t('downloads.intro')}</p>
      </header>
      <ul className={styles.list}>
        {ITEMS.map(item => (
          <li key={item.href}>
            {item.external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className={styles.item}>
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>{t(`downloads.${item.titleKey}`)}</span>
                  <span className={styles.itemDesc}>{t(`downloads.${item.descKey}`)}</span>
                </span>
                <span className={styles.itemCta}>{t('downloads.open')}</span>
              </a>
            ) : (
              <Link href={item.href} className={styles.item}>
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>{t(`downloads.${item.titleKey}`)}</span>
                  <span className={styles.itemDesc}>{t(`downloads.${item.descKey}`)}</span>
                </span>
                <span className={styles.itemCta}>{t('downloads.open')}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
