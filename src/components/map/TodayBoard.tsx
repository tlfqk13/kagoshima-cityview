'use client'
import { useTranslation } from 'react-i18next'
import { getNextDeparture, type RouteId, type RouteStop } from '@/lib/routes'
import { useNow } from '@/lib/useNow'
import { IconClock } from '@/components/icons'
import styles from './TodayBoard.module.css'

interface Props {
  routeId: RouteId
  stop: RouteStop
}

// 오늘의 운행 — 일본 시간 기준 다음 버스. 시간표에 근거한 목안이며 실시간 위치가 아니다.
export default function TodayBoard({ routeId, stop }: Props) {
  const { t } = useTranslation()
  const now = useNow()
  if (!stop.schedule || !now) return null

  const next = getNextDeparture(routeId, stop.schedule.departures, now)
  const arrival = stop.schedule.arrivalOnly

  return (
    <section className={`${styles.board} ${next.status === 'upcoming' ? styles.live : styles.quiet}`} aria-live="polite">
      <div className={styles.label}>
        <IconClock size={14} />
        {t('map.today.label')}
      </div>
      {next.status === 'upcoming' && (
        <div className={styles.row}>
          <span className={styles.caption}>{t(arrival ? 'map.today.nextArrival' : 'map.today.next')}</span>
          <span className={styles.time}>{next.time}</span>
          <span className={styles.until}>
            {next.minutesUntil === 0 ? t('map.today.now') : t('map.today.inMin', { min: next.minutesUntil })}
          </span>
        </div>
      )}
      {next.status === 'ended' && (
        <div className={styles.message}>
          {t('map.today.ended')}
          <span className={styles.sub}>{t('map.today.firstTomorrow', { time: next.firstTomorrow })}</span>
        </div>
      )}
      {next.status === 'noService' && <div className={styles.message}>{t('map.today.noService')}</div>}
      {next.status === 'unknown' && <div className={styles.message}>{t('map.today.unknown')}</div>}
      <p className={styles.basis}>{t('map.today.basis')}</p>
    </section>
  )
}
