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
  it('중국어는 지역·문자 태그와 관계없이 繁體中文으로 모은다', () => {
    for (const tag of ['zh', 'zh-TW', 'zh-HK', 'zh-Hant', 'zh-Hant-TW', 'zh_hant', 'zh-CN', 'zh-Hans']) expect(normalizeLanguage(tag)).toBe('zh-Hant')
    expect(resolveLanguage('zh-Hant', 'ja')).toBe('zh-Hant')
    expect(resolveLanguage(null, undefined, 'zh-TW,zh;q=0.9,en;q=0.8')).toBe('zh-Hant')
    expect(resolveLanguage(null, undefined, 'en;q=0.9,zh-HK;q=0.8')).toBe('en')
  })
})
