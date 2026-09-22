import type { Metadata } from 'next'
import Link from 'next/link'
import { getRoute, getStopById, getStopsForRoute } from '@/lib/routes'
import { findHotel } from '@/lib/hotels'
import { SITE_URL, SITE_DOMAIN } from '@/lib/site'
import { createQrSvgDataUrl } from '@/lib/printQr'
import { HOME_PHOTOS } from '@/components/home/photos'
import PrintButton from '../PrintButton'
import styles from './poster.module.css'

export const metadata: Metadata = {
  title: 'サイトQRポスター（A4） | 鹿児島シティビューバスガイド',
  robots: { index: false }, // 프린트용 유틸 페이지 — 검색 색인 제외
}

interface Props {
  searchParams: Promise<{ hotel?: string }>
}

// 호텔 프런트·로비·관광안내소 게시용 A4 포스터 — QR은 사이트 첫 화면(/)으로 연결된다.
// 운행 정보는 노선 JSON 메타데이터에서 읽으므로 데이터 갱신 시 자동 반영된다.
export default async function PosterPage({ searchParams }: Props) {
  const { hotel: hotelSlug } = await searchParams
  const hotel = findHotel(hotelSlug)
  const nearestStop = hotel ? getStopById('cityview', hotel.stopId) : undefined
  const route = getRoute('cityview')
  const stopCount = getStopsForRoute('cityview').length
  const qr = await createQrSvgDataUrl(`${SITE_URL}/`)

  const facts: { ja: string; sub: string; value: string }[] = []
  if (route.firstDeparture && route.lastDeparture) {
    facts.push({ ja: '運行時間', sub: 'Hours · 운행', value: `${route.firstDeparture} – ${route.lastDeparture}` })
  }
  if (route.frequencyMin) {
    facts.push({ ja: '運行間隔', sub: 'Every · 간격', value: `約${route.frequencyMin}分 / ${route.frequencyMin} min` })
  }
  facts.push({ ja: '運賃（大人）', sub: 'Fare · 요금', value: `¥${route.fare.adult}` })
  if (route.dayPass) {
    facts.push({ ja: '1日乗車券', sub: 'Day pass · 1일권', value: `¥${route.dayPass.adult}` })
  }
  facts.push({ ja: '1周', sub: 'Loop · 한 바퀴', value: `約${route.loopDurationMin}分 / ${route.loopDurationMin} min` })

  return (
    <div className={styles.screen}>
      <div className={styles.toolbar}>
        <PrintButton />
        <Link href="/card/site" className={styles.toolLink}>A6 card</Link>
        <Link href="/card" className={styles.toolLink}>전체 인쇄물 목록</Link>
        <Link href="/downloads" className={styles.toolLink}>← サイトへ戻る · Back to site · 사이트로</Link>
      </div>

      <div className={styles.poster}>
        <div className={styles.visual}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HOME_PHOTOS.hero} alt="" className={styles.visualImg} />
          <span className={styles.visualTag}>Kagoshima City View Bus Guide</span>
        </div>

        <div className={styles.content}>
          {hotel && (
            <div className={styles.hotelBand}>
              <span className={styles.hotelName}>{hotel.nameJa}</span>
              <span className={styles.hotelNote}>
                ご宿泊のお客様へ · For our guests · 투숙객 안내
                {nearestStop && (
                  <> — 最寄り停留所 · Nearest stop · 가까운 정류장: No.{nearestStop.number} {nearestStop.name.ja}</>
                )}
              </span>
            </div>
          )}

          <h1 className={styles.titleJa}>
            シティビューバスの<br />バス停、もう迷わない。
          </h1>
          <p className={styles.titleEn}>Never miss the City View bus stop again.</p>
          <p className={styles.titleKo}>시티뷰 버스 정류장, 이제 헤매지 마세요.</p>

          <div className={styles.grid}>
            <div className={styles.lead}>
              <p className={styles.leadJa}>
                地図アプリでは、停留所の位置がずれて表示されることがあります。
                全{stopCount}停留所の正確な位置を、無料・アプリ不要で確認できます。
              </p>
              <p className={styles.leadSub}>
                Map apps sometimes show these stops in the wrong place. Check the exact
                location of all {stopCount} stops — free, no app needed.
              </p>
              <p className={styles.leadSub}>
                지도 앱은 정류장 위치를 잘못 표시하기도 합니다. {stopCount}개 정류장의
                정확한 위치를 무료로, 설치 없이 확인하세요.
              </p>

              <dl className={styles.facts}>
                {facts.map(f => (
                  <div key={f.ja} className={styles.fact}>
                    <dt>
                      {f.ja}
                      <span>{f.sub}</span>
                    </dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={styles.qrBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code — ${SITE_DOMAIN}`} className={styles.qr} />
              <div className={styles.scan}>
                読み取ってください<br />Scan me · 스캔하세요
              </div>
              <div className={styles.url}>{SITE_DOMAIN}</div>
              <div className={styles.langs}>日本語 · English · 한국어</div>
            </div>
          </div>

          <p className={styles.disclaimer}>
            運行時間・運賃は変更される場合があります（{route.sourceVersion}時点）。最新の情報は鹿児島市交通局の公式サイトでご確認ください。
            Schedules and fares may change — please check official information.
          </p>
        </div>

        <div className={styles.footer}>
          <span>データ提供：鹿児島市（原データより加工） · CC BY 4.0</span>
          <span className={styles.domain}>{SITE_DOMAIN}</span>
        </div>
      </div>
    </div>
  )
}
