'use client'
import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getAllStops, getStopsGeoJSON, getNearestStop, ROUTE_COORDINATES, type BusStop } from '@/lib/stops'
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

export interface MapCanvasProps {
  selectedStopId: string | null
  onStopSelect: (stop: BusStop) => void
  onUserLocation?: (coords: [number, number]) => void
  userLocation?: [number, number] | null
}

export default function MapCanvas({ selectedStopId, onStopSelect, onUserLocation, userLocation }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const wrongPinRef = useRef<mapboxgl.Marker | null>(null)
  const userLocationRef = useRef<[number, number] | null | undefined>(userLocation)
  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null)

  // Keep userLocationRef in sync so the selectedStopId effect can access latest value
  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  const handleStopClick = useCallback((stopId: string) => {
    const stop = getAllStops().find(s => s.id === stopId)
    if (stop) onStopSelect(stop)
  }, [onStopSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
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
      const nearest = getNearestStop(latitude, longitude)
      if (nearest) onStopSelect(nearest)
      onUserLocation?.([longitude, latitude])
    })

    map.on('load', () => {
      const stops = getAllStops()
      const geojson = getStopsGeoJSON(stops)

      // 노선 폴리라인
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: ROUTE_COORDINATES },
          properties: {},
        },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#8B4513',
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
        },
      })

      // 정류장 GeoJSON 소스
      map.addSource('stops', { type: 'geojson', data: geojson })

      // 정류장 원형 핀
      map.addLayer({
        id: 'stops-circle',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': ['case', ['get', 'googleMapsError'], 10, 8] as unknown as number,
          'circle-color': [
            'case',
            ['==', ['get', 'id'], selectedStopId ?? ''], '#8B4513',
            ['get', 'googleMapsError'], '#C87A3A',
            '#1E3A4F',
          ] as unknown as string,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      })

      // 정류장 번호 텍스트 레이블
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

    mapRef.current = map
    return () => {
      hoverPopupRef.current?.remove()
      wrongPinRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [handleStopClick])

  // 선택된 정류장 변경 시 지도 이동 + 핀 색상 업데이트 + 도보 경로 표시
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (selectedStopId) {
      const stop = getAllStops().find(s => s.id === selectedStopId)
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
      const stop = getAllStops().find(s => s.id === selectedStopId)
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
      const stop = getAllStops().find(s => s.id === selectedStopId)
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

    const stop = getAllStops().find(s => s.id === selectedStopId)
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

  return <div ref={containerRef} className={styles.canvas} />
}
