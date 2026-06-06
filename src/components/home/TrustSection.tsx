'use client'
import { useTranslation } from 'react-i18next'
import { getMetadata } from '@/lib/stops'
import styles from './TrustSection.module.css'

export default function TrustSection() {
  const { t } = useTranslation()
  const meta = getMetadata()

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.num}>{t('trust.stopsNum')}</span>
            <span className={styles.label}>{t('trust.stopsLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>{t('trust.langsNum')}</span>
            <span className={styles.label}>{t('trust.langsLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>{t('trust.costNum')}</span>
            <span className={styles.label}>{t('trust.costLabel')}</span>
          </div>
        </div>
        <div className={styles.source}>
          <span>{t('trust.source')}</span>
          <span className={styles.date}>{t('trust.validated')}: {meta.lastValidatedAt}</span>
        </div>
      </div>
    </section>
  )
}
