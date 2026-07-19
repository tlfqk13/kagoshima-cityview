'use client'
import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { getStopsForRoute, getStopsByCategory, getRoute, type RouteStop, type RouteId, type Category } from '@/lib/routes'
import { getFavorites, toggleFavorite } from '@/lib/favorites'
import type { MapCanvasProps } from '@/components/map/MapCanvas'
import Nav from '@/components/Nav'
import RouteTab from '@/components/map/RouteTab'
import SidePanel from '@/components/map/SidePanel'
import BottomSheet from '@/components/map/BottomSheet'
import CategoryChips from '@/components/map/CategoryChips'
import styles from './MapPage.module.css'

const MapCanvas = dynamic<MapCanvasProps>(() => import('@/components/map/MapCanvas'), { ssr: false })

interface Props {
  initialStopId?: string
  initialRouteId?: RouteId
}

export default function MapPage({ initialStopId, initialRouteId = 'cityview' }: Props) {
  const { t } = useTranslation()
  const [activeRoute, setActiveRoute] = useState<RouteId>(initialRouteId)
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(() => {
    if (!initialStopId) return null
    return getStopsForRoute(initialRouteId).find(s => s.id === initialStopId) ?? null
  })
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  function handleToggleFavorite(stopId: string) {
    setFavorites(toggleFavorite(stopId))
  }

  function handleRouteChange(routeId: RouteId) {
    setActiveRoute(routeId)
    setSelectedStop(null)
    setActiveCategory('all')
    setSearchQuery('')
  }

  const filteredStops = useMemo(() => {
    let stops =
      activeCategory === 'all'
        ? getStopsForRoute(activeRoute)
        : getStopsByCategory(activeRoute, activeCategory as Category)
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
    // Favorites first
    return [...stops].sort((a, b) => {
      const aFav = favorites.includes(a.id) ? -1 : 0
      const bFav = favorites.includes(b.id) ? -1 : 0
      return aFav - bFav
    })
  }, [activeRoute, activeCategory, searchQuery, favorites])

  const routeMeta = getRoute(activeRoute)
  // 실측 노선은 실측일 + "검증" 표기, 미실측 노선은 대조일 + "확인" 표기
  // islandview는 좌표 출처가 OpenStreetMap(ODbL)이라 attribution 병기 (ISS-002)
  const sourceNote = activeRoute === 'islandview'
    ? t('map.sourceNoteOsm', { date: routeMeta.lastSourceCheckedAt })
    : routeMeta.lastFieldVerifiedAt
      ? t('map.sourceNote', { date: routeMeta.lastFieldVerifiedAt })
      : t('map.sourceNoteChecked', { date: routeMeta.lastSourceCheckedAt })

  function handleCategoryChange(cat: Category | null) {
    setActiveCategory(cat ?? 'all')
  }

  return (
    <div className={styles.wrap}>
      <Nav />
      <RouteTab activeRoute={activeRoute} onChange={handleRouteChange} />
      <div className={styles.body}>
        {/* 지도 영역 */}
        <div className={styles.mapWrap}>
          {/* 카테고리 칩 (데스크톱) */}
          <div className={styles.chips}>
            <CategoryChips active={activeCategory} onChange={handleCategoryChange} />
          </div>
          <MapCanvas
            routeId={activeRoute}
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
            routeId={activeRoute}
            onSelect={setSelectedStop}
            sourceNote={sourceNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            userLocation={userLocation}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        {/* 모바일 바텀시트 */}
        <div className={styles.mobile}>
          <BottomSheet
            stops={filteredStops}
            selectedStop={selectedStop}
            routeId={activeRoute}
            activeCategory={activeCategory}
            onStopSelect={setSelectedStop}
            onCategoryChange={handleCategoryChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            userLocation={userLocation}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            sourceNote={sourceNote}
          />
        </div>
      </div>
    </div>
  )
}
