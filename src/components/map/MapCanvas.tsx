'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  getStopsForRoute, getStopsGeoJSON, getRouteCoordinates, getRoute,
  getNearestStop, type RouteStop, type RouteId,
} from '@/lib/routes'
import styles from './MapCanvas.module.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

function getCurrentLang(): 'ko' | 'en' | 'ja' {
  if (typeof window === 'undefined') return 'ko'
  // react-i18next stores language in cookie 'i18next' or localStorage 'i18nextLng'
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('i18next='))
  const lang = cookie?.split('=')[1]?.trim() ?? localStorage.getItem('i18nextLng') ?? 'ko'
  return (['ko', 'en', 'ja'].includes(lang) ? lang : 'ko') as 'ko' | 'en' | 'ja'
}

const KAGOSHIMA_CENTER: [number, number] = [130.5581, 31.5897]
const INITIAL_ZOOM = 13

type MapStyle = 'streets' | 'satellite' | 'dark'

const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
}

const STYLE_ICONS: Record<MapStyle, string> = {
  streets: '🗺',
  satellite: '🛰',
  dark: '🌙',
}

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
  if (map.getLayer('stops-circle')) map.removeLayer('stops-circle')
  if (map.getLayer('route-line')) map.removeLayer('route-line')
  if (map.getSource('stops')) map.removeSource('stops')
  if (map.getSource('route')) map.removeSource('route')
}

function addMapLayers(map: mapboxgl.Map, selectedId: string | null, routeId: RouteId) {
  const stops = getStopsForRoute(routeId)
  const geojson = getStopsGeoJSON(stops)
  const routeCoords = getRouteCoordinates(routeId)
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
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.7,
      },
    })
  }

  // 정류장 GeoJSON
  if (!map.getSource('stops')) {
    map.addSource('stops', { type: 'geojson', data: geojson })
  }

  if (!map.getLayer('stops-circle')) {
    map.addLayer({
      id: 'stops-circle',
      type: 'circle',
      source: 'stops',
      paint: {
        'circle-radius': ['case', ['get', 'googleMapsError'], 10, 8] as unknown as number,
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
        'text-size': 10,
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
}

export default function MapCanvas({ routeId, selectedStopId, onStopSelect, onUserLocation, userLocation }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const wrongPinRef = useRef<mapboxgl.Marker | null>(null)
  const userLocationRef = useRef<[number, number] | null | undefined>(userLocation)
  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null)
  const selectedStopIdRef = useRef<string | null>(selectedStopId)
  const routeIdRef = useRef<RouteId>(routeId)

  const [mapStyle, setMapStyle] = useState<MapStyle>('streets')
  const mapStyleRef = useRef<MapStyle>('streets')

  const [animating, setAnimating] = useState(false)
  const busMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const animStartRef = useRef<number>(0)

  // Keep refs in sync
  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  useEffect(() => {
    selectedStopIdRef.current = selectedStopId
  }, [selectedStopId])

  useEffect(() => {
    routeIdRef.current = routeId
  }, [routeId])

  useEffect(() => {
    mapStyleRef.current = mapStyle
  }, [mapStyle])

  const handleStopClick = useCallback((stopId: string) => {
    const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === stopId)
    if (stop) onStopSelect(stop)
  }, [onStopSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES['streets'],
      center: KAGOSHIMA_CENTER,
      zoom: INITIAL_ZOOM,
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
      if (nearest) onStopSelect(nearest)
      onUserLocation?.([longitude, latitude])
    })

    map.on('load', () => {
      addMapLayers(map, selectedStopIdRef.current, routeIdRef.current)

      // 클릭 이벤트
      map.on('click', 'stops-circle', e => {
        const id = e.features?.[0]?.properties?.id
        if (id) handleStopClick(id)
      })
      map.on('mouseenter', 'stops-circle', e => {
        map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const props = feature.properties as { id: string; number: number; nameKo: string; nameEn: string; nameJa: string }
        const lang = getCurrentLang()
        const name = lang === 'en' ? props.nameEn : lang === 'ja' ? props.nameJa : props.nameKo
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
      addMapLayers(map, selectedStopIdRef.current, routeIdRef.current)
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
  }, [handleStopClick])

  // Apply style change when mapStyle state changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(MAP_STYLES[mapStyle])
  }, [mapStyle])

  // Re-render layers and fly to center when routeId changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    clearMapLayers(map)
    addMapLayers(map, selectedStopIdRef.current, routeId)
    const meta = getRoute(routeId)
    map.flyTo({ center: meta.center, zoom: meta.zoom, duration: 800 })
    // Stop bus animation when switching routes
    setAnimating(false)
  }, [routeId])

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
    el.textContent = '🚌'
    el.title = '鹿児島シティビューバス'

    const routeCoords = getRouteCoordinates(routeIdRef.current)

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
  }, [animating])

  // 선택된 정류장 변경 시 지도 이동 + 핀 색상 업데이트 + 도보 경로 표시
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (selectedStopId) {
      const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
      if (stop) {
        map.flyTo({ center: [stop.lng, stop.lat], zoom: 15, duration: 600 })
      }
    }
    // 핀 색상 업데이트
    if (map.getLayer('stops-circle')) {
      map.setPaintProperty('stops-circle', 'circle-color', [
        'case',
        ['==', ['get', 'id'], selectedStopId ?? ''], '#8B4513',
        ['get', 'googleMapsError'], '#C87A3A',
        '#1E3A4F',
      ])
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
        el.title = 'Google Maps incorrect location'

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.googleMapsLng, stop.googleMapsLat])
          .addTo(map)

        wrongPinRef.current = marker
      }
    }

    // Clear existing walking route
    if (map.getLayer('walking-route')) map.removeLayer('walking-route')
    if (map.getSource('walking-route')) map.removeSource('walking-route')

    // Draw walking route if user location available
    const currentUserLocation = userLocationRef.current
    if (currentUserLocation && selectedStopId) {
      const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
      if (stop) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${currentUserLocation[0]},${currentUserLocation[1]};${stop.lng},${stop.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
        fetch(url)
          .then(r => r.json())
          .then(data => {
            const route = data.routes?.[0]?.geometry
            if (!route || !map.isStyleLoaded()) return
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
          .catch(() => {}) // silently fail if no network
      }
    }
  }, [selectedStopId])

  // Update walking route when userLocation changes (while stop is already selected)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (!userLocation || !selectedStopId) {
      // Clear route if no location or no stop selected
      if (map.getLayer('walking-route')) map.removeLayer('walking-route')
      if (map.getSource('walking-route')) map.removeSource('walking-route')
      return
    }

    const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === selectedStopId)
    if (!stop) return

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLocation[0]},${userLocation[1]};${stop.lng},${stop.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const route = data.routes?.[0]?.geometry
        if (!route || !map.isStyleLoaded()) return
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
      .catch(() => {}) // silently fail if no network
  }, [userLocation, selectedStopId])

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.canvas} />
      <div className={styles.animToggle}>
        <button
          className={`${styles.animBtn} ${animating ? styles.animBtnActive : ''}`}
          onClick={() => setAnimating(a => !a)}
          title={animating ? '정지' : '버스 애니메이션'}
        >
          {animating ? '⏸' : '▶'}
        </button>
      </div>
      <div className={styles.styleToggle}>
        {STYLE_ORDER.map(s => (
          <button
            key={s}
            className={`${styles.styleBtn} ${mapStyle === s ? styles.styleBtnActive : ''}`}
            onClick={() => setMapStyle(s)}
            title={s}
          >
            {STYLE_ICONS[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
