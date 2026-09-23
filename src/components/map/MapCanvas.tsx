'use client'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useTranslation } from 'react-i18next'
import MapLoading from './MapLoading'
import { track } from '@/lib/analytics/track'
import { distanceBand } from '@/lib/analytics/events'
import { distanceMeters } from '@/lib/hotels'
import {
  getStopsForRoute, getStopsGeoJSON, getRouteCoordinates, getRoute,
  getNearestStop, nameKey, type RouteStop, type RouteId,
} from '@/lib/routes'
import { useResolvedTheme } from '@/lib/useResolvedTheme'
import { IconMap, IconMoon, IconPause, IconPlay, IconSatellite } from '@/components/icons'
import styles from './MapCanvas.module.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type MapStyle = 'streets' | 'satellite' | 'dark'

const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
}

const STYLE_ICONS: Record<MapStyle, typeof IconMap> = {
  streets: IconMap,
  satellite: IconSatellite,
  dark: IconMoon,
}

const STYLE_LABEL_KEYS: Record<MapStyle, string> = {
  streets: 'map.styleStreets',
  satellite: 'map.styleSatellite',
  dark: 'map.styleDark',
}

// 모바일(바텀시트) 전환점 — 디자인 시스템 공통 기준
const MOBILE_QUERY = '(max-width: 1023px)'

const STYLE_ORDER: MapStyle[] = ['streets', 'satellite', 'dark']

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

function clearMapLayers(map: mapboxgl.Map) {
  if (map.getLayer('stops-label')) map.removeLayer('stops-label')
  if (map.getLayer('stops-selected-halo')) map.removeLayer('stops-selected-halo')
  if (map.getLayer('stops-circle')) map.removeLayer('stops-circle')
  if (map.getLayer('route-line')) map.removeLayer('route-line')
  if (map.getSource('stops')) map.removeSource('stops')
  if (map.getSource('route')) map.removeSource('route')
}

// 선택 정류장은 크게, 구글맵 오류 정류장은 약간 크게
function selectedRadius(selectedId: string | null) {
  return ['case', ['==', ['get', 'id'], selectedId ?? ''], 14, ['get', 'googleMapsError'], 10, 8] as unknown as number
}

