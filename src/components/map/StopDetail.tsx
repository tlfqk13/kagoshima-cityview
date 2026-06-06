'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BusStop, Lang } from '@/lib/stops'
import styles from './StopDetail.module.css'

const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

interface Props {
  stop: BusStop
}

export default function StopDetail({ stop }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as Lang
  const [toast, setToast] = useState<string | null>(null)

  const stopName = stop.name[lang]

  const altNames = (['ko', 'en', 'ja'] as Lang[])
    .filter(l => l !== lang)
    .map(l => stop.name[l])
    .join('  /  ')

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  function handleCopyCoords() {
    navigator.clipboard.writeText(`${stop.lat}, ${stop.lng}`)
    showToast(t('map.stopDetail.coordsCopied'))
  }

  function handleShare() {
    const url = `${window.location.origin}/map/${stop.id}`
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
        </div>
        <div className={styles.name}>{stopName}</div>
        <div className={styles.nameAlt}>{altNames}</div>
        <div className={styles.badgeRow}>
          {stop.googleMapsError ? (
            <div className={styles.badgeWarn}>⚠ {t('map.stopDetail.googleMapsWrong')}</div>
          ) : (
            <div className={styles.badgeOk}>✓ {t('map.stopDetail.gpsVerified')}</div>
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
        <div className={styles.toast} key={toast + Date.now()}>
          {toast}
        </div>
      )}
    </div>
  )
}
