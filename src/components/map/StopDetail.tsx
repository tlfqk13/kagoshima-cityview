'use client'
import { useRef, useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { type RouteStop, type RouteId, DATA_LANGS, nameKey } from '@/lib/routes'
import { getStopVerification, getDepartureInterval, getScheduleExtraNote, getRoute } from '@/lib/routes'
import type { HotelStops } from '@/lib/hotels'
import styles from './StopDetail.module.css'
import QRModal from './QRModal'
import TodayBoard from './TodayBoard'
import { IconWalk, IconWarn } from '@/components/icons'
import { copyText } from '@/lib/clipboard'
import Image from 'next/image'
import Link from 'next/link'
import { getHotelsNearStop } from '@/lib/hotels'
import { getGroupedStops } from '@/lib/routes'
import { IconBed } from '@/components/icons'
import { track } from '@/lib/analytics/track'

interface Props {
  stop: RouteStop
  routeId: RouteId
  userLocation?: [number, number] | null
  isFavorite?: boolean
  onToggleFavorite?: (stopId: string) => void
  /** 호텔 모드일 때 — '돌아가는 법'에 그 호텔의 내리는 정류장을 보여준다 */
  hotelStops?: HotelStops | null
}

function getWalkingEstimate(userLat: number, userLng: number, stopLat: number, stopLng: number) {
  const R = 6371000
  const dLat = ((stopLat - userLat) * Math.PI) / 180
  const dLng = ((stopLng - userLng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) *
    Math.cos((stopLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const meters = Math.round(dist / 10) * 10  // round to nearest 10m
  const minutes = Math.max(1, Math.round(dist / 80))  // 80m/min walking speed
  return { meters, minutes }
}

export default function StopDetail({ stop, routeId, userLocation, isFavorite, onToggleFavorite, hotelStops }: Props) {
  const { t, i18n } = useTranslation()
  const route = getRoute(routeId)
  // FAQ 버튼 → 해당 정보로 스크롤하고 잠깐 강조. AI 없이 화면 안의 정보로 답한다.
  const nextRef = useRef<HTMLDivElement>(null)
  const destRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const lastRef = useRef<HTMLDivElement>(null)
  const fareRef = useRef<HTMLDivElement>(null)
  type FaqKey = 'next' | 'dest' | 'back' | 'last' | 'fare'
  const FAQ: FaqKey[] = ['next', 'dest', 'back', 'last', 'fare']
  function jumpTo(key: FaqKey) {
    track('faq_click', { k: stop.id, v: key, lang: i18n.language })
    const el = { next: nextRef, dest: destRef, back: backRef, last: lastRef, fare: fareRef }[key].current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    el.classList.remove(styles.flash)
    void el.offsetWidth // 애니메이션 재시작
    el.classList.add(styles.flash)
  }
  const lang = nameKey(i18n.language)
  const [toast, setToast] = useState<string | null>(null)
  const [toastKey, setToastKey] = useState(0)
  const [showQR, setShowQR] = useState(false)
  // hydration mismatch 방지: SSR/초기 렌더는 false(getServerSnapshot), 클라이언트에서 UA 판별
  const isIOS = useSyncExternalStore(
    () => () => {},
    () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    () => false
  )

  const stopName = stop.name[lang]
  // 호텔 데이터는 시티뷰 정류장 기준이라 다른 노선에서는 보여주지 않는다
  const nearbyHotels = routeId === 'cityview' ? getHotelsNearStop(stop) : []
  // 같은 자리·맞은편의 정류장 — 중앙역 No.1/No.20은 같은 승강장, 天文館 No.3/No.19는 방향별 27m
  const grouped = getGroupedStops(routeId, stop)
  const verification = getStopVerification(routeId, stop)

  const altNames = DATA_LANGS
    .filter(l => l !== lang)
    .map(l => stop.name[l])
    .join('  /  ')

  function showToast(message: string) {
    setToast(message)
    setToastKey(k => k + 1)  // 같은 토스트 반복 시 애니메이션 재시작용
    setTimeout(() => setToast(null), 2000)
  }

  async function copyLink(url: string) {
    const ok = await copyText(url)
    showToast(t(ok ? 'map.stopDetail.linkCopied' : 'map.stopDetail.copyFailed'))
  }

  async function handleShare() {
    const url = `${window.location.origin}/map?route=${routeId}&stop=${stop.id}`
    // 비보안(HTTP) 컨텍스트에서는 navigator.share 자체가 없으므로 복사로 대체
    if (typeof navigator.share !== 'function') {
      await copyLink(url)
      return
    }
    try {
      await navigator.share({ title: stopName, url })
    } catch (error) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 정상 흐름이므로 무시
      if (error instanceof DOMException && error.name === 'AbortError') return
      // 그 외 공유 실패(권한·미지원 데이터 등)는 링크 복사로 대체
      await copyLink(url)
    }
  }

  const googleMapsUrl = `https://maps.google.com/?q=${stop.lat},${stop.lng}`
  const appleMapsUrl = `https://maps.apple.com/?ll=${stop.lat},${stop.lng}&q=${encodeURIComponent(stopName)}`

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.num}>No. {stop.number}</div>
          {onToggleFavorite && (
            <button
              className={`${styles.favBtn} ${isFavorite ? styles.favActive : ''}`}
              onClick={() => onToggleFavorite(stop.id)}
              aria-label={isFavorite ? t('map.removeFavorite') : t('map.addFavorite')}
              aria-pressed={isFavorite}
            >
              {isFavorite ? '★' : '☆'}
            </button>
          )}
          <button
            className={styles.shareBtn}
            onClick={handleShare}
            aria-label={t('map.stopDetail.shareStop')}
            title={t('map.stopDetail.shareStop')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L14 6L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 6H6C4.343 6 3 7.343 3 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className={styles.shareBtn}
            onClick={() => setShowQR(true)}
            aria-label={t('map.showQR')}
            title={t('map.showQR')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="10" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="10" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="2.5" y="2.5" width="2" height="2" fill="currentColor"/>
              <rect x="11.5" y="2.5" width="2" height="2" fill="currentColor"/>
              <rect x="2.5" y="11.5" width="2" height="2" fill="currentColor"/>
              <path d="M10 10H11.5V11.5H10V10Z" fill="currentColor"/>
              <path d="M11.5 11.5H13V13H11.5V11.5Z" fill="currentColor"/>
              <path d="M13 10H14.5V11.5H13V10Z" fill="currentColor"/>
              <path d="M10 13H11.5V14.5H10V13Z" fill="currentColor"/>
              <path d="M13 13H14.5V14.5H13V13Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div className={styles.name}>{stopName}</div>
        <div className={styles.nameAlt}>{altNames}</div>
        <div className={styles.badgeRow}>
          {stop.googleMapsError && (
            <div className={styles.badgeWarn}><IconWarn size={12} /> {t('map.stopDetail.googleMapsWrong')}</div>
          )}
          {verification === 'approximate' ? (
            <div className={styles.badgeApprox}>~ {t('map.stopDetail.coordsApproximate')}</div>
          ) : verification === 'field' ? (
            <div className={styles.badgeOk}>✓ {t('map.stopDetail.gpsVerified')}</div>
          ) : (
            <div className={styles.badgeSource}>{t('map.stopDetail.sourceChecked')}</div>
          )}
          {stop.courses && !stop.courses.includes('A') && (
            <div className={styles.badgeCourse}>{t('map.stopDetail.bCourseOnly')}</div>
          )}
        </div>
        {grouped.length > 0 && (
          <div className={styles.pair} role="group" aria-label={t('map.pair.aria')}>
            {grouped.map(({ stop: other, meters, samePlace }) => (
              <Link key={other.id} href={`/map/${other.id}`} className={styles.pairLink}>
                {samePlace
                  ? t(other.number < stop.number ? 'map.pair.sameDepart' : 'map.pair.sameArrive', { num: other.number })
                  : t('map.pair.opposite', { num: other.number, m: meters })}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className={styles.faq} role="group" aria-label={t('map.faq.title')}>
        {FAQ.filter(key => key !== 'dest' || stop.destinations.length > 0).map(key => (
          <button key={key} type="button" className={styles.faqChip} onClick={() => jumpTo(key)}>
            {t(`map.faq.${key}`)}
          </button>
        ))}
      </div>
      {userLocation && (() => {
        const { meters, minutes } = getWalkingEstimate(userLocation[1], userLocation[0], stop.lat, stop.lng)
        return (
          <div className={styles.walkingInfo}>
            <IconWalk size={16} className={styles.walkingIcon} />
            <span className={styles.walkingDist}>{meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`}</span>
            <span className={styles.walkingSep}>·</span>
            <span className={styles.walkingTime}>{t('map.walkMin', { min: minutes })}</span>
          </div>
        )
      })()}
      <div ref={nextRef}><TodayBoard routeId={routeId} stop={stop} /></div>
      {stop.schedule && (() => {
        const deps = stop.schedule.departures
        const extraNote = getScheduleExtraNote(stop.schedule.operatingNote[lang])
        const hasExactTimes = deps.length > 0
        return (
          <div className={styles.scheduleSection} ref={lastRef}>
            <div className={styles.scheduleSectionLabel}>{t(stop.schedule.arrivalOnly ? 'map.arrivals' : 'map.schedule')}</div>
            {hasExactTimes && (
              <>
                <div className={styles.scheduleTimes}>
                  <div className={styles.scheduleItem}>
                    <span className={styles.scheduleLabel}>{t('map.firstBus')}</span>
                    <span className={styles.scheduleTime}>{deps[0]}</span>
                  </div>
                  <div className={styles.scheduleDivider} />
                  <div className={styles.scheduleItem}>
                    <span className={styles.scheduleLabel}>{t('map.lastBus')}</span>
                    <span className={styles.scheduleTime}>{deps[deps.length - 1]}</span>
                  </div>
                </div>
                <div className={styles.scheduleFreq}>
                  {getDepartureInterval(deps) !== null
                    ? t('map.frequency', { count: deps.length, minutes: getDepartureInterval(deps) })
                    : t('map.dailyRuns', { count: deps.length })}
                </div>
              </>
            )}
            {extraNote && <div className={styles.scheduleNote}>{extraNote}</div>}
          </div>
        )
      })()}
      {/* 돌아가는 법 — 한 방향 순환. 호텔 모드면 그 호텔의 내리는 정류장 */}
      <div className={styles.infoSection} ref={backRef}>
        <div className={styles.scheduleSectionLabel}>{t('map.back.title')}</div>
        {hotelStops ? (
          <p className={styles.infoText}>
            {t('map.back.hotel', { num: hotelStops.alight.number, name: hotelStops.alight.name[lang], min: hotelStops.alightMinutes })}
          </p>
        ) : (
          <p className={styles.infoText}>{t('map.back.generic', { min: route.loopDurationMin })}</p>
        )}
      </div>
      {/* 요금 — 포스터에만 있던 정보를 지도에도 */}
      <div className={styles.infoSection} ref={fareRef}>
        <div className={styles.scheduleSectionLabel}>{t('map.fare.title')}</div>
        <dl className={styles.fareList}>
          <div><dt>{t('map.fare.adult')}</dt><dd>¥{route.fare.adult}</dd></div>
          <div><dt>{t('map.fare.child')}</dt><dd>¥{route.fare.child}</dd></div>
          {route.dayPass && <div className={styles.fareWide}><dt>{t('map.fare.dayPass')}</dt><dd>¥{route.dayPass.adult} / ¥{route.dayPass.child}</dd></div>}
          <div><dt>{t('map.fare.loop')}</dt><dd>{t('map.fare.loopValue', { min: route.loopDurationMin })}</dd></div>
        </dl>
        <p className={styles.infoNote}>{t('map.fare.note')}</p>
      </div>
      <div className={styles.mapsSection}>
        <div className={styles.mapsSectionLabel}>{t('map.stopDetail.openInMaps')}</div>
        <div className={styles.mapsButtons}>
          <a
            href={googleMapsUrl}
            onClick={() => track('open_maps', { k: stop.id, v: 'google', lang: i18n.language })}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mapBtn}
          >
            {t('map.stopDetail.googleMaps')} ↗
          </a>
          {isIOS && (
            <a
              href={appleMapsUrl}
              onClick={() => track('open_maps', { k: stop.id, v: 'apple', lang: i18n.language })}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapBtn}
            >
              {t('map.stopDetail.appleMaps')} ↗
            </a>
          )}
        </div>
      </div>
      {/* 정류장 사진 — JSON에 photos가 있는 정류장만. 없으면 빈자리("준비 중")를 보여주지 않는다 */}
      {stop.photos && stop.photos.length > 0 && (
        <div className={styles.photoSection}>
          <Image
            width={640}
            height={360}
            unoptimized
            src={stop.photos[0]}
            alt={t('map.stopDetail.photoAlt', { name: stopName })}
            className={styles.photo}
          />
        </div>
      )}
      {stop.destinations.length > 0 && (
        <div className={styles.destinations} ref={destRef}>
          {stop.destinations.map(dest => (
            <div key={dest.id} className={styles.dest}>
              <span className={styles.destName}>{dest.name[lang]}</span>
              <span className={styles.destWalk}>
                {t('map.stopDetail.walkTime', { min: dest.walkMinutes })}
              </span>
            </div>
          ))}
        </div>
      )}
      {nearbyHotels.length > 0 && (
        <div className={styles.hotelsSection}>
          <div className={styles.mapsSectionLabel}><IconBed size={13} /> {t('map.hotel.nearby')}</div>
          <ul className={styles.hotelList}>
            {nearbyHotels.map(({ hotel, minutes }) => (
              <li key={hotel.slug}>
                {/* 호텔 모드로 진입 — 호텔 핀·도보 경로·타는/내리는 정류장 */}
                <Link href={`/map?hotel=${hotel.slug}`} className={styles.hotelLink}>
                  <span className={styles.hotelName}>{hotel.nameJa}</span>
                  <span className={styles.hotelWalk}><IconWalk size={12} /> {t('map.walkMin', { min: minutes })}</span>
                  <span className={styles.hotelOpen}>{t('map.hotel.open')}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={styles.hotelNote}>{t('map.hotel.nearbyNote')}</div>
        </div>
      )}
      {toast && (
        <div className={styles.toast} key={toastKey}>
          {toast}
        </div>
      )}
      {showQR && <QRModal routeId={routeId} stop={stop} onClose={() => setShowQR(false)} />}
    </div>
  )
}
