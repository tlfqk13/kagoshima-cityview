'use client'
import { useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getRoute, getStopsForRoute, type Lang } from '@/lib/routes'
import Polaroid from './Polaroid'
import { HOME_PHOTOS, SPOTS } from './photos'
import styles from './SpotCards.module.css'

const CARD_TILTS = [-1.8, 1.4, -1, 2]

// 노선 한 바퀴 — 스크롤에 따라 버스가 달리는 노선 띠 + 들르기 좋은 정류장 카드
export default function SpotCards() {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ja') as Lang
  const route = getRoute('cityview')
  const stops = getStopsForRoute('cityview')
  const featured = new Set(SPOTS.map(s => s.stopId))
  const railRef = useRef<HTMLDivElement>(null)

  // 노선 띠가 화면을 지나가는 비율(0~1)을 --p로 넘기고, 버스 위치는 CSS가 계산한다
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const update = () => {
      raf = 0
      const rect = rail.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.9 - rect.top) / (vh * 0.9)))
      rail.style.setProperty('--p', p.toFixed(4))
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
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head} data-reveal="">
          <span className={styles.eyebrow}>{t('home.spotsEyebrow')}</span>
          <h2 className={styles.h2}>
            {t('home.spotsTitle', { min: route.loopDurationMin }).split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h2>
          <p className={styles.lead}>{t('home.spotsLead', { count: stops.length })}</p>
        </header>

        <div ref={railRef} className={styles.rail} role="img" aria-label={t('home.routeRailLabel', { count: stops.length })}>
          <div className={styles.road} />
          <ol className={styles.dots} aria-hidden="true">
            {stops.map(stop => (
              <li key={stop.id} className={featured.has(stop.id) ? styles.dotFeatured : styles.dot}>
                {featured.has(stop.id) && <span className={styles.dotNum}>{stop.number}</span>}
              </li>
            ))}
          </ol>
          <svg viewBox="0 0 40 26" className={styles.bus} aria-hidden="true">
            <rect x="2" y="2" width="36" height="17" rx="4" />
            <rect x="6" y="5.5" width="7" height="6" rx="1" className={styles.busWin} />
            <rect x="15" y="5.5" width="7" height="6" rx="1" className={styles.busWin} />
            <rect x="24" y="5.5" width="7" height="6" rx="1" className={styles.busWin} />
            <circle cx="11" cy="20" r="3.4" className={styles.busWheel} />
            <circle cx="29" cy="20" r="3.4" className={styles.busWheel} />
          </svg>
        </div>

        <ul className={styles.cards}>
          {SPOTS.map((spot, i) => {
            const stop = stops.find(s => s.id === spot.stopId)
            if (!stop) return null
            return (
              <li
                key={spot.key}
                className={styles.card}
                data-reveal=""
                style={{ '--tilt': `${CARD_TILTS[i] * 0.4}deg`, '--reveal-delay': `${0.1 * (i % 2)}s` } as CSSProperties}
              >
                <span className={styles.ribbon}>No.{String(stop.number).padStart(2, '0')}</span>
                <Polaroid
                  src={HOME_PHOTOS[spot.photo]}
                  alt={t(`home.spots.${spot.key}.title`)}
                  tilt={CARD_TILTS[i]}
                  tape={i % 2 === 0 ? 'top' : 'corners'}
                  ratio={1.35}
                  sizes="(max-width: 1023px) 88vw, 40vw"
                  reveal={false}
                  className={styles.cardPhoto}
                />
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{t(`home.spots.${spot.key}.title`)}</h3>
                  <p className={styles.cardText}>{t(`home.spots.${spot.key}.body`)}</p>
                  <div className={styles.cardBar}>
                    <span className={styles.cardStop}>
                      <span className={styles.cardStopNo}>{t('home.spotsStop', { num: stop.number })}</span>
                      {stop.name[lang]}
                    </span>
                    <Link href={`/map/${stop.id}`} className={styles.cardLink}>
                      {t('home.spotsCta')} →
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
