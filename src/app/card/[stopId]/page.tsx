import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { getStopsForRoute, getRoute } from '@/lib/routes'
import PrintButton from './PrintButton'
import styles from './card.module.css'

// QRModal과 동일한 도메인/URL 규칙 사용
const BASE_URL = 'https://www.kagoshima-cityview.com'

interface Props {
  params: Promise<{ stopId: string }>
}

function findStop(stopId: string) {
  return getStopsForRoute('cityview').find(s => s.id === stopId)
}

export function generateStaticParams() {
  return getStopsForRoute('cityview').map(s => ({ stopId: s.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stopId } = await params
  const stop = findStop(stopId)
  if (!stop) return {}
  return {
    title: `정류장 카드 No. ${stop.number} ${stop.name.ko} | 가고시마 시티뷰 버스 가이드`,
    robots: { index: false }, // 프린트용 유틸 페이지 — 검색 색인 제외
  }
}

// 호텔 프런트·관광안내소 비치용 A6 프린트 카드.
// QR을 스캔하면 해당 정류장의 정확한 위치가 지도로 열린다.
export default async function StopCardPage({ params }: Props) {
  const { stopId } = await params
  const stop = findStop(stopId)
  if (!stop) notFound()

  const route = getRoute('cityview')
  const url = `${BASE_URL}/map?route=cityview&stop=${stop.id}`
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 480,
    margin: 1,
    color: { dark: '#1C1A18', light: '#F4EFE9' },
  })

  return (
    <div className={styles.screen}>
      <div className={styles.toolbar}>
        <PrintButton />
        <Link href="/card" className={styles.backLink}>전체 카드 목록</Link>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardService}>Kagoshima City View Bus Guide</span>
          <span className={styles.cardRoute}>{route.name.ja}</span>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.stopNum}>No. {stop.number}</div>
          <div className={styles.stopNameJa}>{stop.name.ja}</div>
          <div className={styles.stopNameSub}>
            {stop.name.en}<br />{stop.name.ko}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code — ${stop.name.en}`} className={styles.qr} />
          <div className={styles.url}>{url}</div>
          <p className={styles.guide}>
            Scan for the exact bus stop location.<br />
            정확한 버스 정류장 위치를 QR로 확인하세요.<br />
            正確なバス停の位置はQRコードから。
          </p>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.attribution}>データ提供：鹿児島市（原データより加工）</span>
          <span className={styles.domain}>kagoshima-cityview.com</span>
        </div>
      </div>
    </div>
  )
}
