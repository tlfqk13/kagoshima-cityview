'use client'
import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteStop, RouteId, Lang } from '@/lib/routes'
import styles from './StopDetail.module.css'
import QRModal from './QRModal'

interface Props {
  stop: RouteStop
  routeId: RouteId
  userLocation?: [number, number] | null
  isFavorite?: boolean
  onToggleFavorite?: (stopId: string) => void
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

export default function StopDetail({ stop, routeId, userLocation, isFavorite, onToggleFavorite }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as Lang
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

  const altNames = (['ko', 'en', 'ja'] as Lang[])
    .filter(l => l !== lang)
    .map(l => stop.name[l])
    .join('  /  ')

  function showToast(message: string) {
    setToast(message)
    setToastKey(k => k + 1)  // 같은 토스트 반복 시 애니메이션 재시작용
    setTimeout(() => setToast(null), 2000)
  }

  function handleCopyCoords() {
    navigator.clipboard.writeText(`${stop.lat}, ${stop.lng}`)
    showToast(t('map.stopDetail.coordsCopied'))
  }

  function handleShare() {
    const url = `${window.location.origin}/map?route=${routeId}&stop=${stop.id}`
    if (navigator.share) {
      navigator.share({ title: stopName, url })
    } else {
      navigator.clipboard.writeText(url)
      showToast(t('map.stopDetail.linkCopied'))
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
          {stop.googleMapsError ? (
            <div className={styles.badgeWarn}>⚠ {t('map.stopDetail.googleMapsWrong')}</div>
          ) : stop.coordinatesApproximate ? (
            <div className={styles.badgeApprox}>~ {t('map.stopDetail.coordsApproximate')}</div>
          ) : (
            <div className={styles.badgeOk}>✓ {t('map.stopDetail.gpsVerified')}</div>
          )}
          {stop.courses && !stop.courses.includes('A') && (
            <div className={styles.badgeCourse}>{t('map.stopDetail.bCourseOnly')}</div>
          )}
          <button
            className={styles.copyBtn}
            onClick={handleCopyCoords}
            aria-label={t('map.stopDetail.copyCoords')}
            title={t('map.stopDetail.copyCoords')}
          >
            ⎘ {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
          </button>
        </div>
      </div>
      {userLocation && (() => {
        const { meters, minutes } = getWalkingEstimate(userLocation[1], userLocation[0], stop.lat, stop.lng)
        return (
          <div className={styles.walkingInfo}>
            <span className={styles.walkingIcon}>🚶</span>
            <span className={styles.walkingDist}>{meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`}</span>
            <span className={styles.walkingSep}>·</span>
            <span className={styles.walkingTime}>{t('map.walkMin', { min: minutes })}</span>
          </div>
        )
      })()}
      {/* Photo section */}
      <div className={styles.photoSection}>
        {stop.photos && stop.photos.length > 0 ? (
          <img
            src={stop.photos[0]}
            alt={`${stopName} 정류장`}
            className={styles.photo}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <img
              src="/images/stops/placeholder.svg"
              alt="Photo coming soon"
              className={styles.placeholderImg}
            />
          </div>
        )}
      </div>
      {stop.destinations.length > 0 && (
        <div className={styles.destinations}>
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
      {stop.schedule && (() => {
        const deps = stop.schedule.departures
        const hasExactTimes = deps.length > 0
        return (
          <div className={styles.scheduleSection}>
            <div className={styles.scheduleSectionLabel}>{t('map.schedule')}</div>
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
                  {t('map.frequency', { count: deps.length })}
                </div>
              </>
            )}
            <div className={styles.scheduleNote}>
              {stop.schedule.operatingNote[lang]}
            </div>
          </div>
        )
      })()}
      <div className={styles.mapsSection}>
        <div className={styles.mapsSectionLabel}>{t('map.stopDetail.openInMaps')}</div>
        <div className={styles.mapsButtons}>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mapBtn}
          >
            {t('map.stopDetail.googleMaps')} ↗
          </a>
          {isIOS && (
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapBtn}
            >
              {t('map.stopDetail.appleMaps')} ↗
            </a>
          )}
        </div>
      </div>
      <div className={styles.disclaimer}>{t('map.stopDetail.disclaimer')}</div>
      {toast && (
        <div className={styles.toast} key={toastKey}>
          {toast}
        </div>
      )}
      {showQR && <QRModal routeId={routeId} stop={stop} onClose={() => setShowQR(false)} />}
    </div>
  )
}
