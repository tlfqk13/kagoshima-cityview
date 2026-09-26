'use client'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import MapLoading from './MapLoading'
import { track } from '@/lib/analytics/track'
import { distanceBand } from '@/lib/analytics/events'
import { distanceMeters } from '@/lib/hotels'
import {
  getStopsForRoute, getStopsGeoJSON, getRouteCoordinates, getRoute,
  getNearestStop, getGroupedStops, nameKey, type RouteStop, type RouteId,
} from '@/lib/routes'
import { useResolvedTheme } from '@/lib/useResolvedTheme'
import { IconCity, IconMap, IconMoon, IconPause, IconPlay, IconSatellite } from '@/components/icons'
import styles from './MapCanvas.module.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type MapStyle = 'light' | 'streets' | 'satellite' | 'dark'

// 기본은 회색조(light) — 바탕 지도가 조용해야 갈색 노선·파란 도보 경로가 "우리 층"으로 읽힌다
const MAP_STYLES: Record<MapStyle, string> = {
  light: 'mapbox://styles/mapbox/light-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
}

const STYLE_ICONS: Record<MapStyle, typeof IconMap> = {
  light: IconMap,
  streets: IconCity,
  satellite: IconSatellite,
  dark: IconMoon,
}

const STYLE_LABEL_KEYS: Record<MapStyle, string> = {
  light: 'map.styleLight',
  streets: 'map.styleStreets',
  satellite: 'map.styleSatellite',
  dark: 'map.styleDark',
}

// 모바일(바텀시트) 전환점 — 디자인 시스템 공통 기준
const MOBILE_QUERY = '(max-width: 1023px)'

/** 구글 위치 표시는 이 줌부터 */
const GHOST_MIN_ZOOM = 15.5

const STYLE_ORDER: MapStyle[] = ['light', 'streets', 'satellite', 'dark']

function interpolateRoute(coords: [number, number][], t: number): [number, number] {
  if (t <= 0) return coords[0]
  if (t >= 1) return coords[coords.length - 1]

  const lengths: number[] = [0]
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i - 1][0]
    const dy = coords[i][1] - coords[i - 1][1]
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalLength = lengths[lengths.length - 1]
  const targetLength = t * totalLength

  for (let i = 1; i < coords.length; i++) {
    if (lengths[i] >= targetLength) {
      const segFraction = (targetLength - lengths[i - 1]) / (lengths[i] - lengths[i - 1])
      return [
        coords[i - 1][0] + segFraction * (coords[i][0] - coords[i - 1][0]),
        coords[i - 1][1] + segFraction * (coords[i][1] - coords[i - 1][1]),
      ]
    }
  }
  return coords[coords.length - 1]
}

/** 이 줌부터 방향별 정류장 쌍(天文館 No.3·No.19 등)을 따로 찍는다. 그 아래에서는 "3·19" 마커 하나 */
const SPLIT_ZOOM = 16.3
type Band = 'far' | 'near'
const BANDS: Band[] = ['far', 'near']
const STOP_LAYERS = BANDS.flatMap(b => [`stops-${b}-label`, `stops-${b}-selected-halo`, `stops-${b}-circle`])
const STOP_CIRCLE_LAYERS = BANDS.map(b => `stops-${b}-circle`)

function clearMapLayers(map: mapboxgl.Map) {
  for (const id of [...STOP_LAYERS, 'route-line', 'route-line-casing', 'nearby-hotels']) if (map.getLayer(id)) map.removeLayer(id)
  for (const id of ['stops-far', 'stops-near', 'route', 'nearby-hotels']) if (map.getSource(id)) map.removeSource(id)
}

// 선택 판정 — 마커가 대표하는 id 목록(ids)에 선택 id가 들어 있으면 선택. 빈 문자열은 모든 문자열에 포함되므로 막는다
function isSelected(selectedId: string | null) {
  return ['in', selectedId || '__none__', ['get', 'ids']]
}

// 선택 정류장은 크게, 묶인 마커·구글맵 오류 정류장은 약간 크게
function circleRadius(selectedId: string | null) {
  return ['case', isSelected(selectedId), 14, ['get', 'merged'], 11, 9] as unknown as number
}

// 정류장은 두 상태뿐 — 기본은 흰 바탕에 노선색 테두리·숫자, 선택은 노선색 채움에 흰 숫자.
// 구글맵 오차는 상세 패널 배지로 알리고 마커 색으로는 구분하지 않는다(여행자에게는 "다른 종류의 정류장"으로 읽힌다)
function circleColor(selectedId: string | null, routeColor: string) {
  return ['case', isSelected(selectedId), routeColor, '#FFFFFF'] as unknown as string
}

