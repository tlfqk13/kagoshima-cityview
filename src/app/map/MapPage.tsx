'use client'
import { useState, useMemo, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
import { getStopsForRoute, getStopsByCategory, getRoute, DATA_LANGS, type Lang, type RouteStop, type RouteId, type Category } from '@/lib/routes'
import { getFavorites, toggleFavorite, subscribeFavorites, getServerFavorites } from '@/lib/favorites'
import { findHotel, getHotelStops } from '@/lib/hotels'
import HotelBanner from '@/components/map/HotelBanner'
import type { MapCanvasProps } from '@/components/map/MapCanvas'
import Nav from '@/components/Nav'
import RouteTab from '@/components/map/RouteTab'
import SidePanel from '@/components/map/SidePanel'
import BottomSheet from '@/components/map/BottomSheet'
import CategoryChips from '@/components/map/CategoryChips'
import styles from './MapPage.module.css'

import MapLoading from '@/components/map/MapLoading'

// Mapbox 번들(약 700KB)이 도착하기 전에도 같은 로딩 자리를 보여준다
const MapCanvas = dynamic<MapCanvasProps>(() => import('@/components/map/MapCanvas'), { ssr: false, loading: () => <MapLoading /> })

interface Props {
  initialStopId?: string
  initialRouteId?: RouteId
  /** 호텔 POP의 QR로 들어온 경우(/map?hotel=slug). 호텔 핀·도보 경로·타는/내리는 정류장을 보여준다 */
  initialHotelSlug?: string
}

export default function MapPage({ initialStopId, initialRouteId = 'cityview', initialHotelSlug }: Props) {
  const { t } = useTranslation()
  // 호텔 모드는 시티뷰 노선에서만 유효하다 (호텔 데이터가 시티뷰 정류장 기준)
  const hotel = initialRouteId === 'cityview' ? findHotel(initialHotelSlug) : undefined
  const hotelStops = useMemo(() => (hotel ? getHotelStops(hotel) : null), [hotel])
  const [activeRoute, setActiveRoute] = useState<RouteId>(initialRouteId)
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(() => {
    const stopId = initialStopId ?? hotelStops?.board.id
    if (!stopId) return null
    return getStopsForRoute(initialRouteId).find(s => s.id === stopId) ?? null
  })
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const favorites = useSyncExternalStore(subscribeFavorites, getFavorites, getServerFavorites)

  function handleToggleFavorite(stopId: string) {
    toggleFavorite(stopId)
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
        const matches = (name: Record<Lang, string>) => DATA_LANGS.some(key => name[key].toLowerCase().includes(q))
        const nameMatch = matches(stop.name)
        const destMatch = stop.destinations.some(d => matches(d.name))
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
  // islandview 정류장은 GTFS, 도로 형상은 OpenStreetMap(ODbL)이므로 출처를 구분한다.
  const sourceNote = activeRoute === 'islandview'
    ? t('map.sourceNoteOsm', { date: routeMeta.lastSourceCheckedAt })
    : routeMeta.lastFieldVerifiedAt
      ? t('map.sourceNote', { date: routeMeta.lastFieldVerifiedAt })
      : t('map.sourceNoteChecked', { date: routeMeta.lastSourceCheckedAt })

  // 호텔 모드는 시티뷰 탭에서만 보인다
  const hotelActive = hotel && hotelStops && activeRoute === 'cityview'
  const hotelHeader = hotelActive ? (
    <HotelBanner hotel={hotel} hotelStops={hotelStops} selectedStopId={selectedStop?.id ?? null} onSelect={setSelectedStop} />
  ) : null

  function handleCategoryChange(cat: Category | null) {
    setActiveCategory(cat ?? 'all')
    setSelectedStop(null)
  }

  function handleSearchChange(query: string) {
    setSearchQuery(query)
    setSelectedStop(null)
  }

  return (
    <div className={styles.wrap}>
      <Nav />
      <RouteTab activeRoute={activeRoute} onChange={handleRouteChange} />
      <main className={styles.body}>
        <h1 className="sr-only">{t(`routes.${activeRoute}.name`)} — {t('map.pageTitle')}</h1>
        {/* 지도 영역 */}
        <div className={styles.mapWrap}>
          {/* 카테고리 칩 (데스크톱) */}
          <div className={styles.chips}>
            <CategoryChips active={activeCategory} onChange={handleCategoryChange} floating />
          </div>
          <MapCanvas
            routeId={activeRoute}
            selectedStopId={selectedStop?.id ?? null}
            onStopSelect={setSelectedStop}
            onUserLocation={setUserLocation}
            userLocation={userLocation}
            hotel={hotelActive ? { lng: hotel.lng, lat: hotel.lat, label: hotel.nameJa } : null}
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
            onSearchChange={handleSearchChange}
            userLocation={userLocation}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            header={hotelHeader}
            hotelStops={hotelActive ? hotelStops : null}
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
            onClearSelection={() => setSelectedStop(null)}
            onCategoryChange={handleCategoryChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            userLocation={userLocation}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            sourceNote={sourceNote}
            header={hotelHeader}
            hotelStops={hotelActive ? hotelStops : null}
          />
        </div>
      </main>
    </div>
  )
}
