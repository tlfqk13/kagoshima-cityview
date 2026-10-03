import { describe, expect, it } from 'vitest'
import { getStopById } from '@/lib/routes'
import { getTicketOffices, getTicketOfficesNearStop } from '@/lib/tickets'

describe('승차권 판매처', () => {
  it('모든 판매처는 출처와 좌표가 있고 가고시마 시내다', () => {
    for (const o of getTicketOffices()) {
      expect(o.coordSource).toMatch(/^https:\/\//)
      expect(o.sellsSource).toMatch(/^https:\/\//)
      expect(o.lat).toBeGreaterThan(31.5)
      expect(o.lat).toBeLessThan(31.7)
      expect(o.lng).toBeGreaterThan(130.5)
      expect(o.lng).toBeLessThan(130.7)
      expect(o.sells.length).toBeGreaterThan(0)
    }
  })

  it('중앙역 정류장(No.1·No.20)에서는 1일권 판매처가 걸어갈 거리에 있다', () => {
    for (const id of ['stop_01', 'stop_20']) {
      const near = getTicketOfficesNearStop(getStopById('cityview', id)!)
      expect(near.some(n => n.office.sells.includes('dayPass'))).toBe(true)
      expect(near[0].minutes).toBeLessThanOrEqual(5)
    }
  })

  it('먼 정류장에는 판매처를 붙이지 않는다', () => {
    expect(getTicketOfficesNearStop(getStopById('cityview', 'stop_12')!)).toHaveLength(0)
  })
})
