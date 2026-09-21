import type { CSSProperties } from 'react'

type Variant = 'circle' | 'underline' | 'arrow' | 'arrowLeft'

interface Props {
  variant: Variant
  className?: string
  /** 그리기 시작 지연(초) — 부모의 [data-in] 이후 */
  delay?: number
}

// 손으로 그린 동그라미·밑줄·화살표. pathLength=1로 정규화해 CSS가 그려지는 연출을 담당한다.
const PATHS: Record<Variant, { viewBox: string; d: string[] }> = {
  circle: {
    viewBox: '0 0 200 120',
    d: ['M112 10C60 6 14 26 10 60c-4 34 44 54 98 50 52-4 86-24 82-54-3-26-38-44-86-46-22-1-44 3-60 10'],
  },
  underline: {
    viewBox: '0 0 300 24',
    d: ['M4 16c40-8 92-10 150-7 50 3 96 2 142-6', 'M30 21c60-5 130-6 220-2'],
  },
  arrow: {
    viewBox: '0 0 120 80',
    d: ['M6 12c26 2 58 14 78 36 8 9 14 18 18 26', 'M88 60l14 14 4-20'],
  },
  arrowLeft: {
    viewBox: '0 0 120 80',
    d: ['M114 10C88 12 56 24 36 46c-8 9-14 18-18 26', 'M32 60 18 74l-4-20'],
  },
}

export default function Scribble({ variant, className, delay }: Props) {
  const { viewBox, d } = PATHS[variant]
  const style = delay === undefined ? undefined : ({ '--draw-delay': `${delay}s` } as CSSProperties)
  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={style}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-draw=""
    >
      {d.map((path, i) => (
        <path
          key={i}
          d={path}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={variant === 'underline' ? 3 : 2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
