'use client'
import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  className: string
  readyClassName: string
  children: ReactNode
}

// 스크랩북 등장 연출 — 하위의 [data-reveal] 요소가 화면에 들어오면 data-in을 붙인다.
// 숨김 CSS는 readyClassName이 붙은 뒤에만 적용되므로 JS가 없거나 실패해도 내용은 보인다.
// prefers-reduced-motion이면 연출 없이 그대로 표시한다.
export default function ScrapbookReveal({ className, readyClassName, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    // 첫 화면에 이미 보이는 요소는 숨기기 전에 바로 표시해 깜빡임을 막는다
    const viewportH = window.innerHeight
    for (const el of targets) {
      const rect = el.getBoundingClientRect()
      if (rect.top < viewportH * 0.92 && rect.bottom > 0) el.setAttribute('data-in', '')
    }
    root.classList.add(readyClassName)

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-in', '')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )
    for (const el of targets) {
      if (!el.hasAttribute('data-in')) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [readyClassName])

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  )
}
