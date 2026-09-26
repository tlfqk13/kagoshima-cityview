'use client'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getRoute } from '@/lib/routes'
import { accuracySummary } from '@/lib/accuracy'
import { IconBus, IconQr, IconWalk } from '@/components/icons'
import styles from './TrustSection.module.css'

// 「このガイドが違う理由」— 주장 + 증거 카드 4장.
// ① 현지 확인(날짜 도장) ② 구글맵 비교(20점 띠, 감사 데이터에서 자동) ③ 공식 데이터 ④ 종이에서 지도로(QR).
// 숫자만 크게 찍는 도장은 근거가 안 된다는 판단으로 바꿨다. "4개 언어"는 기능이라 히어로·티커에만 둔다.

const DATA_SOURCE_URL = 'https://data.bodik.jp/dataset/462012_bus-kagoshimacity-kagoshima-jp'

export default function TrustSection() {
  const { t } = useTranslation()
  const meta = getRoute('cityview')
  const verifiedAt = meta.lastFieldVerifiedAt ?? meta.lastSourceCheckedAt
  const total = accuracySummary.stops.length

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <span className={styles.eyebrow} data-reveal="">{t('home.trustEyebrow')}</span>
        <h2 className={styles.title} data-reveal="">{t('trust.title')}</h2>

        {/* 20점 띠 — 정류장 번호순, 구글맵 오차 판정 */}
        <div className={styles.strip} data-reveal="">
          <ol className={styles.dots} aria-label={t('trust.stripAria', { total })}>
            {accuracySummary.stops.map(s => (
              <li key={s.id} className={`${styles.dot} ${styles[`dot_${s.grade}`]}`} title={`No.${s.number} · ${s.errorMeters}m`}>
                <span className={styles.dotNum}>{s.number}</span>
              </li>
            ))}
          </ol>
          <div className={styles.legend}>
            <span><i className={`${styles.swatch} ${styles.dot_ok}`} /> {t('trust.legendOk')}</span>
            <span><i className={`${styles.swatch} ${styles.dot_warn}`} /> {t('trust.legendWarn')}</span>
            <span><i className={`${styles.swatch} ${styles.dot_error}`} /> {t('trust.legendError')}</span>
          </div>
        </div>

        <ul className={styles.cards}>
          <li className={styles.card} data-reveal="" style={{ '--tilt': '-0.6deg' } as CSSProperties}>
            <span className={styles.stamp} aria-hidden="true">
              <span className={styles.stampTop}>{t('trust.stampLabel')}</span>
              <span className={styles.stampDate}>{verifiedAt}</span>
            </span>
            <h3 className={styles.cardTitle}>{t('trust.verify.title')}</h3>
            <p className={styles.cardBody}>{t('trust.verify.body', { total, date: verifiedAt })}</p>
          </li>
          <li className={styles.card} data-reveal="" style={{ '--tilt': '0.5deg', '--reveal-delay': '0.08s' } as CSSProperties}>
            <span className={styles.big}>{accuracySummary.offCount}<small>/{total}</small></span>
            <h3 className={styles.cardTitle}>{t('trust.compare.title')}</h3>
            <p className={styles.cardBody}>
              {t('trust.compare.body', { off: accuracySummary.offCount, total, m: accuracySummary.worst.errorMeters, num: Number(accuracySummary.worst.id.replace(/\D/g, '')) })}
            </p>
            <Link href="/accuracy" className={styles.cardLink}>{t('trust.accuracyLink')}</Link>
          </li>
          <li className={styles.card} data-reveal="" style={{ '--tilt': '0.4deg', '--reveal-delay': '0.16s' } as CSSProperties}>
            <span className={styles.tag}>CC BY 4.0</span>
            <h3 className={styles.cardTitle}>{t('trust.data.title')}</h3>
            <p className={styles.cardBody}>{t('trust.data.body')}</p>
            <a href={DATA_SOURCE_URL} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>{t('trust.data.link')}</a>
          </li>
          <li className={styles.card} data-reveal="" style={{ '--tilt': '-0.5deg', '--reveal-delay': '0.24s' } as CSSProperties}>
            <ol className={styles.steps} aria-label={t('trust.paper.title')}>
              <li><IconQr size={16} /> {t('trust.paper.step1')}</li>
              <li><IconWalk size={16} /> {t('trust.paper.step2')}</li>
              <li><IconBus size={16} /> {t('trust.paper.step3')}</li>
            </ol>
            <h3 className={styles.cardTitle}>{t('trust.paper.title')}</h3>
            <p className={styles.cardBody}>{t('trust.paper.body')}</p>
            <a href="#partners" className={styles.cardLink}>{t('trust.paper.link')}</a>
          </li>
        </ul>
      </div>
    </section>
  )
}
