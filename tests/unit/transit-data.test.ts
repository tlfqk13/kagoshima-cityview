import { describe, expect, it } from 'vitest'
import { ROUTE_ORDER, getStopsForRoute, getRouteGeometry, getRouteCoordinates, getDepartureInterval } from '@/lib/routes'
import reference from '../fixtures/official-gtfs.json'
import mountain from '../../scripts/data/island-mountain-road.json'

describe('공식 GTFS 대조 회귀', () => {
  it('39개 정류장의 승강장 ID와 시간표가 공식 스냅샷에 일치한다', () => {
    for (const routeId of ROUTE_ORDER) for (const stop of getStopsForRoute(routeId)) {
      const official = reference.routes[routeId].find(item => item.id === stop.id)!
      expect(stop.gtfsStopId).toBe(official.gtfsStopId)
      if (routeId !== 'cityview-night') expect(stop.schedule?.departures).toEqual(official.departures)
      if (routeId === 'islandview') expect([stop.lng, stop.lat]).toEqual(official.coordinates)
    }
  })
  it('아카미즈 후모토의 왕복 승강장을 구분한다', () => {
    const stops = getStopsForRoute('islandview')
    expect(stops[6].gtfsStopId).not.toBe(stops[8].gtfsStopId)
    expect([stops[6].lng, stops[6].lat]).not.toEqual([stops[8].lng, stops[8].lat])
  })
  it('B코스는 60분 간격이고 합류 지점은 불규칙 간격이다', () => {
    const stops = getStopsForRoute('islandview')
    expect(getDepartureInterval(stops[6].schedule!.departures)).toBe(60)
    expect(getDepartureInterval(stops[9].schedule!.departures)).toBeNull()
    expect(getDepartureInterval(stops[0].schedule!.departures)).toBe(30)
  })
})

describe('노선 형상', () => {
  it('모든 노선은 정류장 단순 연결 대신 출처가 있는 도로 형상을 쓴다', () => {
    for (const routeId of ROUTE_ORDER) {
      const geometry = getRouteGeometry(routeId)
      expect(geometry.length).toBeGreaterThan(0)
      for (const shape of geometry) {
        expect(shape.coordinates.length).toBeGreaterThan(100)
        expect(shape.source).toMatch(/^https:\/\//)
        for (const [lng, lat] of shape.coordinates) {
          expect(lng).toBeGreaterThan(130.5)
          expect(lng).toBeLessThan(130.7)
          expect(lat).toBeGreaterThan(31.5)
          expect(lat).toBeLessThan(31.7)
        }
      }
    }
  })
  it('A/B 코스는 서로 다르고 공식 산길 구간을 모두 포함한다', () => {
    const a = getRouteCoordinates('islandview', 'A')
    const b = getRouteCoordinates('islandview', 'B')
    expect(a).not.toEqual(b)
    for (const point of mountain.coordinates) {
      expect(a).toContainEqual(point)
      expect(b).toContainEqual(point)
    }
    const sabo = getStopsForRoute('islandview')[7]
    // 도로 중심선과 승강장 사이의 거리: 가져오기 단계의 최대 100m 스냅 기준과 동일하다.
    const nearSabo = (points: number[][]) => points.some(([lng, lat]) => Math.hypot((lng - sabo.lng) * 95000, (lat - sabo.lat) * 111000) < 100)
    expect(nearSabo(a)).toBe(false)
    expect(nearSabo(b)).toBe(true)
  })
  it('기하 정점 사이에 비정상적인 연결 점프가 없다', () => {
    for (const route of ROUTE_ORDER) for (const shape of getRouteGeometry(route)) {
      for (let i = 1; i < shape.coordinates.length; i++) {
        const [lng, lat] = shape.coordinates[i]
        const [prevLng, prevLat] = shape.coordinates[i - 1]
        expect(Math.hypot((lng - prevLng) * 95000, (lat - prevLat) * 111000)).toBeLessThan(1500)
      }
    }
  })
})
