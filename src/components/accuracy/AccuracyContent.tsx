'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getStopsForRoute, type Lang } from '@/lib/routes'
import rawAudit from '@/data/accuracy-audit.json'
import styles from './AccuracyContent.module.css'

interface AuditStop {
  id: string
  number: number
  googleName: string | null
  googleLat: number | null
  googleLng: number | null
  similarity: number | null
  errorMeters: number | null
  grade: 'ok' | 'warn' | 'error'
}

const audit = rawAudit as unknown as { auditedAt: string; baselineVerifiedAt: string; stops: AuditStop[] }
const stops = getStopsForRoute('cityview')
const auditById = new Map(audit.stops.map(s => [s.id, s]))

const GRADE_KEY = { ok: 'gradeOk', warn: 'gradeWarn', error: 'gradeError' } as const

// 구글맵 표시 위치 vs 공식 좌표 전수 감사 결과 공개 페이지
// 데이터: src/data/accuracy-audit.json (scripts/google-maps-audit 파이프라인 산출물)
export default function AccuracyContent() {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ko') as Lang

  const counts = { ok: 0, warn: 0, error: 0 }
  audit.stops.forEach(s => { counts[s.grade] += 1 })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{t('accuracy.eyebrow')}</div>
        <h1 className={styles.h1}>{t('accuracy.title')}</h1>
        <p className={styles.intro}>{t('accuracy.intro')}</p>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.num}>{counts.ok}</span>
          <span className={styles.label}>{t('accuracy.statOk')}</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.num} ${styles.numWarn}`}>{counts.warn}</span>
          <span className={styles.label}>{t('accuracy.statWarn')}</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.num} ${styles.numError}`}>{counts.error}</span>
          <span className={styles.label}>{t('accuracy.statError')}</span>
        </div>
      </div>

      <div className={styles.tableHead} aria-hidden="true">
        <span className={styles.colNo}>No.</span>
        <span className={styles.colStop}>{t('accuracy.colStop')}</span>
        <span className={styles.colGoogle}>{t('accuracy.colGoogle')}</span>
        <span className={styles.colError}>{t('accuracy.colError')}</span>
        <span className={styles.colGrade} />
      </div>
      <ol className={styles.list}>
        {stops.map(stop => {
          const a = auditById.get(stop.id)
          if (!a) return null
          return (
            <li key={stop.id} className={styles.row}>
              <span className={styles.colNo}>{stop.number}</span>
              <span className={styles.colStop}>
                <span className={styles.stopName}>{stop.name[lang]}</span>
                <span className={styles.stopNameJa}>{stop.name.ja}</span>
              </span>
              <span className={styles.colGoogle}>{a.googleName ?? '—'}</span>
              <span className={styles.colError}>
                {a.errorMeters !== null ? `${a.errorMeters}m` : '—'}
              </span>
              <span className={styles.colGrade}>
                <span className={`${styles.badge} ${styles[a.grade]}`}>
                  {t(`accuracy.${GRADE_KEY[a.grade]}`)}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      <p className={styles.sameSpot}>{t('accuracy.sameSpot')}</p>

      <div className={styles.note}>
        <p>{t('accuracy.baseline')}</p>
      </div>
      <p className={styles.method}>{t('accuracy.method')}</p>

      <div className={styles.actions}>
        <Link href="/map" className={styles.cta}>{t('accuracy.ctaMap')} →</Link>
      </div>
    </div>
  )
}