function addMapLayers(map: mapboxgl.Map, selectedId: string | null, routeId: RouteId, course: 'A' | 'B') {
  const stops = getStopsForRoute(routeId)
  const geojson = getStopsGeoJSON(stops)
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
  if (!map.getLayer('route-line')) {
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': routeColor,
        'line-width': 3,
        'line-opacity': 0.7,
      },
    })
  }

  // 정류장 GeoJSON
  if (!map.getSource('stops')) {
    map.addSource('stops', { type: 'geojson', data: geojson })
  }

  // 선택 정류장 강조 — 원 아래에 반투명 테를 깔아 현장에서 "여기"가 한눈에 보이게 한다
  if (!map.getLayer('stops-selected-halo')) {
    map.addLayer({
      id: 'stops-selected-halo',
      type: 'circle',
      source: 'stops',
      filter: ['==', ['get', 'id'], selectedId ?? ''],
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

  if (!map.getLayer('stops-circle')) {
    map.addLayer({
      id: 'stops-circle',
      type: 'circle',
      source: 'stops',
      paint: {
        'circle-radius': selectedRadius(selectedId),
        'circle-color': [
          'case',
          ['==', ['get', 'id'], selectedId ?? ''], routeColor,
          ['get', 'googleMapsError'], '#C87A3A',
          '#1E3A4F',
        ] as unknown as string,
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'case',
          ['get', 'coordinatesApproximate'], '#C87A3A',
          '#ffffff',
        ] as unknown as string,
        'circle-opacity': [
          'case',
          ['get', 'isBCourseOnly'], 0.55,
          0.9,
        ] as unknown as number,
      },
    })
  }

  if (!map.getLayer('stops-label')) {
    map.addLayer({
      id: 'stops-label',
      type: 'symbol',
      source: 'stops',
      layout: {
        'text-field': ['to-string', ['get', 'number']] as unknown as string,
        'text-size': ['case', ['==', ['get', 'id'], selectedId ?? ''], 13, 10] as unknown as number,
        'text-allow-overlap': true,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#ffffff' },
    })
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
}

export default function MapCanvas({ routeId, selectedStopId, onStopSelect, onUserLocation, userLocation, hotel }: MapCanvasProps) {
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
  const mapStyle: MapStyle = userStyle ?? (resolvedTheme === 'dark' ? 'dark' : 'streets')
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

  const handleStopClick = useCallback((stopId: string) => {
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
    map.on('load', () => {
      addMapLayers(map, selectedStopIdRef.current, routeIdRef.current, courseRef.current)

      // 클릭 이벤트
      map.on('click', 'stops-circle', e => {
        const id = e.features?.[0]?.properties?.id
        if (id) handleStopClick(id)
      })
      map.on('mouseenter', 'stops-circle', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as { id: string; number: number; nameKo: string; nameEn: string; nameJa: string; nameZh: string }
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
          .setHTML(`<span class="stop-num">${props.number}</span><span class="stop-name">${name}</span>`)
          .addTo(map)
      })
      map.on('mouseleave', 'stops-circle', () => {
        map.getCanvas().style.cursor = ''
        hoverPopupRef.current?.remove()
        hoverPopupRef.current = null
      })
    })

    // Re-add layers after style change (setStyle removes all custom layers/sources)
    map.on('style.load', () => {
      addMapLayers(map, selectedStopIdRef.current, routeIdRef.current, courseRef.current)
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
  }, [handleStopClick, i18n, onStopSelect, onUserLocation])

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
    addMapLayers(map, selectedStopIdRef.current, routeId, course)
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
    if (!map || !map.getLayer('stops-circle')) return
    if (selectedStopId) {
      const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
      if (stop) {
        // 모바일 상세가 화면 절반을 덮으므로 선택 마커를 보이는 지도 중앙으로 이동한다.
        const offsetY = window.matchMedia(MOBILE_QUERY).matches ? -window.innerHeight / 4 : 0
        map.flyTo({ center: [stop.lng, stop.lat], zoom: 15, duration: 600, offset: [0, offsetY] })
      }
    }
    // 핀 색상 업데이트
    if (map.getLayer('stops-circle')) {
      const routeColor = getRoute(routeIdRef.current).color
      map.setPaintProperty('stops-circle', 'circle-color', [
        'case',
        ['==', ['get', 'id'], selectedStopId ?? ''], routeColor,
        ['get', 'googleMapsError'], '#C87A3A',
        '#1E3A4F',
      ])
      map.setPaintProperty('stops-circle', 'circle-radius', selectedRadius(selectedStopId))
      map.setLayoutProperty('stops-label', 'text-size', ['case', ['==', ['get', 'id'], selectedStopId ?? ''], 13, 10])
      map.setFilter('stops-selected-halo', ['==', ['get', 'id'], selectedStopId ?? ''])
    }

    // Remove previous wrong pin
    if (wrongPinRef.current) {
      wrongPinRef.current.remove()
      wrongPinRef.current = null
    }

    // Show wrong Google Maps pin if this stop has error coordinates
    if (selectedStopId) {
      const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
      if (stop?.googleMapsError && stop.googleMapsLat != null && stop.googleMapsLng != null) {
        const el = document.createElement('div')
        el.style.cssText = `
          width: 12px;
          height: 12px;
          background: rgba(220, 50, 50, 0.6);
          border: 2px solid rgba(220, 50, 50, 0.9);
          border-radius: 50%;
          cursor: default;
        `
        el.title = i18n.t('map.wrongPin')

        const marker = new mapboxgl.Marker({ element: el })
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

  // 도보 경로의 출발점 — 현재 위치가 있으면 현재 위치, 없으면 호텔
  const walkOrigin = useMemo<[number, number] | null>(() => userLocation ?? (hotel ? [hotel.lng, hotel.lat] : null), [userLocation, hotel])

  // 도보 경로 표시 — 정류장 선택/위치 변경 시 하나의 이펙트에서만 fetch
  // cleanup에서 이전 요청을 abort해 중복 요청과 stale 응답 덮어쓰기를 방지
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('stops-circle')) return

    // 기존 도보 경로 제거
    if (map.getLayer('walking-route')) map.removeLayer('walking-route')
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
        if (controller.signal.aborted || !route || !map.getLayer('stops-circle')) return
        if (map.getSource('walking-route')) {
          (map.getSource('walking-route') as mapboxgl.GeoJSONSource).setData(route)
        } else {
          map.addSource('walking-route', { type: 'geojson', data: route })
          map.addLayer({
            id: 'walking-route',
            type: 'line',
            source: 'walking-route',
            paint: {
              'line-color': '#8B4513',
              'line-width': 3,
              'line-opacity': 0.8,
              'line-dasharray': [1, 2],
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
