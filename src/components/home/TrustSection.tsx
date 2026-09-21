'use client'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getRoute } from '@/lib/routes'
import styles from './TrustSection.module.css'

const STAMPS = [
  { num: 'trust.stopsNum', label: 'trust.stopsLabel', tilt: -8 },
  { num: 'trust.langsNum', label: 'trust.langsLabel', tilt: 5 },
  { num: 'trust.costNum', label: 'trust.costLabel', tilt: -3 },
] as const

// 신뢰 근거 — 고무도장 3개 + 출처 메모
export default function TrustSection() {
  const { t } = useTranslation()
  const meta = getRoute('cityview')

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow} data-reveal="">{t('home.trustEyebrow')}</span>
        <ul className={styles.stamps}>
          {STAMPS.map((s, i) => (
            <li
              key={s.num}
              className={styles.stamp}
              data-reveal=""
              style={{ '--tilt': `${s.tilt}deg`, '--reveal-delay': `${0.12 * i}s` } as CSSProperties}
            >
              <span className={styles.num}>{t(s.num)}</span>
              <span className={styles.label}>{t(s.label)}</span>
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
