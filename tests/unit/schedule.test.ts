import { describe, expect, it } from 'vitest'
import { getJapanMinutes, getNextDeparture, getScheduleExtraNote } from '@/lib/routes'

const DEPARTURES = ['08:30', '09:00', '09:30']
// 2026-09-21(월) — 시간은 UTC로 지정해 기기 시간대와 무관하게 검증한다 (JST = UTC+9)
const jst = (hhmm: string) => new Date(`2026-09-21T${hhmm}:00+09:00`)

describe('다음 버스 (일본 시간 기준)', () => {
  it('기기 시간대와 관계없이 일본 시간으로 계산한다', () => {
    expect(getJapanMinutes(new Date('2026-09-20T23:40:00Z'))).toBe(8 * 60 + 40)
  })

  it('첫차 전·운행 중·막차 후를 구분한다', () => {
    expect(getNextDeparture('cityview', DEPARTURES, jst('07:10'))).toEqual({ status: 'upcoming', time: '08:30', minutesUntil: 80 })
    expect(getNextDeparture('cityview', DEPARTURES, jst('09:00'))).toEqual({ status: 'upcoming', time: '09:00', minutesUntil: 0 })
    expect(getNextDeparture('cityview', DEPARTURES, jst('09:31'))).toEqual({ status: 'ended', firstTomorrow: '08:30' })
  })

  it('운행일이 아니면 운휴, 시간표가 없으면 미확인으로 본다', () => {
    // 야경 코스는 토요일 운행 — 2026-09-21은 월요일
    expect(getNextDeparture('cityview-night', DEPARTURES, jst('19:00'))).toEqual({ status: 'noService' })
    expect(getNextDeparture('cityview', [], jst('10:00'))).toEqual({ status: 'unknown' })
  })
})

describe('운행 메모 중복 제거', () => {
  it('편수·간격 문장은 걷어내고 추가 안내만 남긴다', () => {
    expect(getScheduleExtraNote('1日19便。30分間隔。')).toBe('')
    expect(getScheduleExtraNote('1日19便（08:30〜17:30）。30分間隔。')).toBe('')
    expect(getScheduleExtraNote('19 daily runs. Every 30 min.')).toBe('')
    expect(getScheduleExtraNote('하루 19편 운행 (08:30~17:30). 30분 간격.')).toBe('')
    expect(getScheduleExtraNote('1日19便。循環終点（1番と同一地点）。')).toBe('循環終点（1番と同一地点）。')
    expect(getScheduleExtraNote('Bコースのみ停車')).toBe('Bコースのみ停車')
    expect(getScheduleExtraNote('公式サイトで時刻確認')).toBe('公式サイトで時刻確認')
  })
})
