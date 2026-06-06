'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getAllStops, getStopsByCategory, getMetadata, type BusStop, type Category } from '@/lib/stops'
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
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(() => {
    if (!initialStopId) return null
    return getAllStops().find(s => s.id === initialStopId) ?? null
  })
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  const filteredStops = useMemo(() => {
    let stops = activeCategory === 'all' ? getAllStops() : getStopsByCategory(activeCategory as Category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      stops = stops.filter(stop => {
        const nameMatch =
          stop.name.ko.toLowerCase().includes(q) ||
          stop.name.en.toLowerCase().includes(q) ||
          stop.name.ja.toLowerCase().includes(q)
        const destMatch = stop.destinations.some(d =>
          d.name.ko.toLowerCase().includes(q) ||
          d.name.en.toLowerCase().includes(q) ||
          d.name.ja.toLowerCase().includes(q)
        )
        return nameMatch || destMatch
      })
    }
    return stops
  }, [activeCategory, searchQuery])

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
            onUserLocation={setUserLocation}
            userLocation={userLocation}
          />
        </div>

        {/* 데스크톱 사이드패널 */}
        <div className={styles.side}>
          <SidePanel
            stops={filteredStops}
            selectedStop={selectedStop}
            onSelect={setSelectedStop}
            sourceNote={sourceNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            userLocation={userLocation}
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
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            userLocation={userLocation}
          />
        </div>
      </div>
    </div>
  )
}
