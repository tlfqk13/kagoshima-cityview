'use client'
import { useTranslation } from 'react-i18next'
import type { RouteStop, Lang } from '@/lib/routes'
import type { Hotel, HotelStops } from '@/lib/hotels'
import { IconBed, IconWalk } from '@/components/icons'
import styles from './HotelBanner.module.css'

interface Props {
  hotel: Hotel
  hotelStops: HotelStops
  selectedStopId: string | null
  onSelect: (stop: RouteStop) => void
}

// 호텔 POP의 QR로 들어온 화면 — "타는 정류장"과 "돌아올 때 내리는 정류장"을 한 번에 보여준다.
// 시티뷰는 한 방향 순환이라 둘이 다를 수 있다(天文館: 갈 때 No.3, 올 때 No.19).
export default function HotelBanner({ hotel, hotelStops, selectedStopId, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (['ko', 'en', 'ja'].includes(i18n.language) ? i18n.language : 'ja') as Lang
  const { board, alight, boardMinutes, alightMinutes } = hotelStops
  const sameStop = board.id === alight.id

  const rows: { key: string; label: string; stop: RouteStop; minutes: number }[] = [
    { key: 'board', label: t('map.hotel.board'), stop: board, minutes: boardMinutes },
  ]
  if (!sameStop) rows.push({ key: 'alight', label: t('map.hotel.alight'), stop: alight, minutes: alightMinutes })

  return (
    <section className={styles.banner} aria-label={t('map.hotel.from', { name: hotel.nameJa })}>
      <div className={styles.head}>
        <IconBed size={18} className={styles.icon} />
        <span className={styles.name}>{t('map.hotel.from', { name: hotel.nameJa })}</span>
      </div>
      <ul className={styles.rows}>
        {rows.map(row => {
          const active = row.stop.id === selectedStopId
          return (
            <li key={row.key}>
              <button
                type="button"
                className={`${styles.row} ${active ? styles.rowActive : ''}`}
                onClick={() => onSelect(row.stop)}
                aria-pressed={active}
              >
                <span className={styles.label}>{row.label}</span>
                <span className={styles.stop}>
                  <span className={styles.num}>No.{row.stop.number}</span> {row.stop.name[lang]}
                </span>
                <span className={styles.walk}>
                  <IconWalk size={13} /> {t('map.walkMin', { min: row.minutes })}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {sameStop && <p className={styles.note}>{t('map.hotel.sameStop')}</p>}
      <p className={styles.note}>{t('map.hotel.estimate')}</p>
    </section>
  )
}
