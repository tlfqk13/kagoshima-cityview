'use client'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getRoute } from '@/lib/routes'
import { accuracySummary } from '@/lib/accuracy'
import styles from './TrustSection.module.css'

// 신뢰 근거 — 고무도장 3개 + 출처 메모.
// 사용자(관광객)에게 의미 있는 성과 수치만 둔다. "무료·광고 없음"은 사용자 가치가 아니라
// 도입하는 쪽(호텔·지자체)의 조건이므로 파트너 안내·제안서에서 다룬다.

export default function TrustSection() {
  const { t } = useTranslation()
  const meta = getRoute('cityview')
  const stamps = [
    { key: 'stops', num: t('trust.stopsNum'), label: t('trust.stopsLabel'), tilt: -8 },
    {
      key: 'wrong',
      num: String(accuracySummary.wrongCount),
      label: t('trust.googleWrongLabel', { m: accuracySummary.worst.errorMeters }),
      tilt: 5,
    },
    { key: 'langs', num: t('trust.langsNum'), label: t('trust.langsLabel'), tilt: -3 },
  ]

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow} data-reveal="">{t('home.trustEyebrow')}</span>
        <ul className={styles.stamps}>
          {stamps.map((s, i) => (
            <li
              key={s.key}
              className={styles.stamp}
              data-reveal=""
              style={{ '--tilt': `${s.tilt}deg`, '--reveal-delay': `${0.12 * i}s` } as CSSProperties}
            >
              <span className={styles.num}>{s.num}</span>
              <span className={styles.label}>{s.label}</span>
            </li>
          ))}
        </ul>
        <div className={styles.memo} data-reveal="" style={{ '--tilt': '1deg' } as CSSProperties}>
          <span className={styles.tape} aria-hidden="true" />
          <p className={styles.source}>{t('trust.source')}</p>
          <p className={styles.date}>
            {t('trust.validated')}: {meta.lastFieldVerifiedAt ?? meta.lastSourceCheckedAt}
          </p>
          <Link href="/accuracy" className={styles.accuracyLink}>{t('trust.accuracyLink')}</Link>
        </div>
      </div>
    </section>
  )
}
