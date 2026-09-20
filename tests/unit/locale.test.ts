import { describe, expect, it } from 'vitest'
import { normalizeLanguage, resolveLanguage } from '@/lib/locale'

describe('언어 결정', () => {
  it('URL, 쿠키, 브라우저, 기본 언어 순으로 처리한다', () => {
    expect(resolveLanguage('ko', 'en', 'ja')).toBe('ko')
    expect(resolveLanguage(null, 'en', 'ja')).toBe('en')
    expect(resolveLanguage(null, undefined, 'fr,ko-KR;q=0.9,en;q=0.8')).toBe('ko')
    expect(resolveLanguage(null, undefined, 'fr')).toBe('ja')
  })
  it('품질값 0·잘못된 값·지원하지 않는 언어를 선택하지 않는다', () => {
    expect(resolveLanguage('xx', 'xx', 'en;q=0,ko;q=0.8,ja;q=0.9')).toBe('ja')
    expect(resolveLanguage(null, undefined, 'en;q=invalid,ko;q=2')).toBe('ja')
    expect(normalizeLanguage('EN-us')).toBe('en')
  })
})
