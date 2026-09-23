export const LANGUAGES = ['ko', 'en', 'ja', 'zh-Hant'] as const
export type Language = typeof LANGUAGES[number]

/**
 * 언어 태그를 지원 언어로 정규화한다.
 * 중국어는 지역·문자 하위 태그(zh, zh-TW, zh-HK, zh-Hant-*)와 관계없이 모두 繁體中文으로 모은다.
 * 간체(zh-CN, zh-Hans) 자원은 아직 없으므로 당분간 繁體로 안내한다(ADR 008).
 */
export function normalizeLanguage(value: string | null | undefined): Language | undefined {
  const language = value?.trim().toLowerCase().split(/[-_]/)[0]
  if (language === 'zh') return 'zh-Hant'
  return LANGUAGES.find(item => item === language)
}

/** 공유 URL → 저장된 선택 → 브라우저 선호 언어 → 일본어 순으로 결정한다. */
export function resolveLanguage(query: string | null, cookie?: string, acceptLanguage?: string | null): Language {
  const explicit = normalizeLanguage(query) ?? normalizeLanguage(cookie)
  if (explicit) return explicit
  const preferences = (acceptLanguage ?? '').split(',').map(value => {
    const [language, ...parameters] = value.trim().split(';')
    const quality = parameters.find(parameter => parameter.trim().startsWith('q='))
    return { language: normalizeLanguage(language), quality: quality ? Number(quality.trim().slice(2)) : 1 }
  }).filter(item => item.language && item.quality > 0 && item.quality <= 1)
    .sort((a, b) => b.quality - a.quality)
  return preferences[0]?.language ?? 'ja'
}
