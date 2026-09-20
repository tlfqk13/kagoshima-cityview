export const LANGUAGES = ['ko', 'en', 'ja'] as const
export type Language = typeof LANGUAGES[number]

export function normalizeLanguage(value: string | null | undefined): Language | undefined {
  const language = value?.trim().toLowerCase().split(/[-_]/)[0]
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
