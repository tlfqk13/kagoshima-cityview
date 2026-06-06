'use client'
import { useTranslation } from 'react-i18next'
import styles from './StopSearch.module.css'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function StopSearch({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.wrap}>
      <svg className={styles.icon} width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <input
        className={styles.input}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('map.searchPlaceholder')}
        aria-label={t('map.searchPlaceholder')}
      />
      {value && (
        <button
          className={styles.clear}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )
}
