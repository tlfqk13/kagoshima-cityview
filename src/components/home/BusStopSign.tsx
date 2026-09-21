'use client'
import { useTranslation } from 'react-i18next'
import { getRoute, getStopsForRoute } from '@/lib/routes'
import styles from './BusStopSign.module.css'

interface Props {
  className?: string
}

// 버스 정류장 표지판 일러스트 — 시간표 보드 값은 노선 JSON 메타데이터에서 읽는다.
export default function BusStopSign({ className }: Props) {
  const { t } = useTranslation()
  const route = getRoute('cityview')
  const stopCount = getStopsForRoute('cityview').length

  return (
    <div className={`${styles.sign} ${className ?? ''}`} aria-hidden="true">
      <div className={styles.disc}>
        <svg viewBox="0 0 40 30" className={styles.bus}>
          <rect x="3" y="3" width="34" height="20" rx="4" fill="currentColor" />
          <rect x="7" y="7" width="8" height="7" rx="1" fill="#FFFDF8" />
          <rect x="17" y="7" width="8" height="7" rx="1" fill="#FFFDF8" />
          <rect x="27" y="7" width="6" height="7" rx="1" fill="#FFFDF8" />
          <circle cx="11" cy="24" r="3.4" fill="currentColor" stroke="#FFFDF8" strokeWidth="1.6" />
          <circle cx="29" cy="24" r="3.4" fill="currentColor" stroke="#FFFDF8" strokeWidth="1.6" />
        </svg>
        <span className={styles.discTitle}>CITY VIEW</span>
        <span className={styles.discSub}>シティビュー</span>
      </div>
      <div className={styles.pole} />
      <div className={styles.board}>
        <div className={styles.boardHead}>{t('home.signBoard')}</div>
        <dl className={styles.rows}>
          {route.firstDeparture && (
            <div><dt>{t('map.firstBus')}</dt><dd>{route.firstDeparture}</dd></div>
          )}
          {route.lastDeparture && (
            <div><dt>{t('map.lastBus')}</dt><dd>{route.lastDeparture}</dd></div>
          )}
        </dl>
        <div className={styles.boardFoot}>
          {route.frequencyMin && <span>{t('home.signEvery', { min: route.frequencyMin })}</span>}
          <span>{t('home.signStops', { count: stopCount })}</span>
        </div>
      </div>
      <div className={styles.base} />
    </div>
  )
}
