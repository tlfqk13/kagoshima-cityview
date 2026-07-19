import type { Metadata } from 'next'
import Link from 'next/link'
import { getStopsForRoute } from '@/lib/routes'
import styles from './index.module.css'

export const metadata: Metadata = {
  title: '정류장 카드 인쇄 | 가고시마 시티뷰 버스 가이드',
  robots: { index: false }, // 프린트용 유틸 페이지 — 검색 색인 제외
}

// 호텔·관광안내소용 정류장 카드 인쇄 인덱스.
// 정류장을 선택하면 A6 프린트 카드로 이동한다.
export default function CardIndexPage() {
  const stops = getStopsForRoute('cityview')

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>정류장 카드 인쇄</h1>
        <p className={styles.sub}>
          停留所カード印刷 — Print cards / 정류장을 선택하세요
        </p>
      </header>
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
    </div>
  )
}
