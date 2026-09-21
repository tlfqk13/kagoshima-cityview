// 손으로 자른 종이 가장자리 필터 정의 — scrapbook.module.css의 .roughSheet가 참조한다.
// 레퍼런스(hirayasumi)와 같은 feTurbulence + feDisplacementMap 방식.
export default function RoughEdgeDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="kcv-rough-edge" x="-4%" y="-4%" width="108%" height="108%" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={4} seed={7} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
