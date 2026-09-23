import type { Metadata } from 'next'
import Link from 'next/link'
import { getRoute, getStopById, getStopsForRoute } from '@/lib/routes'
import { findHotel } from '@/lib/hotels'
import { SITE_URL, SITE_DOMAIN } from '@/lib/site'
import { HOME_PHOTOS } from '@/components/home/photos'
import { createQrSvgDataUrl } from '@/lib/printQr'
import PrintButton from '../PrintButton'
import styles from './site.module.css'

export const metadata: Metadata = {
  title: 'サイトQRカード（A6） | 鹿児島シティビューバスガイド',
  robots: { index: false }, // 프린트용 유틸 페이지 — 검색 색인 제외
}

interface Props {
  searchParams: Promise<{ hotel?: string }>
}

// 팜플렛·프런트 비치용 A6 카드 — QR은 사이트 첫 화면(/)으로 연결된다.
// 정류장별 카드(/card/[stopId])와 달리 특정 정류장이 아닌 서비스 전체를 안내한다.
// ?hotel=<slug> 지정 시 호텔 이름과 최근접 정류장이 들어간다 (hotels.json 참조).
export default async function SiteCardPage({ searchParams }: Props) {
  const { hotel: hotelSlug } = await searchParams
  const hotel = findHotel(hotelSlug)
  const nearestStop = hotel ? getStopById('cityview', hotel.stopId) : undefined
  const route = getRoute('cityview')
  const stopCount = getStopsForRoute('cityview').length
  const url = `${SITE_URL}/`
  const qr = await createQrSvgDataUrl(url)

  return (
    <div className={styles.screen}>
      <div className={styles.toolbar}>
        <PrintButton />
        <Link href="/card/poster" className={styles.toolLink}>A4 poster</Link>
        <Link href="/card" className={styles.toolLink}>전체 인쇄물 목록</Link>
        <Link href="/downloads" className={styles.toolLink}>← サイトへ戻る · Back to site · 사이트로</Link>
      </div>

      <div className={styles.card}>
        <div className={styles.visual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HOME_PHOTOS.hero} alt="" className={styles.visualImg} />
        </div>
        <div className={styles.header}>
          <span className={styles.service}>Kagoshima City View Bus Guide</span>
          <span className={styles.route}>{route.name.ja}</span>
        </div>

        <div className={styles.body}>
          {hotel && (
            <div className={styles.hotelBand}>
              <span className={styles.hotelName}>{hotel.nameJa}</span>
              <span className={styles.hotelNote}>ご宿泊のお客様へ · For our guests · 투숙객 안내</span>
              {nearestStop && (
                <span className={styles.hotelStop}>
                  最寄り停留所 · Nearest stop · 가까운 정류장: No.{nearestStop.number} {nearestStop.name.ja}
                </span>
              )}
            </div>
          )}

          <h1 className={styles.titleJa}>バス停の正確な位置を、<br />スマホで。</h1>
          <p className={styles.titleSub}>
            Find every City View bus stop — exactly.<br />
            시티뷰 버스 정류장, 정확한 위치를 한눈에.
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code — ${SITE_DOMAIN}`} className={styles.qr} />
          <div className={styles.url}>{SITE_DOMAIN}</div>

          <ul className={styles.points}>
            <li>全{stopCount}停留所マップ · All {stopCount} stops · {stopCount}개 정류장</li>
            <li>日本語 · English · 한국어</li>
            <li>無料 · アプリ不要 · Free, no app · 무료, 설치 불필요</li>
          </ul>
        </div>

        <div className={styles.footer}>
          <span className={styles.attribution}>データ提供：鹿児島市（原データより加工）</span>
          <span className={styles.domain}>{SITE_DOMAIN}</span>
        </div>
      </div>
    </div>
  )
}
