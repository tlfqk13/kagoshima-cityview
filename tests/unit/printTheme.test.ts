import { describe, expect, it } from 'vitest'
import { DEFAULT_PRINT_THEME, parseHex, resolvePrintTheme } from '@/lib/printTheme'

describe('인쇄물 호텔 색', () => {
  it('6자리 헥스만 받는다 (CSS 주입 방지)', () => {
    expect(parseHex('1a5c3a')).toBe('#1A5C3A')
    expect(parseHex('#1A5C3A')).toBe('#1A5C3A')
    expect(parseHex('red')).toBeUndefined()
    expect(parseHex('#123')).toBeUndefined()
    expect(parseHex('123456;background:url(x)')).toBeUndefined()
  })

  it('미리보기 쿼리 → 호텔 theme → 기본 순서', () => {
    const hotel = { slug: 'x', nameJa: 'x', stopId: 'stop_03', walkMeters: 1, lat: 0, lng: 0, theme: { accent: '#AA0000' } }
    expect(resolvePrintTheme(hotel, {}).accent).toBe('#AA0000')
    expect(resolvePrintTheme(hotel, { accent: '00aa00' }).accent).toBe('#00AA00')
    expect(resolvePrintTheme(undefined, {})).toEqual(DEFAULT_PRINT_THEME)
  })

  it('흰 글자를 올리는 띠에 밝은 색이 오면 기본 먹색으로 되돌린다', () => {
    expect(resolvePrintTheme(undefined, { dark: 'f5f0e0' }).dark).toBe(DEFAULT_PRINT_THEME.dark)
    expect(resolvePrintTheme(undefined, { dark: '003366' }).dark).toBe('#003366')
  })
})
