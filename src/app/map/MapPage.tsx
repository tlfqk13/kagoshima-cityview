'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getAllStops, getStopsByCategory, getMetadata, type BusStop, type Category } from '@/lib/stops'
import { useTranslation } from 'react-i18next'
import Nav from '@/components/Nav'
import SidePanel from '@/components/map/SidePanel'
import BottomSheet from '@/components/map/BottomSheet'
import CategoryChips from '@/components/map/CategoryChips'
import styles from './MapPage.module.css'

const MapCanvas = dynamic(() => import('@/components/map/MapCanvas'), { ssr: false })

interface Props {
  initialStopId?: string
}

export default function MapPage({ initialStopId }: Props) {
  const { i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as 'ko' | 'en' | 'ja'

  const [selectedStop, setSelectedStop] = useState<BusStop | null>(() => {
    if (!initialStopId) return null
    return getAllStops().find(s => s.id === initialStopId) ?? null
  })
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')

  const filteredStops = useMemo(() => {
    if (activeCategory === 'all') return getAllStops()
    return getStopsByCategory(activeCategory as Category)
  }, [activeCategory])

  const meta = getMetadata()
  const sourceNote = `データ提供：鹿児島市 · ${meta.lastValidatedAt} 검증`

  function handleCategoryChange(cat: Category | null) {
    setActiveCategory(cat ?? 'all')
  }

  return (
    <div className={styles.wrap}>
      <Nav />
      <div className={styles.body}>
        {/* 지도 영역 */}
        <div className={styles.mapWrap}>
          {/* 카테고리 칩 (데스크톱) */}
          <div className={styles.chips}>
            <CategoryChips active={activeCategory} onChange={handleCategoryChange} />
          </div>
          <MapCanvas
            selectedStopId={selectedStop?.id ?? null}
            onStopSelect={setSelectedStop}
          />
        </div>

        {/* 데스크톱 사이드패널 */}
        <div className={styles.side}>
          <SidePanel
            stops={filteredStops}
            selectedStop={selectedStop}
            onSelect={setSelectedStop}
            sourceNote={sourceNote}
          />
        </div>

        {/* 모바일 바텀시트 */}
        <div className={styles.mobile}>
          <BottomSheet
            stops={filteredStops}
            selectedStop={selectedStop}
            activeCategory={activeCategory}
            onStopSelect={setSelectedStop}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </div>
    </div>
  )
}
