'use client'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/lib/routes'
import styles from './CategoryChips.module.css'

const CATEGORIES: { key: Category | 'all'; icon: string }[] = [
  { key: 'all', icon: '🗺️' },
  { key: 'sightseeing', icon: '🏯' },
  { key: 'nature', icon: '🌊' },
  { key: 'food', icon: '🍜' },
  { key: 'shopping', icon: '🛍️' },
]

interface Props {
  active: Category | 'all'
  onChange: (cat: Category | null) => void
}

export default function CategoryChips({ active, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className={styles.row} role="group" aria-label={t('map.categoryFilter')}>
      {CATEGORIES.map(({ key, icon }) => (
        <button
          key={key}
          className={`${styles.chip} ${active === key ? styles.on : ''}`}
          onClick={() => onChange(key === 'all' ? null : key)}
          aria-pressed={active === key}
        >
          <span aria-hidden="true">{icon}</span>
          {t(`map.categories.${key}`)}
        </button>
      ))}
    </div>
  )
}