function labelColor(selectedId: string | null, routeColor: string) {
  return ['case', isSelected(selectedId), '#FFFFFF', routeColor] as unknown as string
}

function labelSize(selectedId: string | null) {
  return ['case', isSelected(selectedId), 13, ['get', 'merged'], 10.5, 10] as unknown as number
}

// 선택 변경 시 두 줌 구간의 레이어에 같은 스타일을 적용한다
function applySelection(map: mapboxgl.Map, selectedId: string | null, routeColor: string) {
  for (const b of BANDS) {
    if (!map.getLayer(`stops-${b}-circle`)) continue
    map.setPaintProperty(`stops-${b}-circle`, 'circle-color', circleColor(selectedId, routeColor))
    map.setPaintProperty(`stops-${b}-circle`, 'circle-radius', circleRadius(selectedId))
    map.setLayoutProperty(`stops-${b}-label`, 'text-size', labelSize(selectedId))
    map.setPaintProperty(`stops-${b}-label`, 'text-color', labelColor(selectedId, routeColor))
    map.setFilter(`stops-${b}-selected-halo`, isSelected(selectedId) as unknown as mapboxgl.FilterSpecification)
  }
}

function addMapLayers(map: mapboxgl.Map, selectedId: string | null, routeId: RouteId, course: 'A' | 'B', darkBase = false) {
  const stops = getStopsForRoute(routeId)
  const routeCoords = getRouteCoordinates(routeId, course)
  const routeColor = getRoute(routeId).color

  // 노선 폴리라인
  if (!map.getSource('route')) {
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: routeCoords },
        properties: {},
      },
    })
  }
  // 도보 경로와 같은 문법(테두리 + 본선)으로, 바탕 지도의 도로보다 위 층으로 읽히게 한다
  if (!map.getLayer('route-line-casing')) {
    map.addLayer({
      id: 'route-line-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': darkBase ? '#0F0E0C' : '#FFFFFF', 'line-width': 8, 'line-opacity': 0.85 },
    })
  }
  if (!map.getLayer('route-line')) {
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': routeColor, 'line-width': 4.5, 'line-opacity': 1 },
    })
  }

  // 정류장 GeoJSON — 낮은 줌(far)은 30m 안의 쌍을 한 마커로, 높은 줌(near)은 따로. 같은 좌표(No.1·No.20)는 항상 하나
  if (!map.getSource('stops-far')) map.addSource('stops-far', { type: 'geojson', data: getStopsGeoJSON(stops, false) })
  if (!map.getSource('stops-near')) map.addSource('stops-near', { type: 'geojson', data: getStopsGeoJSON(stops, true) })

  for (const b of BANDS) {
    const source = `stops-${b}`
    const zoom = b === 'far' ? { maxzoom: SPLIT_ZOOM } : { minzoom: SPLIT_ZOOM }

    // 선택 정류장 강조 — 원 아래에 반투명 테를 깔아 현장에서 "여기"가 한눈에 보이게 한다
    if (!map.getLayer(`${source}-selected-halo`)) {
      map.addLayer({
        id: `${source}-selected-halo`,
        type: 'circle',
        source,
        ...zoom,
        filter: isSelected(selectedId) as unknown as mapboxgl.FilterSpecification,
        paint: {
          'circle-radius': 24,
          'circle-color': routeColor,
          'circle-opacity': 0.18,
          'circle-stroke-width': 2,
          'circle-stroke-color': routeColor,
          'circle-stroke-opacity': 0.9,
        },
      })
    }

    if (!map.getLayer(`${source}-circle`)) {
      map.addLayer({
        id: `${source}-circle`,
        type: 'circle',
        source,
        ...zoom,
        paint: {
          'circle-radius': circleRadius(selectedId),
          'circle-color': circleColor(selectedId, routeColor),
          'circle-stroke-width': ['case', isSelected(selectedId), 2, 2.5] as unknown as number,
          'circle-stroke-color': [
            'case',
            isSelected(selectedId), '#FFFFFF',
            ['get', 'coordinatesApproximate'], '#C87A3A',
            routeColor,
          ] as unknown as string,
          'circle-opacity': [
            'case',
            ['get', 'isBCourseOnly'], 0.55,
            0.9,
          ] as unknown as number,
        },
      })
    }

    if (!map.getLayer(`${source}-label`)) {
      map.addLayer({
        id: `${source}-label`,
        type: 'symbol',
        source,
        ...zoom,
        layout: {
          'text-field': ['get', 'label'] as unknown as string,
          'text-size': labelSize(selectedId),
          'text-allow-overlap': true,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': labelColor(selectedId, routeColor) },
      })
    }
  }
}

