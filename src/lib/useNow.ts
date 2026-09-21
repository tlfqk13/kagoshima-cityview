'use client'
import { useSyncExternalStore } from 'react'

// 30초 단위로 갱신되는 현재 시각. 서버 렌더링에서는 null을 돌려
// 서버·클라이언트 시각 차이로 인한 hydration 불일치를 막는다.
const TICK_MS = 30_000

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK_MS)
  return () => clearInterval(id)
}

const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS
const getServerSnapshot = () => null

export function useNow(): Date | null {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return now === null ? null : new Date(now)
}
