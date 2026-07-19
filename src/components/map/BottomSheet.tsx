'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteStop, RouteId, Category } from '@/lib/routes'
import StopList from './StopList'
import StopDetail from './StopDetail'
import CategoryChips from './CategoryChips'
import StopSearch from './StopSearch'
import styles from './BottomSheet.module.css'

type SheetState = 'peek' | 'half' | 'full'

interface Props {
  stops: RouteStop[]
  selectedStop: RouteStop | null
  routeId: RouteId
  activeCategory: Category | 'all'
  onStopSelect: (stop: RouteStop) => void
  onCategoryChange: (cat: Category | null) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  userLocation?: [number, number] | null
  favorites?: string[]
  onToggleFavorite?: (stopId: string) => void
  sourceNote: string
}

const HEIGHTS: Record<SheetState, string> = {
  peek: '80px',
  half: '50dvh',
  full: '85dvh',
}

export default function BottomSheet({
  stops,
  selectedStop,
  routeId,
  activeCategory,
  onStopSelect,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  userLocation,
  favorites,
  onToggleFavorite,
  sourceNote,
}: Props) {
  const [state, setState] = useState<SheetState>('peek')
  const dragStartY = useRef(0)
  const { t } = useTranslation()

  useEffect(() => {
    if (selectedStop) setState('half')
  }, [selectedStop])

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dy = dragStartY.current - e.changedTouches[0].clientY
    if (dy > 50) {
      setState(prev => prev === 'peek' ? 'half' : 'full')
    } else if (dy < -50) {
      setState(prev => prev === 'full' ? 'half' : 'peek')
    }
  }

  return (
    <div
      className={styles.sheet}
      style={{ height: HEIGHTS[state] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="complementary"
      aria-label={t('map.stopListAria')}
    >
      <div
        className={styles.handle}
        onClick={() => setState(prev => prev === 'peek' ? 'half' : 'peek')}
        role="button"
        aria-label={state === 'peek' ? t('map.sheetExpand') : t('map.sheetCollapse')}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setState(prev => prev === 'peek' ? 'half' : 'peek')}
      />
      <div className={styles.content}>
        <CategoryChips active={activeCategory} onChange={onCategoryChange} />
        <StopSearch value={searchQuery} onChange={onSearchChange} />
        {selectedStop ? (
          <StopDetail
            routeId={routeId}
            stop={selectedStop}
            userLocation={userLocation}
            isFavorite={favorites?.includes(selectedStop.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ) : stops.length === 0 ? (
          <div className={styles.empty}>{t('map.noResults')}</div>
        ) : (
          <StopList stops={stops} selectedId={null} onSelect={onStopSelect} favorites={favorites} />
        )}
        <div className={styles.attribution}>{sourceNote}</div>
      </div>
    </div>
  )
}
