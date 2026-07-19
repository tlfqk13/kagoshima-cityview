'use client'
import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import styles from './HeroScroll.module.css'

interface Props {
  /** HeroScroll의 스크롤 진행률(0~1). 리렌더 없이 ref로만 공유한다 */
  progressRef: MutableRefObject<number>
}

interface Particle {
  bx: number   // 기준 x — 여기에 sin 흔들림을 더해 그린다
  y: number
  r: number    // 반지름
  vy: number   // 낙하 속도
  amp: number  // 흔들림 진폭
  spd: number  // 흔들림 속도
  ph: number   // 흔들림 위상
  a: number    // 기본 알파
  dark: boolean // 어두운 재 입자 여부
  petal: boolean // 벚꽃잎 여부
  rot: number  // 꽃잎 회전 각
  rv: number   // 꽃잎 회전 속도 (뒤집히며 나부끼는 표현)
  shade: number // 꽃잎 색조 인덱스
}

// 벚꽃잎 색조 (桜色보다 한 단계 진하게 — 잿빛 배경에서도 읽히도록)
const PETAL_COLORS = ['#EF9FB4', '#E98AA6', '#F5B8C8']

// 화산재(연재) 파티클 — 가고시마의 "재가 눈처럼 내리는" 풍경에서 시작해,
// 스크롤 후반으로 갈수록 날리던 재가 벚꽃잎으로 바뀐다.
// 桜島(벚꽃 섬)의 이름처럼 "재가 꽃이 되는 섬"이라는 컨셉.
export default function AshParticles({ progressRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const MAX = window.innerWidth < 768 ? 45 : 100
    let w = 0
    let h = 0
    let raf = 0
    let running = true
    let t = 0

    const spawn = (randomY: boolean, petalProb: number): Particle => {
      const base: Particle = {
        bx: Math.random() * w,
        y: randomY ? Math.random() * h : -10,
        r: 0.8 + Math.random() * 1.8,
        vy: 0.25 + Math.random() * 0.7,
        amp: 10 + Math.random() * 20,
        spd: 0.3 + Math.random() * 0.7,
        ph: Math.random() * Math.PI * 2,
        a: 0.25 + Math.random() * 0.5,
        dark: Math.random() < 0.3,
        petal: false,
        rot: 0,
        rv: 0,
        shade: 0,
      }
      if (Math.random() < petalProb) morphToPetal(base)
      return base
    }

    // 재 입자를 벚꽃잎으로 변환 — 위치는 유지한 채 날리던 그 자리에서 꽃잎이 됨
    const morphToPetal = (pt: Particle) => {
      pt.petal = true
      pt.r = 3.2 + Math.random() * 2.4      // 재보다 크게
      pt.vy = 0.3 + Math.random() * 0.4     // 더 천천히
      pt.amp = 24 + Math.random() * 30      // 더 넓게 흔들림
      pt.spd = 0.5 + Math.random() * 0.8
      pt.a = 0.7 + Math.random() * 0.3
      pt.dark = false
      pt.rot = Math.random() * Math.PI * 2
      pt.rv = (Math.random() - 0.5) * 1.6
      pt.shade = Math.floor(Math.random() * PETAL_COLORS.length)
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    // 초기 개체군은 첫 프레임에 채운다 — 그 시점의 진행률(디버그 ?p= 포함)을 반영하기 위해
    const particles: Particle[] = []

    const loop = () => {
      if (!running) return
      raf = requestAnimationFrame(loop)
      t += 0.016
      const p = progressRef.current
      // 분화 후반으로 갈수록 재 밀도↑, 낙하↑
      const visible = Math.floor(MAX * (0.3 + 0.7 * p))
      const fall = 0.7 + p * 0.9
      const drift = 0.15 + p * 0.35 // 바람에 의한 좌향 드리프트
      const grow = 1 + p * 0.3      // 분화 후반의 신선한 재는 더 크게
      // 꽃잎 비율 — p 0.45부터 서서히 섞이기 시작해 p≈0.8에서 75%
      // (연기가 화면을 덮기 전에 충분히 보이도록 전반에 앞당겨 배치)
      const petalProb = p < 0.45 ? 0 : Math.min(0.75, ((p - 0.45) / 0.35) * 0.75)

      if (particles.length === 0) {
        for (let i = 0; i < MAX; i++) particles.push(spawn(true, petalProb))
      }

      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < visible; i++) {
        const pt = particles[i]
        // 날리던 재가 확률적으로 그 자리에서 꽃잎으로 변한다
        if (!pt.petal && petalProb > 0 && Math.random() < petalProb * 0.008) {
          morphToPetal(pt)
        }
        pt.y += pt.vy * (pt.petal ? fall * 0.75 : fall)
        pt.bx -= drift * (pt.petal ? 1.3 : 1)
        if (pt.y > h + 10) { Object.assign(pt, spawn(false, petalProb)) }
        if (pt.bx < -30) { pt.bx = w + 30 }
        const x = pt.bx + Math.sin(t * pt.spd + pt.ph) * pt.amp

        if (pt.petal) {
          // 벚꽃잎 — 회전하는 타원으로 나부끼는 표현
          ctx.save()
          ctx.translate(x, pt.y)
          ctx.rotate(pt.rot + t * pt.rv)
          ctx.beginPath()
          ctx.ellipse(0, 0, pt.r, pt.r * 0.62, 0, 0, Math.PI * 2)
          ctx.globalAlpha = pt.a
          ctx.fillStyle = PETAL_COLORS[pt.shade]
          ctx.fill()
          ctx.restore()
          ctx.globalAlpha = 1
        } else {
          ctx.beginPath()
          ctx.arc(x, pt.y, pt.r * grow, 0, Math.PI * 2)
          ctx.fillStyle = pt.dark
            ? `rgba(140, 135, 128, ${pt.a})`
            : `rgba(206, 201, 193, ${pt.a})`
          ctx.fill()
        }
      }
    }

    // 화면 밖에서는 정지
    const io = new IntersectionObserver(([entry]) => {
      const wasRunning = running
      running = entry.isIntersecting
      if (running && !wasRunning) loop()
    })
    io.observe(canvas)

    loop()
    window.addEventListener('resize', resize)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [progressRef])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
