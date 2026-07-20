'use client'
import { useTranslation } from 'react-i18next'
import type { RouteStop as BusStop, Lang, Category } from '@/lib/routes'
import styles from './DestinationCards.module.css'

interface Props {
  stops: BusStop[]
  category: Category | null
  onStopSelect: (stop: BusStop) => void
}

export default function DestinationCards({ stops, category, onStopSelect }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ja') as Lang

  const items = stops.flatMap(stop =>
    stop.destinations
      .filter(d => !category || d.category === category)
      .map(dest => ({ dest, stop }))
  )

  if (items.length === 0) {
    return <div className={styles.wrap}><p className={styles.empty}>{t('map.noStops')}</p></div>
  }

  return (
    <div className={styles.wrap}>
      {items.map(({ dest, stop }) => (
        <div
          key={dest.id}
          className={styles.card}
          onClick={() => onStopSelect(stop)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onStopSelect(stop)}
        >
          <div className={styles.cardName}>{dest.name[lang]}</div>
          <div className={styles.cardMeta}>
            {stop.name[lang]} · {t('map.stopDetail.walkTime', { min: dest.walkMinutes })}
          </div>
        </div>
      ))}
    </div>
  )
}
