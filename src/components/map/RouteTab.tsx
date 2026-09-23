'use client'
import { useTranslation } from 'react-i18next'
import { isRouteAvailableToday, ROUTE_ORDER, type RouteId } from '@/lib/routes'
import { IconBus, IconMoon, IconVolcano } from '@/components/icons'
import styles from './RouteTab.module.css'

const ROUTE_ICONS: Record<RouteId, typeof IconBus> = {
  cityview: IconBus,
  'cityview-night': IconMoon,
  islandview: IconVolcano,
}

interface Props {
  activeRoute: RouteId
  onChange: (route: RouteId) => void
}

export default function RouteTab({ activeRoute, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('map.routeSelector')}>
    <div className={styles.tabBar} role="tablist" aria-label={t('map.routeSelector')}>
      {ROUTE_ORDER.map(routeId => {
        const isNight = routeId === 'cityview-night'
        const availableToday = isNight ? isRouteAvailableToday(routeId) : true
        const Icon = ROUTE_ICONS[routeId]
        return (
          <button
            key={routeId}
            type="button"
            role="tab"
            aria-selected={activeRoute === routeId}
            className={[
              styles.tab,
              activeRoute === routeId ? styles.active : '',
              isNight && !availableToday ? styles.dimmed : '',
            ].join(' ')}
            onClick={() => onChange(routeId)}
          >
            <Icon size={16} className={styles.icon} />
            <span className={styles.label}>{t(`routes.${routeId}.name`)}</span>
            {isNight && availableToday && <span className={styles.badge}>TODAY</span>}
            {isNight && !availableToday && <span className={styles.badgeMuted}>{t('routes.saturdayOnly')}</span>}
          </button>
        )
      })}
    </div>
    </nav>
  )
}
