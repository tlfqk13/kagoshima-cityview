'use client'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { getStopById, type Lang } from '@/lib/routes'
import { accuracySummary } from '@/lib/accuracy'
import Scribble from './Scribble'
import styles from './ProblemGrid.module.css'

const PROBLEM_KEYS = ['item1', 'item2', 'item3'] as const
const NOTE_TILTS = [-2.2, 1.6, -1]

// 비교 결과 중 가장 크게 어긋난 정류장 — 손그림 지도의 예시로 쓴다
const { worst, auditedAt } = accuracySummary

export default function ProblemGrid() {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ja') as Lang
  const worstStop = getStopById('cityview', worst.id)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head} data-reveal="">
          <span className={styles.eyebrow}>{t('home.problemEyebrow')}</span>
          <h2 className={styles.h2}>
            {t('problem.title').split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h2>
        </header>

        <div className={styles.layout}>
          {/* 손그림 지도 — 지도 앱 핀과 실제 정류장의 거리 차이 */}
          <figure className={styles.sketch} data-reveal="" style={{ '--tilt': '-1.2deg' } as CSSProperties}>
            <span className={styles.tape} aria-hidden="true" />
            <svg viewBox="0 0 360 250" className={styles.map} role="img" aria-label={t('home.sketchGap', { m: worst.errorMeters })}>
              {/* 거리 블록 */}
              <g className={styles.blocks}>
                <rect x="14" y="16" width="96" height="64" rx="4" />
                <rect x="128" y="16" width="120" height="64" rx="4" />
                <rect x="266" y="16" width="80" height="64" rx="4" />
                <rect x="14" y="118" width="96" height="116" rx="4" />
                <rect x="266" y="118" width="80" height="116" rx="4" />
                <rect x="128" y="160" width="120" height="74" rx="4" />
              </g>
              {/* 버스 노선 */}
              <path className={styles.routeLine} d="M0 99 H360" />
              <path className={styles.routeLine} d="M119 250 V99" />
              {/* 지도 앱 핀 */}
              <g className={styles.wrongPin} transform="translate(196 118)">
                <path d="M0 0c-9-12-14-19-14-26a14 14 0 1 1 28 0c0 7-5 14-14 26z" />
                <text x="0" y="-22" textAnchor="middle">?</text>
              </g>
              {/* 실제 정류장 */}
              <g className={styles.realStop} transform="translate(64 99)">
                <circle r="11" />
                <circle r="3.5" className={styles.realDot} />
              </g>
              {/* 거리 표시 */}
              <path className={styles.gap} d="M78 128 C110 150 150 150 184 126" />
            </svg>
            <Scribble variant="circle" className={styles.realCircle} delay={0.7} />
            <span className={`${styles.label} ${styles.labelReal}`}>{t('home.sketchReal')}</span>
            <span className={`${styles.label} ${styles.labelWrong}`}>{t('home.sketchWrong')}</span>
            <span className={styles.gapLabel}>{t('home.sketchGap', { m: worst.errorMeters })}</span>
            {worstStop && (
              <figcaption className={styles.caption}>
                {t('home.sketchCaption', { name: worstStop.name[lang], date: auditedAt })}
              </figcaption>
            )}
          </figure>

          {/* 메모지 3장 */}
          <ol className={styles.notes}>
            {PROBLEM_KEYS.map((key, i) => (
              <li
                key={key}
                className={styles.note}
                data-reveal=""
                style={{ '--tilt': `${NOTE_TILTS[i]}deg`, '--reveal-delay': `${0.12 * i}s` } as CSSProperties}
              >
                <span className={styles.pin} aria-hidden="true" />
                <span className={styles.num}>0{i + 1}</span>
                <p className={styles.body}>{t(`problem.${key}`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
