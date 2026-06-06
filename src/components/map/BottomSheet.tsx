'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BusStop, Category } from '@/lib/stops'
import StopList from './StopList'
import StopDetail from './StopDetail'
import CategoryChips from './CategoryChips'
import StopSearch from './StopSearch'
import styles from './BottomSheet.module.css'

type SheetState = 'peek' | 'half' | 'full'

interface Props {
  stops: BusStop[]
  selectedStop: BusStop | null
  activeCategory: Category | 'all'
  onStopSelect: (stop: BusStop) => void
  onCategoryChange: (cat: Category | null) => void
  searchQuery: string
  onSearchChange: (v: string) => void
  userLocation?: [number, number] | null
}

const HEIGHTS: Record<SheetState, string> = {
  peek: '80px',
  half: '50dvh',
  full: '85dvh',
}

export default function BottomSheet({
  stops,
  selectedStop,
  activeCategory,
  onStopSelect,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  userLocation,
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
      aria-label="정류장 목록"
    >
      <div
        className={styles.handle}
        onClick={() => setState(prev => prev === 'peek' ? 'half' : 'peek')}
        role="button"
        aria-label={state === 'peek' ? '목록 펼치기' : '목록 접기'}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setState(prev => prev === 'peek' ? 'half' : 'peek')}
      />
      <div className={styles.content}>
        <CategoryChips active={activeCategory} onChange={onCategoryChange} />
        <StopSearch value={searchQuery} onChange={onSearchChange} />
        {selectedStop ? (
          <StopDetail stop={selectedStop} userLocation={userLocation} />
        ) : stops.length === 0 ? (
          <div className={styles.empty}>{t('map.noResults')}</div>
        ) : (
          <StopList stops={stops} selectedId={null} onSelect={onStopSelect} />
        )}
      </div>
    </div>
  )
}
