// 이용 통계 이벤트 정의 — 클라이언트와 서버가 같은 목록을 쓴다.
// 원칙: 개인을 식별할 수 있는 값은 이 파일에 존재하지 않는다. 좌표·IP·이름·본문은 받지 않는다.

export const EVENT_NAMES = [
  'stop_view',    // 정류장 상세 열람 — k: stopId
  'hotel_mode',   // 호텔 POP QR로 진입 — k: hotel slug
  'faq_click',    // FAQ 버튼 — k: stopId, v: 버튼(next|dest|back|last|fare)
  'open_maps',    // 「지도 앱으로 열기」 — k: stopId, v: google|apple
  'locate',       // 현위치 사용 — k: 최근접 stopId, v: 거리 구간(lt50|lt200|lt500|far). 좌표는 보내지 않는다
  'desk_ask',     // 프런트 도우미 질문 — k: hotel slug, v: 투숙객 언어. 질문 본문은 보내지 않는다
  'pwa_install',  // 홈 화면 추가
] as const
export type EventName = typeof EVENT_NAMES[number]

/** 어디서 들어왔나 — 종이(POP·포스터)의 효과를 재는 축 */
export const ENTRY_SOURCES = ['hotel', 'stop', 'poster', 'site', 'direct'] as const
export type EntrySource = typeof ENTRY_SOURCES[number]

export const LANG_CODES = ['ja', 'ko', 'en', 'zh-Hant'] as const

export interface EventPayload {
  n: EventName
  k?: string
  v?: string
  lang: string
  entry: EntrySource
  /** 브라우저를 닫으면 사라지는 임시 세션 ID. 서버는 날짜별 솔트로 해시해 원본을 저장하지 않는다 */
  s: string
}

// 거리(m) → 구간. 관광과 리포트의 "헤맴 지표"
export function distanceBand(meters: number): 'lt50' | 'lt200' | 'lt500' | 'far' {
  if (meters < 50) return 'lt50'
  if (meters < 200) return 'lt200'
  if (meters < 500) return 'lt500'
  return 'far'
}
