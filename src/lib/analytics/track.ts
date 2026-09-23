'use client'
import { ENTRY_SOURCES, type EntrySource, type EventName } from './events'

// 클라이언트 전송기. sendBeacon으로 페이지 이탈 중에도 유실 없이 보낸다.
// Do Not Track 브라우저는 존중해 아무것도 보내지 않는다.
const SESSION_KEY = 'cv-session'
const ENTRY_KEY = 'cv-entry'

function sessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/** 첫 진입 URL의 ?hotel= / ?src= 를 세션 동안 기억한다 (POP QR → 이후 페이지까지 같은 진입 경로로 집계) */
export function rememberEntry(): EntrySource {
  try {
    const saved = sessionStorage.getItem(ENTRY_KEY) as EntrySource | null
    if (saved && (ENTRY_SOURCES as readonly string[]).includes(saved)) return saved
    const params = new URLSearchParams(window.location.search)
    const src = params.get('src')
    const entry: EntrySource = params.get('hotel') ? 'hotel'
      : src === 'stop' || src === 'poster' || src === 'site' ? src
      : 'direct'
    sessionStorage.setItem(ENTRY_KEY, entry)
    return entry
  } catch {
    return 'direct'
  }
}

export function track(name: EventName, props: { k?: string; v?: string; lang: string }) {
  if (typeof window === 'undefined') return
  if (navigator.doNotTrack === '1') return
  const s = sessionId()
  if (!s) return
  const body = JSON.stringify({ n: name, k: props.k, v: props.v, lang: props.lang, entry: rememberEntry(), s })
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/e', new Blob([body], { type: 'application/json' }))
    } else {
      void fetch('/api/e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
    }
  } catch {
    // 통계는 실패해도 화면에 영향을 주지 않는다
  }
}
