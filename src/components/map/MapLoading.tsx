'use client'
import { useTranslation } from 'react-i18next'
import styles from './MapLoading.module.css'

// 지도가 뜨기 전 자리 — 저속 회선에서 5초 넘게 빈 회색이던 구간에 "불러오는 중"을 보여준다
export default function MapLoading() {
  const { t } = useTranslation()
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>
      <span>{t('map.loading')}</span>
    </div>
  )
}
