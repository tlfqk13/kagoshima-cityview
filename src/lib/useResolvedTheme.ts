'use client'
import { useSyncExternalStore } from 'react'

// ThemeProvider가 <html data-theme>에 적용한 실제 테마(light/dark)를 구독한다.
// 'system' 설정도 이미 해석된 값이므로 지도 스타일 등 외부 라이브러리 연동에 쓴다.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

const getSnapshot = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
const getServerSnapshot = () => 'light' as const

export function useResolvedTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
