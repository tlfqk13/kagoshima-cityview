'use client'
import { useTranslation } from 'react-i18next'
import type { BusStop, Lang } from '@/lib/stops'
import styles from './StopDetail.module.css'

interface Props {
  stop: BusStop
}

export default function StopDetail({ stop }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as Lang

  const altNames = (['ko', 'en', 'ja'] as Lang[])
    .filter(l => l !== lang)
    .map(l => stop.name[l])
    .join('  /  ')

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.num}>No. {stop.number}</div>
        <div className={styles.name}>{stop.name[lang]}</div>
        <div className={styles.nameAlt}>{altNames}</div>
        {stop.googleMapsError ? (
          <div className={styles.badgeWarn}>⚠ {t('map.stopDetail.googleMapsWrong')}</div>
        ) : (
          <div className={styles.badgeOk}>✓ {t('map.stopDetail.gpsVerified')}</div>
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
      <div className={styles.disclaimer}>{t('map.stopDetail.disclaimer')}</div>
    </div>
  )
}