export interface MapCanvasProps {
  routeId: RouteId
  selectedStopId: string | null
  onStopSelect: (stop: RouteStop) => void
  onUserLocation?: (coords: [number, number]) => void
  userLocation?: [number, number] | null
  /** 호텔 모드 — 호텔 핀을 찍고, 현재 위치가 없을 때 도보 경로의 출발점으로 쓴다 */
  hotel?: { lng: number; lat: number; label: string } | null
  /** 선택 정류장 근처의 숙박시설 — 회색 점으로 찍고, 누르면 호텔 모드로 간다 */
  nearbyHotels?: { slug: string; lng: number; lat: number; label: string }[]
}

export default function MapCanvas({ routeId, selectedStopId, onStopSelect, onUserLocation, userLocation, hotel, nearbyHotels }: MapCanvasProps) {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const wrongPinRef = useRef<mapboxgl.Marker | null>(null)
  const hotelMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null)
  const selectedStopIdRef = useRef<string | null>(selectedStopId)
  const routeIdRef = useRef<RouteId>(routeId)
  const [styleRevision, setStyleRevision] = useState(0)
  const [ready, setReady] = useState(false) // 첫 타일이 그려질 때까지 로딩 자리를 보여준다
  const [course, setCourse] = useState<'A' | 'B'>('B')
  const courseRef = useRef<'A' | 'B'>('B')

  // 사용자가 스타일 버튼을 누르기 전에는 사이트 테마(라이트/다크)를 따른다
  const resolvedTheme = useResolvedTheme()
  const [userStyle, setUserStyle] = useState<MapStyle | null>(null)
  const mapStyle: MapStyle = userStyle ?? (resolvedTheme === 'dark' ? 'dark' : 'light')
  const mapStyleRef = useRef<MapStyle>(mapStyle)

  const [animating, setAnimating] = useState(false)
  const busMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const animStartRef = useRef<number>(0)

  // Keep refs in sync
  useEffect(() => {
    selectedStopIdRef.current = selectedStopId
  }, [selectedStopId])

  useEffect(() => {
    routeIdRef.current = routeId
  }, [routeId])

  useEffect(() => { courseRef.current = course }, [course])

  // 마커가 여러 정류장을 대표하면(No.1·No.20, 낮은 줌의 No.3·No.19) 누를 때마다 다음 정류장으로 넘어간다
  const handleStopClick = useCallback((ids: string) => {
    const list = ids.split(',')
    const idx = list.indexOf(selectedStopIdRef.current ?? '')
    const stopId = list[(idx + 1) % list.length]
    const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === stopId)
    if (stop) onStopSelect(stop)
  }, [onStopSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialRoute = getRoute(routeIdRef.current)
    const initialStop = getStopsForRoute(routeIdRef.current).find(stop => stop.id === selectedStopIdRef.current)
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[mapStyleRef.current],
      center: initialStop ? [initialStop.lng, initialStop.lat] : initialRoute.center,
      zoom: initialStop ? 15 : initialRoute.zoom,
      language: 'ja',
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    })
    map.addControl(geolocate, 'top-right')

    geolocate.on('geolocate', (e: unknown) => {
      const pos = e as GeolocationPosition
      const { latitude, longitude } = pos.coords
      const nearest = getNearestStop(routeIdRef.current, latitude, longitude)
      if (nearest) {
        onStopSelect(nearest)
        // 좌표는 보내지 않고 거리 구간만 — "정류장에서 얼마나 떨어진 곳에서 찾나"
        track('locate', { k: nearest.id, v: distanceBand(distanceMeters(latitude, longitude, nearest.lat, nearest.lng)), lang: i18n.language })
      }
      onUserLocation?.([longitude, latitude])
    })

    map.once('load', () => setReady(true))
    map.on('zoom', () => {
      const el = wrongPinRef.current?.getElement()
      if (el) el.hidden = map.getZoom() < GHOST_MIN_ZOOM
    })
    map.on('load', () => {
      addMapLayers(map, selectedStopIdRef.current, routeIdRef.current, courseRef.current, mapStyleRef.current === 'dark')

      // 클릭·호버 — 두 줌 구간의 원 레이어에 같이 건다
      for (const layer of STOP_CIRCLE_LAYERS) {
        map.on('click', layer, e => {
          const ids = e.features?.[0]?.properties?.ids
          if (ids) handleStopClick(String(ids))
        })
        map.on('mouseenter', layer, e => {
          map.getCanvas().style.cursor = 'pointer'
          const feature = e.features?.[0]
          if (!feature) return
          const props = feature.properties as { label: string; nameKo: string; nameEn: string; nameJa: string; nameZh: string }
          const lang = nameKey(i18n.language)
          const name = lang === 'en' ? props.nameEn : lang === 'ja' ? props.nameJa : lang === 'zh' ? props.nameZh : props.nameKo
          const coordinates = (feature.geometry as { type: string; coordinates: [number, number] }).coordinates as [number, number]

          hoverPopupRef.current?.remove()
          hoverPopupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 12,
            className: 'stop-hover-popup',
          })
            .setLngLat(coordinates)
            .setHTML(`<span class="stop-num">${props.label}</span><span class="stop-name">${name}</span>`)
            .addTo(map)
        })
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = ''
          hoverPopupRef.current?.remove()
          hoverPopupRef.current = null
        })
      }

      // 근처 숙박시설 점 — 누르면 호텔 모드(핀·도보 경로)
      map.on('click', 'nearby-hotels', e => {
        const slug = e.features?.[0]?.properties?.slug
        if (slug) router.push(`/map?hotel=${slug}`)
      })
      map.on('mouseenter', 'nearby-hotels', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const coordinates = (feature.geometry as { type: string; coordinates: [number, number] }).coordinates as [number, number]
        hoverPopupRef.current?.remove()
        hoverPopupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8, className: 'stop-hover-popup' })
          .setLngLat(coordinates)
          .setHTML(`<span class="stop-name">${String(feature.properties?.label ?? '')}</span>`)
          .addTo(map)
      })
      map.on('mouseleave', 'nearby-hotels', () => {
        map.getCanvas().style.cursor = ''
        hoverPopupRef.current?.remove()
        hoverPopupRef.current = null
      })
    })

    // Re-add layers after style change (setStyle removes all custom layers/sources)
    map.on('style.load', () => {
      addMapLayers(map, selectedStopIdRef.current, routeIdRef.current, courseRef.current, mapStyleRef.current === 'dark')
      setStyleRevision(value => value + 1)
    })

    mapRef.current = map
    return () => {
      hoverPopupRef.current?.remove()
      wrongPinRef.current?.remove()
      busMarkerRef.current?.remove()
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [handleStopClick, i18n, onStopSelect, onUserLocation, router])

  // Apply style change when mapStyle state changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStyleRef.current === mapStyle) return
    map.setStyle(MAP_STYLES[mapStyle])
    mapStyleRef.current = mapStyle
  }, [mapStyle])

  // Re-render layers and fly to center when routeId changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    clearMapLayers(map)
    addMapLayers(map, selectedStopIdRef.current, routeId, course, mapStyleRef.current === 'dark')
    const meta = getRoute(routeId)
    map.flyTo({ center: meta.center, zoom: meta.zoom, duration: 800 })
    // Stop bus animation when switching routes
    setAnimating(false)
  }, [routeId, course])

  // Bus animation along route
  const ANIMATION_DURATION = 60000 // 60 seconds for full route
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!animating) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      busMarkerRef.current?.remove()
      busMarkerRef.current = null
      return
    }

    const el = document.createElement('div')
    el.style.cssText = `
      font-size: 22px;
      line-height: 1;
      cursor: default;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
      transform-origin: center;
    `
    el.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="#FFFDF8" stroke="#1C1A18" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21v-4M16 21v-4"/></svg>'
    el.title = i18n.t('map.busMarker')

    const routeCoords = getRouteCoordinates(routeIdRef.current, course)

    busMarkerRef.current?.remove()
    busMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(routeCoords[0] as [number, number])
      .addTo(map)

    animStartRef.current = performance.now()

    function animate(now: number) {
      const elapsed = (now - animStartRef.current) % ANIMATION_DURATION
      const t = elapsed / ANIMATION_DURATION
      const pos = interpolateRoute(routeCoords, t)
      busMarkerRef.current?.setLngLat(pos)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      busMarkerRef.current?.remove()
      busMarkerRef.current = null
    }
  }, [animating, i18n, course])

  // 선택된 정류장 변경 시 지도 이동 + 핀 색상 업데이트 + 구글맵 오류 핀 표시
  useEffect(() => {
    const map = mapRef.current
    // style.load 직후에는 새 GeoJSON 소스 로딩 때문에 isStyleLoaded()가 다시 false일 수 있다.
    // 레이어 생성 여부로 판단해야 초기 선택·스타일 복원 처리를 빠뜨리지 않는다.
    if (!map || !map.getLayer('stops-near-circle')) return
    if (selectedStopId) {
      const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
      if (stop) {
        // 모바일 상세가 화면 절반을 덮으므로 선택 마커를 보이는 지도 중앙으로 이동한다.
        const offsetY = window.matchMedia(MOBILE_QUERY).matches ? -window.innerHeight / 4 : 0
        // 방향별 쌍(27m 떨어진 No.3·No.19 등)은 두 마커가 갈라져 보이는 줌까지 들어간다
        const paired = getGroupedStops(routeIdRef.current, stop).some(g => !g.samePlace)
        map.flyTo({ center: [stop.lng, stop.lat], zoom: paired ? 17 : 15, duration: 600, offset: [0, offsetY] })
      }
    }
    applySelection(map, selectedStopId, getRoute(routeIdRef.current).color)

    // Remove previous wrong pin
    if (wrongPinRef.current) {
      wrongPinRef.current.remove()
      wrongPinRef.current = null
    }

    // Show wrong Google Maps pin if this stop has error coordinates
    if (selectedStopId) {
      const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
      if (stop?.googleMapsError && stop.googleMapsLat != null && stop.googleMapsLng != null) {
        // 빨간 점선 원 + "Google" 꼬리표. 멀리서는 노이즈라 확대했을 때만 보인다(GHOST_MIN_ZOOM)
        const el = document.createElement('div')
        el.className = styles.ghostPin
        el.title = i18n.t('map.wrongPin')
        el.innerHTML = `<span class="${styles.ghostRing}"></span><span class="${styles.ghostTag}">Google</span>`
        el.hidden = map.getZoom() < GHOST_MIN_ZOOM

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([stop.googleMapsLng, stop.googleMapsLat])
          .addTo(map)

        wrongPinRef.current = marker
      }
    }
  }, [selectedStopId, i18n, styleRevision, routeId])

  // 호텔 핀 — 호텔 모드에서만. 정류장 원과 구분되도록 침대 아이콘의 사각 핀을 쓴다
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    hotelMarkerRef.current?.remove()
    hotelMarkerRef.current = null
    if (!hotel) return
    const el = document.createElement('div')
    el.className = styles.hotelPin
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', `${t('map.hotel.marker')}: ${hotel.label}`)
    el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18V8M3 12h18v6M3 15h18M21 18v-6a2 2 0 0 0-2-2h-8v4"/><circle cx="7" cy="10" r="1.6"/></svg>'
    hotelMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([hotel.lng, hotel.lat]).addTo(map)
    // 호텔과 선택 정류장이 한 화면에 들어오게
    const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopIdRef.current)
    if (stop) {
      // 모바일은 바텀시트가 아래 절반을 가리므로 그만큼 아래 여백을 준다 (BottomSheet 'half' = 50dvh)
      const mobile = window.matchMedia('(max-width: 1023px)').matches
      const padding = mobile
        ? { top: 70, bottom: Math.round(map.getContainer().clientHeight * 0.55), left: 40, right: 40 }
        : 90
      map.fitBounds([[Math.min(hotel.lng, stop.lng), Math.min(hotel.lat, stop.lat)], [Math.max(hotel.lng, stop.lng), Math.max(hotel.lat, stop.lat)]], { padding, maxZoom: 17, duration: 0 })
    }
    return () => { hotelMarkerRef.current?.remove(); hotelMarkerRef.current = null }
  }, [hotel, styleRevision, t])

  // 근처 숙박시설 점 — 선택 정류장 450m 안만. 호텔 모드에서는 호텔 핀이 있으므로 찍지 않는다
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('stops-near-circle')) return
    const data = {
      type: 'FeatureCollection' as const,
      features: (hotel ? [] : nearbyHotels ?? []).map(h => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [h.lng, h.lat] },
        properties: { slug: h.slug, label: h.label },
      })),
    }
    const source = map.getSource('nearby-hotels') as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(data)
      return
    }
    map.addSource('nearby-hotels', { type: 'geojson', data })
    // 정류장 원보다 아래에 깔아 정류장이 항상 위에 보이게 한다
    map.addLayer({
      id: 'nearby-hotels',
      type: 'circle',
      source: 'nearby-hotels',
      paint: {
        'circle-radius': 5.5,
        'circle-color': '#2F6A8F', /* 호텔·도보 경로와 같은 파랑 — light 스타일의 회색 POI 점과 구분 */
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.85,
      },
    }, 'stops-far-selected-halo')
  }, [nearbyHotels, hotel, styleRevision, routeId])

  // 도보 경로의 출발점 — 현재 위치가 있으면 현재 위치, 없으면 호텔
  const walkOrigin = useMemo<[number, number] | null>(() => userLocation ?? (hotel ? [hotel.lng, hotel.lat] : null), [userLocation, hotel])

  // 도보 경로 표시 — 정류장 선택/위치 변경 시 하나의 이펙트에서만 fetch
  // cleanup에서 이전 요청을 abort해 중복 요청과 stale 응답 덮어쓰기를 방지
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('stops-near-circle')) return

    // 기존 도보 경로 제거
    // 도보 경로 = 흰 케이싱 + 파란 점선 (노선의 갈색 실선과 겹쳐도 구분되게. 파란색은 호텔 핀·정보 색 --sea와 통일)
    if (map.getLayer('walking-route')) map.removeLayer('walking-route')
    if (map.getLayer('walking-route-casing')) map.removeLayer('walking-route-casing')
    if (map.getSource('walking-route')) map.removeSource('walking-route')

    if (!walkOrigin || !selectedStopId) return
    const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
    if (!stop) return

    const controller = new AbortController()
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${walkOrigin[0]},${walkOrigin[1]};${stop.lng},${stop.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Directions API 응답 오류: ${r.status}`)
        return r.json()
      })
      .then(data => {
        const route = data.routes?.[0]?.geometry
        if (controller.signal.aborted || !route || !map.getLayer('stops-near-circle')) return
        if (map.getSource('walking-route')) {
          (map.getSource('walking-route') as mapboxgl.GeoJSONSource).setData(route)
        } else {
          map.addSource('walking-route', { type: 'geojson', data: route })
          map.addLayer({
            id: 'walking-route-casing',
            type: 'line',
            source: 'walking-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
          })
          map.addLayer({
            id: 'walking-route',
            type: 'line',
            source: 'walking-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#2F6A8F',
              'line-width': 4,
              'line-dasharray': [0.2, 1.6],
            },
          })
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return // 정상적인 취소
        console.warn('도보 경로 조회 실패:', err instanceof Error ? err.name : 'UnknownError') // 토큰/위치 포함 URL은 기록하지 않는다.
      })

    return () => controller.abort()
  }, [walkOrigin, selectedStopId, styleRevision, routeId])

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.canvas} />
      {!ready && <MapLoading />}
      {routeId === 'islandview' && (
        <div className={styles.courseToggle}>
          <label>
            {t('map.courseGeometry')}
            <select value={course} onChange={event => setCourse(event.target.value as 'A' | 'B')}>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </label>
          <span>{t('map.roadReference')}</span>
        </div>
      )}
      <div className={styles.animToggle}>
        <button
          type="button"
          className={`${styles.animBtn} ${animating ? styles.animBtnActive : ''}`}
          onClick={() => setAnimating(a => !a)}
          title={animating ? t('map.animPause') : t('map.animPlay')}
          aria-label={animating ? t('map.animPause') : t('map.animPlay')}
          aria-pressed={animating}
        >
          {animating ? <IconPause size={14} /> : <IconPlay size={14} />}
        </button>
      </div>
      <div className={styles.styleToggle} role="group" aria-label={t('map.mapStyle')}>
        {STYLE_ORDER.map(s => {
          const Icon = STYLE_ICONS[s]
          return (
            <button
              key={s}
              type="button"
              className={`${styles.styleBtn} ${mapStyle === s ? styles.styleBtnActive : ''}`}
              onClick={() => setUserStyle(s)}
              title={t(STYLE_LABEL_KEYS[s])}
              aria-label={t(STYLE_LABEL_KEYS[s])}
              aria-pressed={mapStyle === s}
            >
              <Icon size={16} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
