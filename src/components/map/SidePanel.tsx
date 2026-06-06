'use client'
import { useTranslation } from 'react-i18next'
import type { BusStop } from '@/lib/stops'
import StopList from './StopList'
import StopDetail from './StopDetail'
import StopSearch from './StopSearch'
import styles from './SidePanel.module.css'

interface Props {
  stops: BusStop[]
  selectedStop: BusStop | null
  onSelect: (stop: BusStop) => void
  sourceNote: string
  searchQuery: string
  onSearchChange: (v: string) => void
}

export default function SidePanel({ stops, selectedStop, onSelect, sourceNote, searchQuery, onSearchChange }: Props) {
  const { t } = useTranslation()
  return (
    <aside className={styles.panel}>
      {selectedStop && <StopDetail stop={selectedStop} />}
      <StopSearch value={searchQuery} onChange={onSearchChange} />
      {stops.length === 0 ? (
        <div className={styles.empty}>{t('map.noResults')}</div>
      ) : (
        <StopList
          stops={stops}
          selectedId={selectedStop?.id ?? null}
          onSelect={onSelect}
        />
      )}
      <div className={styles.note}>{sourceNote}</div>
    </aside>
  )
}
