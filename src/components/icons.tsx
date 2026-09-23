import type { SVGProps } from 'react'

// 단색 선 아이콘 — 이모지 대신 사용해 OS마다 모양·색이 달라지는 문제를 없앤다.
// currentColor로 그리므로 글자색 토큰을 그대로 따른다. 장식이므로 기본 aria-hidden.
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

// 전체 — 접힌 지도
export const IconMap = (p: IconProps) => (
  <Svg {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></Svg>
)
// 관광 — 도리이
export const IconTorii = (p: IconProps) => (
  <Svg {...p}><path d="M3 5c6 1.3 12 1.3 18 0M5 9h14M7 6.5V20M17 6.5V20" /></Svg>
)
// 자연 — 물결과 산
export const IconNature = (p: IconProps) => (
  <Svg {...p}><path d="m3 15 5-7 4 5 3-3 6 5" /><path d="M3 19c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" /></Svg>
)
// 맛집 — 그릇과 젓가락
export const IconBowl = (p: IconProps) => (
  <Svg {...p}><path d="M3 12h18a9 9 0 0 1-18 0Z" /><path d="m14 3-3 9M19 4l-5 8" /></Svg>
)
// 쇼핑 — 가방
export const IconBag = (p: IconProps) => (
  <Svg {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>
)
export const IconBus = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="3" width="16" height="14" rx="3" /><path d="M4 11h16M8 21v-4M16 21v-4" /><circle cx="8" cy="14" r=".6" fill="currentColor" /><circle cx="16" cy="14" r=".6" fill="currentColor" /></Svg>
)
export const IconMoon = (p: IconProps) => (
  <Svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></Svg>
)
// 아일랜드뷰 — 사쿠라지마
export const IconVolcano = (p: IconProps) => (
  <Svg {...p}><path d="m2 20 7-10h6l7 10H2Z" /><path d="M10 10c0-2 1-3 2-3s2 1 2 3" /><path d="M11 4c.5-1 1.5-1 2 0" /></Svg>
)
// 지도 스타일 — 위성
export const IconSatellite = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></Svg>
)
export const IconWalk = (p: IconProps) => (
  <Svg {...p}><circle cx="13" cy="4" r="1.6" /><path d="m9 21 2.5-6.5L14 17v4M8 11l3-4 3 1.5 2.5 3M11 7l-.5 4.5 3.5 2.5" /></Svg>
)
export const IconBed = (p: IconProps) => (
  <Svg {...p}><path d="M3 18V8M3 12h18v6M3 15h18M21 18v-6a2 2 0 0 0-2-2h-8v4" /><circle cx="7" cy="10" r="1.6" /></Svg>
)
export const IconPlay = (p: IconProps) => (
  <Svg {...p}><path d="M8 5v14l11-7L8 5Z" fill="currentColor" /></Svg>
)
export const IconPause = (p: IconProps) => (
  <Svg {...p}><path d="M8 5v14M16 5v14" strokeWidth={3} /></Svg>
)
export const IconWarn = (p: IconProps) => (
  <Svg {...p}><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4.5M12 17.2v.3" /></Svg>
)
export const IconCopy = (p: IconProps) => (
  <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Svg>
)
export const IconMenu = (p: IconProps) => (
  <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
)
export const IconClose = (p: IconProps) => (
  <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
)
export const IconClock = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
)
