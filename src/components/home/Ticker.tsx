'use client'
import { useTranslation } from 'react-i18next'
import { accuracySummary } from '@/lib/accuracy'
import styles from './Ticker.module.css'

// 흐르는 띠 — 신뢰 근거 문구를 반복 표시. 스크린리더에는 한 번만 읽히도록 복제본은 aria-hidden.
export default function Ticker() {
  const { t } = useTranslation()
  const items = [
    `${t('trust.stopsNum')} · ${t('trust.stopsLabel')}`,
    `${accuracySummary.wrongCount} · ${t('trust.googleWrongLabel', { m: accuracySummary.worst.errorMeters })}`,
    t('home.tickerNextBus'),
    t('trust.langsLabel'),
    t('trust.source'),
  ]

  const row = (hidden: boolean) => (
    <ul className={styles.row} aria-hidden={hidden || undefined}>
      {items.map(item => (
        <li key={item} className={styles.item}>
          <span className={styles.dot} aria-hidden="true">✳</span>
          {item}
        </li>
      ))}
    </ul>
  )

  return (
    <div className={styles.ticker}>
      <div className={styles.track}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
