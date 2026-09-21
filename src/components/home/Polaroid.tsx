import Image from 'next/image'
import type { CSSProperties } from 'react'
import styles from './Polaroid.module.css'

interface Props {
  src: string
  alt: string
  caption?: string
  /** 기울기(deg) — 스크랩북처럼 사진마다 조금씩 다르게 */
  tilt?: number
  tape?: 'top' | 'corners' | 'none'
  /** 사진 영역 비율 (가로/세로) */
  ratio?: number
  sizes: string
  priority?: boolean
  className?: string
  reveal?: boolean
  delay?: number
}

// 테이프로 붙인 폴라로이드 사진 — 실사 사진 교체 시 src만 바뀐다 (photos.ts)
export default function Polaroid({
  src, alt, caption, tilt = 0, tape = 'top', ratio = 4 / 3, sizes, priority, className, reveal = true, delay = 0,
}: Props) {
  const style = {
    '--tilt': `${tilt}deg`,
    '--reveal-delay': `${delay}s`,
    '--ratio': ratio,
  } as CSSProperties

  return (
    <figure
      className={`${styles.polaroid} ${className ?? ''}`}
      style={style}
      {...(reveal ? { 'data-reveal': '' } : {})}
    >
      {tape === 'top' && <span className={styles.tapeTop} aria-hidden="true" />}
      {tape === 'corners' && (
        <>
          <span className={styles.tapeLeft} aria-hidden="true" />
          <span className={styles.tapeRight} aria-hidden="true" />
        </>
      )}
      <div className={styles.photo}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={styles.img} />
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  )
}
