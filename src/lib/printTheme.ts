import type { CSSProperties } from 'react'
import type { Hotel } from '@/lib/hotels'

// 인쇄물(POP·포스터)의 호텔별 색 — 호텔 이미지 컬러에 맞춰 만든다.
// 우선순위: ?accent=/?dark= (영업용 미리보기) → hotels.json 의 theme → 기본(시티뷰 갈색·먹색).
// 로고는 호텔 허락이 있을 때만 쓰므로 여기서는 색만 다룬다.
export interface PrintTheme {
  accent: string
  dark: string
}

export const DEFAULT_PRINT_THEME: PrintTheme = { accent: '#8B4513', dark: '#1F1E1A' }

const HEX = /^#?([0-9a-f]{6})$/i

/** "1a5c3a" / "#1A5C3A" → "#1A5C3A". 형식이 아니면 undefined (임의 CSS 주입 방지) */
export function parseHex(value: string | undefined): string | undefined {
  const m = value?.trim().match(HEX)
  return m ? `#${m[1].toUpperCase()}` : undefined
}

/** 흰 글자를 올려도 읽히는지(어두운 바탕) — 상대 휘도 기준 */
function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return (1.05) / (L + 0.05) >= 4.5 // 흰 글자 대비 4.5:1 이상
}

export function resolvePrintTheme(hotel: Hotel | undefined, query: { accent?: string; dark?: string }): PrintTheme {
  const accent = parseHex(query.accent) ?? parseHex(hotel?.theme?.accent) ?? DEFAULT_PRINT_THEME.accent
  const darkCandidate = parseHex(query.dark) ?? parseHex(hotel?.theme?.dark) ?? DEFAULT_PRINT_THEME.dark
  // 띠·헤더는 흰 글자를 올리므로 밝은 색이 오면 기본 먹색으로 되돌린다
  const dark = isDark(darkCandidate) ? darkCandidate : DEFAULT_PRINT_THEME.dark
  return { accent, dark }
}

export function printThemeStyle(theme: PrintTheme): CSSProperties {
  return { '--print-accent': theme.accent, '--print-dark': theme.dark } as CSSProperties
}
