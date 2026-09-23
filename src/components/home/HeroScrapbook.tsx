'use client'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import BusStopSign from './BusStopSign'
import Polaroid from './Polaroid'
import Scribble from './Scribble'
import { HOME_PHOTOS } from './photos'
import styles from './HeroScrapbook.module.css'

// 히어로 — 여행 스크랩북 첫 장. 사진(photos.ts의 hero) + 정류장 표지판 + 손글씨 메모.
export default function HeroScrapbook() {
  const { t } = useTranslation()

  return (
    <section className={styles.hero}>
      <div className={styles.copy} data-reveal="">
        <span className={styles.eyebrow}>{t('hero.eyebrow')}</span>
        <h1 className={styles.h1}>
          {t('hero.h1line1')}<br />
          {t('hero.h1line2')}<br />
          <span className={styles.mark}>
            {t('hero.h1line3')}
            <Scribble variant="underline" className={styles.underline} delay={0.6} />
          </span>
        </h1>
        <div className={styles.actions}>
          <Link href="/map" className={styles.btnPrimary}>{t('hero.ctaMap')} →</Link>
          <Link href="/story" className={styles.btnGhost}>{t('hero.ctaStory')}</Link>
        </div>
      </div>

      <div className={styles.visual}>
        <Polaroid
          src={HOME_PHOTOS.hero}
          alt={t('hero.photoAlt')}
          caption={t('home.heroCaption')}
          tilt={2.2}
          tape="corners"
          ratio={1.65}
          sizes="(max-width: 1023px) 92vw, 52vw"
          priority
          className={styles.photo}
          delay={0.1}
        />
        <div className={styles.signWrap} data-reveal="" style={{ '--reveal-delay': '0.35s' } as CSSProperties}>
          <BusStopSign className={styles.sign} />
          <Scribble variant="circle" className={styles.signCircle} delay={1} />
          <span className={styles.note}>
            {t('home.heroNote')}
            <Scribble variant="arrowLeft" className={styles.noteArrow} delay={1.3} />
          </span>
        </div>
      </div>
    </section>
  )
}
