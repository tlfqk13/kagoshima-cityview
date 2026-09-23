'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { Lang } from '@/lib/routes'
import type { Hotel } from '@/lib/hotels'
import styles from './DownloadsContent.module.css'

interface StopItem {
  id: string
  number: number
  name: Record<Lang, string>
}

interface Props {
  stops: StopItem[]
  hotels: Hotel[]
}

const DOCS = [
  { href: '/downloads/tourism-office-ja.pdf', titleKey: 'tourismTitle', descKey: 'tourismDesc' },
  { href: '/downloads/hotels-ja.pdf', titleKey: 'hotelTitle', descKey: 'hotelDesc' },
  { href: '/downloads/incident-guide-ja.pdf', titleKey: 'incidentTitle', descKey: 'incidentDesc' },
]

// 호텔·관광안내소용 허브 — 인쇄물(사이트 POP·포스터·정류장 POP)과 제안 문서를 한 페이지에서.
// 인쇄 페이지(/card/*)는 여기서만 연결되며 검색 색인에서는 제외한다.
export default function DownloadsContent({ stops, hotels }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ja') as Lang

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{t('downloads.eyebrow')}</div>
        <h1 className={styles.h1}>{t('downloads.title')}</h1>
        <p className={styles.intro}>{t('downloads.intro')}</p>
      </header>

      {/* 사이트 안내 POP·포스터 — QR은 첫 화면, 호텔 버전은 호텔 모드 지도 */}
      <section id="site" className={styles.section} aria-labelledby="dl-site">
        <h2 id="dl-site" className={styles.h2}>{t('downloads.siteQrTitle')}</h2>
        <p className={styles.note}>{t('downloads.siteQrDesc')}</p>
        <div className={styles.pair}>
          <Link href="/card/site" className={styles.item}>
            <span className={styles.size}>A6</span>
            <span className={styles.itemBody}>
              <span className={styles.itemTitle}>{t('downloads.sitePop')}</span>
              <span className={styles.itemDesc}>{t('downloads.sitePopDesc')}</span>
            </span>
            <span className={styles.itemCta}>{t('downloads.open')}</span>
          </Link>
          <Link href="/card/poster" className={styles.item}>
            <span className={styles.size}>A4</span>
            <span className={styles.itemBody}>
              <span className={styles.itemTitle}>{t('downloads.sitePoster')}</span>
              <span className={styles.itemDesc}>{t('downloads.sitePosterDesc')}</span>
            </span>
            <span className={styles.itemCta}>{t('downloads.open')}</span>
          </Link>
        </div>
        <details className={styles.hotels}>
          <summary>{t('downloads.hotelVersions', { count: hotels.length })}</summary>
          <p className={styles.note}>{t('downloads.hotelVersionsDesc')}</p>
          <ul className={styles.hotelList}>
            {hotels.map(h => (
              <li key={h.slug}>
                <span className={styles.hotelName}>{h.nameJa}</span>
                <Link href={`/card/site?hotel=${h.slug}`}>A6</Link>
                <Link href={`/card/poster?hotel=${h.slug}`}>A4</Link>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* 정류장별 POP — QR은 해당 정류장 지도 */}
      <section id="stops" className={styles.section} aria-labelledby="dl-stops">
        <h2 id="dl-stops" className={styles.h2}>{t('downloads.cardTitle')}</h2>
        <p className={styles.note}>{t('downloads.cardDesc')}</p>
        <ul className={styles.grid}>
          {stops.map(stop => (
            <li key={stop.id}>
              <Link href={`/card/${stop.id}`} className={styles.stop}>
                <span className={styles.stopNum}>No. {stop.number}</span>
                <span className={styles.stopName}>{stop.name[lang]}</span>
                {lang !== 'ja' && <span className={styles.stopSub}>{stop.name.ja}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 제안 문서 */}
      <section id="docs" className={styles.section} aria-labelledby="dl-docs">
        <h2 id="dl-docs" className={styles.h2}>{t('downloads.docsTitle')}</h2>
        <ul className={styles.list}>
          {DOCS.map(doc => (
            <li key={doc.href}>
              <a href={doc.href} target="_blank" rel="noopener noreferrer" className={styles.item}>
                <span className={styles.size}>PDF</span>
                <span className={styles.itemBody}>
                  <span className={styles.itemTitle}>{t(`downloads.${doc.titleKey}`)}</span>
                  <span className={styles.itemDesc}>{t(`downloads.${doc.descKey}`)}</span>
                </span>
                <span className={styles.itemCta}>{t('downloads.open')}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
