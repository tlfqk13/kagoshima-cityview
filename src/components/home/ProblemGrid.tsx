'use client'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { tenmonkanCase } from '@/lib/accuracy'
import styles from './ProblemGrid.module.css'

const PROBLEM_KEYS = ['item1', 'item2', 'item3'] as const
const NOTE_TILTS = [-2.2, 1.6, -1]

export default function ProblemGrid() {
  const { t } = useTranslation()

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
          {/* 실제 지도 그림 — 天文館: 지도 앱의 핀 1개 vs 실제 정류장 2곳. scripts/render-tenmonkan-figure.mjs 가 생성 */}
          <figure className={styles.sketch} data-reveal="" style={{ '--tilt': '-1.2deg' } as CSSProperties}>
            <span className={styles.tape} aria-hidden="true" />
            <Image
              src="/images/home/tenmonkan-map.jpg"
              alt={t('home.figAlt')}
              width={960}
              height={620}
              sizes="(max-width: 1023px) 92vw, 560px"
              className={styles.figImg}
            />
            <ul className={styles.legend}>
              <li><span className={`${styles.swatch} ${styles.swatchWrong}`} aria-hidden="true">?</span>{t('home.figWrong')}</li>
              <li><span className={`${styles.swatch} ${styles.swatchReal}`} aria-hidden="true">3</span>{t('home.figReal')}</li>
            </ul>
            <figcaption className={styles.caption}>
              {t('home.figCaption', { a: tenmonkanCase.toNo3, b: tenmonkanCase.toNo19, date: tenmonkanCase.auditedAt })}
              {' '}<Link href="/map/stop_03" className={styles.figLink}>{t('home.figLink')} →</Link>
              <span className={styles.credit}>{t('home.figCredit')}</span>
            </figcaption>
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
