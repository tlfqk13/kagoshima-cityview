import { describe, expect, it } from 'vitest'
import { distanceBand } from '@/lib/analytics/events'
import { EventSchema, hashSession, japanDay, normalizeCountry, normalizeLang } from '@/lib/analytics/store'

describe('analytics events', () => {
  it('거리 구간은 리포트 기준(50/200/500m)으로 나뉜다', () => {
    expect(distanceBand(10)).toBe('lt50')
    expect(distanceBand(120)).toBe('lt200')
    expect(distanceBand(400)).toBe('lt500')
    expect(distanceBand(900)).toBe('far')
  })

  it('허용된 이벤트·필드만 통과하고, 좌표 같은 임의 값은 거부한다', () => {
    const ok = EventSchema.safeParse({ n: 'stop_view', k: 'stop_03', lang: 'ja', entry: 'hotel', s: '3f2a7f6e-1c1b-4d7e-9c1e-2c7d1b1a9f00' })
    expect(ok.success).toBe(true)
    expect(EventSchema.safeParse({ n: 'stop_view', k: '31.59,130.55', lang: 'ja', entry: 'hotel', s: '3f2a7f6e-1c1b-4d7e-9c1e-2c7d1b1a9f00' }).success).toBe(false)
    expect(EventSchema.safeParse({ n: 'unknown', lang: 'ja', entry: 'direct', s: '3f2a7f6e-1c1b-4d7e-9c1e-2c7d1b1a9f00' }).success).toBe(false)
    expect(EventSchema.safeParse({ n: 'stop_view', lang: 'ja', entry: 'direct', s: 'not-a-uuid' }).success).toBe(false)
  })

  it('세션 해시는 날짜가 바뀌면 달라지고, 솔트가 없으면 만들지 않는다', () => {
    const prev = process.env.ANALYTICS_SALT
    process.env.ANALYTICS_SALT = 'test-salt'
    const a = hashSession('3f2a7f6e-1c1b-4d7e-9c1e-2c7d1b1a9f00', '2026-10-01')
    const b = hashSession('3f2a7f6e-1c1b-4d7e-9c1e-2c7d1b1a9f00', '2026-10-02')
    expect(a).not.toBe(b)
    expect(a).toHaveLength(32)
    delete process.env.ANALYTICS_SALT
    expect(hashSession('3f2a7f6e-1c1b-4d7e-9c1e-2c7d1b1a9f00', '2026-10-01')).toBeNull()
    if (prev) process.env.ANALYTICS_SALT = prev
  })

  it('일본 날짜·언어·국가 정규화', () => {
    expect(japanDay(new Date('2026-09-23T15:30:00Z'))).toBe('2026-09-24') // JST 00:30
    // 규칙: DB 날짜는 UTC+9(KST = JST). 서울 기준으로 계산해도 항상 같아야 한다
    const seoul = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    for (const iso of ['2026-01-01T14:59:00Z', '2026-01-01T15:00:00Z', '2026-07-15T14:59:59Z', '2026-12-31T15:00:00Z']) {
      expect(japanDay(new Date(iso))).toBe(seoul.format(new Date(iso)))
    }
    expect(normalizeLang('zh-Hant')).toBe('zh-Hant')
    expect(normalizeLang('fr')).toBe('other')
    expect(normalizeCountry('JP')).toBe('JP')
    expect(normalizeCountry('123')).toBe('--')
    expect(normalizeCountry(null)).toBe('--')
  })
})
