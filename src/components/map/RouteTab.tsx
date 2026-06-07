'use client'
import { useTranslation } from 'react-i18next'
import { isRouteAvailableToday, ROUTE_ORDER, type RouteId } from '@/lib/routes'
import styles from './RouteTab.module.css'

const ROUTE_ICONS: Record<RouteId, string> = {
  cityview: '🚌',
  'cityview-night': '🌙',
  islandview: '🌋',
}

interface Props {
  activeRoute: RouteId
  onChange: (route: RouteId) => void
}

export default function RouteTab({ activeRoute, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Route selector">
      {ROUTE_ORDER.map(routeId => {
        const isNight = routeId === 'cityview-night'
        const availableToday = isNight ? isRouteAvailableToday(routeId) : true
        return (
          <button
            key={routeId}
            role="tab"
            aria-selected={activeRoute === routeId}
            className={[
              styles.tab,
              activeRoute === routeId ? styles.active : '',
              isNight && !availableToday ? styles.dimmed : '',
            ].join(' ')}
            onClick={() => onChange(routeId)}
          >
            <span className={styles.icon}>{ROUTE_ICONS[routeId]}</span>
            <span className={styles.label}>{t(`routes.${routeId}.name`)}</span>
            {isNight && availableToday && <span className={styles.badge}>TODAY</span>}
            {isNight && !availableToday && <span className={styles.badgeMuted}>{t('routes.saturdayOnly')}</span>}
          </button>
        )
      })}
    </div>
  )
}
