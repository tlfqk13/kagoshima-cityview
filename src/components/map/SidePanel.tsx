'use client'
import type { BusStop } from '@/lib/stops'
import StopList from './StopList'
import StopDetail from './StopDetail'
import styles from './SidePanel.module.css'

interface Props {
  stops: BusStop[]
  selectedStop: BusStop | null
  onSelect: (stop: BusStop) => void
  sourceNote: string
}

export default function SidePanel({ stops, selectedStop, onSelect, sourceNote }: Props) {
  return (
    <aside className={styles.panel}>
      {selectedStop && <StopDetail stop={selectedStop} />}
      <StopList
        stops={stops}
        selectedId={selectedStop?.id ?? null}
        onSelect={onSelect}
      />
      <div className={styles.note}>{sourceNote}</div>
    </aside>
  )
}
