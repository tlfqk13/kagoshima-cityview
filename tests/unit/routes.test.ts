import { describe, expect, it } from 'vitest'
import { ROUTE_ORDER, getStopsForRoute, getStopVerification, isRouteAvailableToday, searchStops } from '@/lib/routes'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

describe('검증 표시', () => {
  it('현장 실측 노선에만 GPS 검증 표시를 허용한다', () => {
    for (const route of ROUTE_ORDER) for (const stop of getStopsForRoute(route)) {
      expect(getStopVerification(route, stop)).toBe(stop.coordinatesApproximate ? 'approximate' : route === 'cityview' ? 'field' : 'source')
    }
  })
  it('근사치는 현장 검증보다 우선한다', () => {
    expect(getStopVerification('cityview', { ...getStopsForRoute('cityview')[0], coordinatesApproximate: true })).toBe('approximate')
  })
})

describe('일본 운행일', () => {
  it.each([
    ['2026-09-18T14:59:59Z', false],
    ['2026-09-18T15:00:00Z', true],
    ['2026-09-19T14:59:59Z', true],
    ['2026-09-19T15:00:00Z', false],
    ['2026-08-06T15:00:00Z', true],
    ['2026-12-03T15:00:00Z', true],
    ['2027-01-07T15:00:00Z', true],
  ])('%s 기준 야경 운행=%s', (instant, expected) => {
    for (const timezone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      const original = process.env.TZ
      try {
        process.env.TZ = timezone
        expect(isRouteAvailableToday('cityview-night', new Date(instant))).toBe(expected)
      } finally {
        if (original === undefined) delete process.env.TZ
        else process.env.TZ = original
      }
    }
  })
})

describe('데이터 기본 무결성', () => {
  it('정류장 ID·순서·좌표·시간표가 유효하다', () => {
    const ids = new Set<string>()
    for (const route of ROUTE_ORDER) for (const [index, stop] of getStopsForRoute(route).entries()) {
      expect(ids.has(stop.id)).toBe(false)
      ids.add(stop.id)
      expect(stop.number).toBe(index + 1)
      expect(stop.lat).toBeGreaterThan(31.5)
      expect(stop.lat).toBeLessThan(31.7)
      expect(stop.lng).toBeGreaterThan(130.5)
      expect(stop.lng).toBeLessThan(130.7)
      for (const time of stop.schedule?.departures ?? []) expect(time).toMatch(/^\d{2}:\d{2}$/)
    }
  })
  it('3개 언어로 정류장을 검색할 수 있다', () => {
    for (const query of ['텐몬칸', 'Tenmonkan', '天文館']) expect(searchStops('cityview', query).length).toBeGreaterThan(0)
  })
  it('번역 키가 모두 일치한다', () => {
    const keys = (value: object, prefix = ''): string[] => Object.entries(value).flatMap(([key, child]) => (
      child && typeof child === 'object' ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
    )).sort()
    expect(keys(en)).toEqual(keys(ko))
    expect(keys(ja)).toEqual(keys(ko))
  })
})
