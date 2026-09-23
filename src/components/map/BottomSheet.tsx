'use client'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteStop, RouteId, Category } from '@/lib/routes'
import StopList from './StopList'
import StopDetail from './StopDetail'
import type { HotelStops } from '@/lib/hotels'
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
  onClearSelection: () => void
  onCategoryChange: (cat: Category | null) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  userLocation?: [number, number] | null
  favorites?: string[]
  onToggleFavorite?: (stopId: string) => void
  sourceNote: string
  /** 목록 위에 고정으로 보여줄 내용 (호텔 모드 배너 등) */
  header?: ReactNode
  hotelStops?: HotelStops | null
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
  onClearSelection,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  userLocation,
  favorites,
  onToggleFavorite,
  sourceNote,
  header,
  hotelStops,
}: Props) {
  const [state, setState] = useState<SheetState>(selectedStop ? 'half' : 'peek')
  const [previousStopId, setPreviousStopId] = useState(selectedStop?.id)
  const dragStartY = useRef(0)
  const { t } = useTranslation()

  if (previousStopId !== selectedStop?.id) {
    setPreviousStopId(selectedStop?.id)
    if (selectedStop) setState('half')
  }

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
      role="complementary"
      aria-label={t('map.stopListAria')}
    >
      <button
        type="button"
        className={styles.handle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setState(prev => prev === 'peek' ? 'half' : 'peek')}
        aria-label={state === 'peek' ? t('map.sheetExpand') : t('map.sheetCollapse')}
        aria-expanded={state !== 'peek'}
      />
      <div className={styles.content}>
        {/* 상세를 볼 때는 필터·검색을 숨겨 시간표가 첫 화면에 들어오게 한다 */}
        {!selectedStop && (
          <>
            <CategoryChips active={activeCategory} onChange={onCategoryChange} />
            <StopSearch value={searchQuery} onChange={onSearchChange} />
          </>
        )}
        {selectedStop ? (
          <>
          <button type="button" className={styles.back} onClick={onClearSelection}>
            ← {t('map.backToList')}
          </button>
          {header}
          <StopDetail
            routeId={routeId}
            stop={selectedStop}
            userLocation={userLocation}
            isFavorite={favorites?.includes(selectedStop.id)}
            onToggleFavorite={onToggleFavorite}
            hotelStops={hotelStops}
          />
          </>
        ) : (
          <>
          {header}
          {stops.length === 0 ? (
            <div className={styles.empty}>{t('map.noResults')}</div>
          ) : (
            <StopList stops={stops} selectedId={null} onSelect={onStopSelect} favorites={favorites} />
          )}
          </>
        )}
        <div className={styles.attribution}>{sourceNote}</div>
      </div>
    </div>
  )
}
