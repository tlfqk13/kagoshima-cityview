'use client'
import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getAllStops, getStopsGeoJSON, ROUTE_COORDINATES, type BusStop } from '@/lib/stops'
import styles from './MapCanvas.module.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const KAGOSHIMA_CENTER: [number, number] = [130.5581, 31.5897]
const INITIAL_ZOOM = 13

interface MapCanvasProps {
  selectedStopId: string | null
  onStopSelect: (stop: BusStop) => void
}

export default function MapCanvas({ selectedStopId, onStopSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

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
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'top-right'
    )

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
          'circle-radius': ['case', ['get', 'googleMapsError'], 10, 8] as unknown as mapboxgl.Expression,
          'circle-color': [
            'case',
            ['==', ['get', 'id'], selectedStopId ?? ''], '#8B4513',
            ['get', 'googleMapsError'], '#C87A3A',
            '#1E3A4F',
          ] as unknown as mapboxgl.Expression,
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
          'text-field': ['to-string', ['get', 'number']] as unknown as mapboxgl.Expression,
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
      map.on('mouseenter', 'stops-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'stops-circle', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [handleStopClick])

  // 선택된 정류장 변경 시 지도 이동 + 핀 색상 업데이트
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
  }, [selectedStopId])

  return <div ref={containerRef} className={styles.canvas} />
}
