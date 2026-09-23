import { describe, expect, it } from 'vitest'
import { findHotel, getAllHotels, getHotelStops, getHotelsNearStop } from '@/lib/hotels'
import { getStopById } from '@/lib/routes'

describe('hotels', () => {
  it('모든 호텔에 좌표와 출처가 있다', () => {
    for (const hotel of getAllHotels()) {
      expect(hotel.lat).toBeGreaterThan(31.5)
      expect(hotel.lat).toBeLessThan(31.7)
      expect(hotel.lng).toBeGreaterThan(130.4)
      expect(hotel.lng).toBeLessThan(130.7)
    }
  })

  it('天文館 호텔은 타는 정류장(No.3)과 돌아올 때 내리는 정류장(No.19)이 다르다', () => {
    const remm = findHotel('remm')!
    const stops = getHotelStops(remm)
    expect(stops.board.number).toBe(3)
    expect(stops.alight.number).toBe(19)
    expect(stops.boardMinutes).toBeGreaterThanOrEqual(1)
    expect(stops.boardMinutes).toBeLessThanOrEqual(5)
  })

  it('中央駅 호텔은 No.1에서 타고 같은 자리인 No.20에서 내린다', () => {
    const stops = getHotelStops(findHotel('solaria')!)
    expect(stops.board.number).toBe(1)
    expect(stops.alight.number).toBe(20)
  })

  it('걸어갈 수 있는 정류장이 하나뿐이면 같은 정류장을 돌려준다', () => {
    const stops = getHotelStops(findHotel('shiroyama')!)
    expect(stops.board.id).toBe(stops.alight.id)
  })

  it('天文館 정류장(No.3) 근처 숙박시설에 レム·ドーミーイン이 가까운 순으로 나온다', () => {
    const near = getHotelsNearStop(getStopById('cityview', 'stop_03')!)
    const slugs = near.map(n => n.hotel.slug)
    expect(slugs.indexOf('remm')).toBeGreaterThanOrEqual(0)
    expect(slugs.indexOf('remm')).toBeLessThan(slugs.indexOf('dormy-inn'))
    expect(slugs).not.toContain('sheraton')
  })

  it('걸어갈 호텔이 없는 정류장은 빈 배열이다', () => {
    expect(getHotelsNearStop(getStopById('cityview', 'stop_12')!)).toEqual([])
  })
})
