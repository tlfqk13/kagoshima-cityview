import type { Metadata } from 'next'
import Link from 'next/link'
import { getStopsForRoute } from '@/lib/routes'
import { getAllHotels } from '@/lib/hotels'
import styles from './index.module.css'

export const metadata: Metadata = {
  title: '인쇄물 | 가고시마 시티뷰 버스 가이드',
  robots: { index: false }, // 프린트용 유틸 페이지 — 검색 색인 제외
}

// 호텔·관광안내소용 인쇄물 인덱스.
// 사이트 QR(카드·포스터)은 첫 화면으로, 정류장 카드는 해당 정류장 지도로 연결된다.
export default function CardIndexPage() {
  const stops = getStopsForRoute('cityview')
  const hotels = getAllHotels()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.backNav} aria-label="Site">
          <Link href="/downloads">← 資料 · Downloads · 자료</Link>
          <Link href="/">サイトトップ · Home · 홈</Link>
        </nav>
        <h1 className={styles.h1}>인쇄물</h1>
        <p className={styles.sub}>
          印刷物 — Print materials / 팜플렛·프런트 비치용
        </p>
      </header>

      <section id="site-qr" className={styles.section}>
        <h2 className={styles.h2}>사이트 QR · サイトQR</h2>
        <p className={styles.note}>QR을 찍으면 사이트 첫 화면이 열립니다. 팜플렛·로비 게시용.</p>
        <ul className={styles.grid}>
          <li>
            <Link href="/card/site" className={styles.item}>
              <span className={styles.num}>A6</span>
              <span className={styles.name}>サイトQRカード</span>
              <span className={styles.nameSub}>Site QR card · 사이트 QR 카드</span>
            </Link>
          </li>
          <li>
            <Link href="/card/poster" className={styles.item}>
              <span className={styles.num}>A4</span>
              <span className={styles.name}>サイトQRポスター</span>
              <span className={styles.nameSub}>Site QR poster · 사이트 QR 포스터</span>
            </Link>
          </li>
        </ul>
        <details className={styles.hotels}>
          <summary>호텔 이름 넣은 버전 · ホテル名入り ({hotels.length})</summary>
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

      <section className={styles.section}>
        <h2 className={styles.h2}>정류장 카드 · 停留所カード</h2>
        <p className={styles.note}>QR을 찍으면 해당 정류장의 위치가 지도로 열립니다.</p>
        <ul className={styles.grid}>
          {stops.map(stop => (
            <li key={stop.id}>
              <Link href={`/card/${stop.id}`} className={styles.item}>
                <span className={styles.num}>No. {stop.number}</span>
                <span className={styles.name}>{stop.name.ja}</span>
                <span className={styles.nameSub}>{stop.name.en} · {stop.name.ko}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
