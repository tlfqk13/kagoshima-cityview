'use client'
import { useTranslation } from 'react-i18next'
import type { RouteStop, RouteId } from '@/lib/routes'
import StopList from './StopList'
import StopDetail from './StopDetail'
import StopSearch from './StopSearch'
import styles from './SidePanel.module.css'

interface Props {
  stops: RouteStop[]
  selectedStop: RouteStop | null
  routeId: RouteId
  onSelect: (stop: RouteStop) => void
  sourceNote: string
  searchQuery: string
  onSearchChange: (v: string) => void
  userLocation?: [number, number] | null
  favorites?: string[]
  onToggleFavorite?: (stopId: string) => void
}

export default function SidePanel({ stops, selectedStop, routeId, onSelect, sourceNote, searchQuery, onSearchChange, userLocation, favorites, onToggleFavorite }: Props) {
  const { t } = useTranslation()
  return (
    <aside className={styles.panel}>
      {selectedStop && (
        <StopDetail
          routeId={routeId}
          stop={selectedStop}
          userLocation={userLocation}
          isFavorite={favorites?.includes(selectedStop.id)}
          onToggleFavorite={onToggleFavorite}
        />
      )}
      <StopSearch value={searchQuery} onChange={onSearchChange} />
      {stops.length === 0 ? (
        <div className={styles.empty}>{t('map.noResults')}</div>
      ) : (
        <StopList
          stops={stops}
          selectedId={selectedStop?.id ?? null}
          onSelect={onSelect}
          favorites={favorites}
        />
      )}
      <div className={styles.note}>{sourceNote}</div>
    </aside>
  )
}
