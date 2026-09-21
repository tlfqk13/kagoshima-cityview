'use client'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/lib/routes'
import { IconBag, IconBowl, IconMap, IconNature, IconTorii } from '@/components/icons'
import styles from './CategoryChips.module.css'

const CATEGORIES: { key: Category | 'all'; Icon: typeof IconMap }[] = [
  { key: 'all', Icon: IconMap },
  { key: 'sightseeing', Icon: IconTorii },
  { key: 'nature', Icon: IconNature },
  { key: 'food', Icon: IconBowl },
  { key: 'shopping', Icon: IconBag },
]

interface Props {
  active: Category | 'all'
  onChange: (cat: Category | null) => void
  /** 지도 위에 띄우는 형태 (데스크톱) */
  floating?: boolean
}

export default function CategoryChips({ active, onChange, floating }: Props) {
  const { t } = useTranslation()

  return (
    <div className={`${styles.row} ${floating ? styles.floating : ''}`} role="group" aria-label={t('map.categoryFilter')}>
      {CATEGORIES.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          className={`${styles.chip} ${active === key ? styles.on : ''}`}
          onClick={() => onChange(key === 'all' ? null : key)}
          aria-pressed={active === key}
        >
          <Icon size={14} />
          {t(`map.categories.${key}`)}
        </button>
      ))}
    </div>
  )
}
