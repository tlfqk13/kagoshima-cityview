'use client'
import { useTranslation } from 'react-i18next'
import type { BusStop, Lang } from '@/lib/stops'
import styles from './StopList.module.css'

interface Props {
  stops: BusStop[]
  selectedId: string | null
  onSelect: (stop: BusStop) => void
}

export default function StopList({ stops, selectedId, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as Lang

  if (stops.length === 0) {
    return <p className={styles.empty}>{t('map.noStops')}</p>
  }

  return (
    <ul className={styles.list}>
      {stops.map(stop => (
        <li
          key={stop.id}
          className={`${styles.item} ${stop.id === selectedId ? styles.on : ''}`}
          onClick={() => onSelect(stop)}
        >
          <div className={styles.num}>{stop.number}</div>
          <div className={styles.info}>
            <div className={styles.name}>{stop.name[lang]}</div>
            {stop.googleMapsError && (
              <div className={styles.warn}>⚠ {t('map.stopDetail.googleMapsWrong')}</div>
            )}
          </div>
          <span className={styles.chevron} aria-hidden="true">›</span>
        </li>
      ))}
    </ul>
  )
}
