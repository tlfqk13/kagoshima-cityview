'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import AshParticles from './AshParticles'
import styles from './HeroScroll.module.css'

// 히어로 사진 — public/images/hero/sakurajima.jpg 에 파일을 추가하면 자동 적용
const HERO_PHOTO = '/images/hero/sakurajima.jpg'

// 스크롤 스크럽 히어로 — JS는 진행률(--p)만 갱신하고 연출은 CSS가 담당.
// 디버그: /?p=0.6 같이 p 파라미터로 진행률을 고정해 각 구간을 확인할 수 있다.
export default function HeroScroll() {
  const { t } = useTranslation()
  const wrapRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  // rAF 스크롤 루프와 파티클 canvas가 리렌더 없이 공유하는 진행률(0~1)
  const progressRef = useRef(0)
  // 사진 파일이 아직 없으면(로드 실패) 기존 그라디언트+실루엣 fallback 유지
  const [photoLoaded, setPhotoLoaded] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const sticky = stickyRef.current
    if (!wrap || !sticky) return

    const apply = (p: number) => {
      progressRef.current = p
      // --p는 sticky 요소에 직접 설정한다 (CSS의 .sticky { --p: 0 } 기본값이
      // wrap에 설정한 상속값을 가려버리므로)
      sticky.style.setProperty('--p', p.toFixed(4))
      sticky.classList.toggle(styles.pastCopy, p > 0.2)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true)
      apply(0)
      return
    }

    // 디버그 파라미터 — 진행률 고정 후 종료 (스크롤 리스너 미부착)
    const debugP = new URLSearchParams(window.location.search).get('p')
    if (debugP !== null) {
      apply(Math.min(1, Math.max(0, parseFloat(debugP) || 0)))
      return
    }

    let raf = 0
    const update = () => {
      raf = 0
      const total = wrap.offsetHeight - sticky.offsetHeight
      if (total <= 0) return
      apply(Math.min(1, Math.max(0, -wrap.getBoundingClientRect().top / total)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={wrapRef} className={`${styles.wrap} ${reduced ? styles.static : ''}`}>
      <div ref={stickyRef} className={styles.sticky}>
        {/* 사진 레이어 — 클립이 열리며 풀블리드로 전개 */}
        <div className={`${styles.photoLayer} ${photoLoaded ? styles.hasPhoto : ''}`}>
          <div className={styles.photoBg} aria-hidden="true">
            <div className={styles.volcano} />
          </div>
          <img
            src={HERO_PHOTO}
            alt="桜島"
            className={styles.photo}
            onLoad={() => setPhotoLoaded(true)}
            onError={() => setPhotoLoaded(false)}
          />
        </div>
        {/* 분화 후 잿빛으로 변하는 하늘 */}
        <div className={styles.skyTint} aria-hidden="true" />
        {/* 분화구의 火映(백열광) */}
        <div className={styles.glow} aria-hidden="true" />
        {/* 분화구에서 솟아오르는 연기 기둥 */}
        <div className={styles.plume} aria-hidden="true">
          <span /><span /><span />
        </div>
        {/* 화산뢰 — 분연 남동부의 방전 섬광 */}
        <div className={styles.boltWrap} aria-hidden="true">
          <div className={styles.flash} />
          <span className={styles.bolt} />
          <span className={styles.bolt} />
        </div>
        {/* 시야를 가로지르는 중간 연기층 */}
        <div className={styles.smokeMid} aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        {/* 저공에 깔리는 재 안개 */}
        <div className={styles.groundHaze} aria-hidden="true" />
        {/* 전면 연기층 — 화면을 덮은 뒤 다음 섹션이 뚫고 나옴 */}
        <div className={styles.smokeFront} aria-hidden="true">
          <span /><span /><span />
          <div className={styles.frontBase} />
        </div>
        {!reduced && <AshParticles progressRef={progressRef} />}
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            {t('hero.eyebrow')}
          </div>
          <h1 className={styles.h1}>
            {t('hero.h1line1')}<br />
            {t('hero.h1line2')}<br />
            {t('hero.h1line3')}
          </h1>
          <div className={styles.actions}>
            <Link href="/map" className={styles.btnPrimary}>{t('hero.ctaMap')} →</Link>
            <Link href="/story" className={styles.btnGhost}>{t('hero.ctaStory')}</Link>
          </div>
        </div>
        <div className={styles.scrollHint} aria-hidden="true">
          <span className={styles.scrollHintText}>{t('hero.scrollHint')}</span>
          <span className={styles.scrollHintLine} />
        </div>
      </div>
    </section>
  )
}
