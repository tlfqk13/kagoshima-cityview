'use client'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteStop, RouteId } from '@/lib/routes'
import StopList from './StopList'
import StopDetail from './StopDetail'
import type { HotelStops } from '@/lib/hotels'
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
  /** 목록 위에 고정으로 보여줄 내용 (호텔 모드 배너 등) */
  header?: ReactNode
  hotelStops?: HotelStops | null
}

export default function SidePanel({ stops, selectedStop, routeId, onSelect, sourceNote, searchQuery, onSearchChange, userLocation, favorites, onToggleFavorite, header, hotelStops }: Props) {
  const { t } = useTranslation()
  return (
    <aside className={styles.panel}>
      {/* 검색은 항상 맨 위 — 상세를 보는 중에도 다른 정류장을 바로 찾을 수 있게 */}
      <StopSearch value={searchQuery} onChange={onSearchChange} />
      <div className={styles.scroll}>
        {header}
        {selectedStop && (
          <>
            <StopDetail
              routeId={routeId}
              stop={selectedStop}
              userLocation={userLocation}
              isFavorite={favorites?.includes(selectedStop.id)}
              onToggleFavorite={onToggleFavorite}
              hotelStops={hotelStops}
            />
            <h2 className={styles.listHeading}>{t('map.allStops')}</h2>
          </>
        )}
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
      </div>
      <div className={styles.note}>{sourceNote}</div>
    </aside>
  )
}
