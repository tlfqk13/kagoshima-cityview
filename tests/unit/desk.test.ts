import { describe, expect, it } from 'vitest'
import { buildHotelContext, buildNowContext, checkAndCountQuota } from '@/lib/desk'
import { findHotel, getHotelStops } from '@/lib/hotels'

// AI 호출 없이, 모델에 넘기는 컨텍스트가 우리 데이터를 정확히 담는지 검사한다
describe('desk context', () => {
  const hotel = findHotel('remm')!
  const stops = getHotelStops(hotel)

  it('호텔 컨텍스트에 타는/내리는 정류장·요금·전 정류장이 들어간다', () => {
    const ctx = buildHotelContext(hotel, stops)
    expect(ctx).toContain('レム鹿児島')
    expect(ctx).toContain('乗る停留所: No.3')
    expect(ctx).toContain('帰りに降りる停留所: No.19')
    expect(ctx).toContain('大人230円')
    for (let n = 1; n <= 20; n++) expect(ctx).toContain(`No.${n} `)
    expect(ctx).toContain('[id=stop_12]')
  })

  it('현재 시각 컨텍스트는 일본 시간 기준 다음 버스를 담는다', () => {
    // 2026-09-23 10:00 JST = 01:00Z
    const ctx = buildNowContext(stops, new Date('2026-09-23T01:00:00Z'))
    expect(ctx).toContain('現在時刻')
    expect(ctx).toMatch(/次は \d{2}:\d{2}（あと\d+分）/)
    expect(ctx).toContain('No.19')
  })

  it('운행 종료 후에는 내일 첫차를 안내한다', () => {
    const ctx = buildNowContext(stops, new Date('2026-09-23T13:30:00Z')) // 22:30 JST
    expect(ctx).toContain('本日は終了')
  })
})

describe('desk quota', () => {
  it('호텔당 하루 상한을 넘으면 막는다', () => {
    const day = new Date('2026-01-01T03:00:00Z')
    let last: ReturnType<typeof checkAndCountQuota> = { ok: true }
    for (let i = 0; i < 51; i++) last = checkAndCountQuota('quota-test-hotel', day)
    expect(last).toEqual({ ok: false, scope: 'hotel' })
    // 날이 바뀌면 다시 허용
    expect(checkAndCountQuota('quota-test-hotel', new Date('2026-01-02T03:00:00Z'))).toEqual({ ok: true })
  })
})
