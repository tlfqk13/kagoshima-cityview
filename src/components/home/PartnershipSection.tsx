'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import styles from './PartnershipSection.module.css'

export default function PartnershipSection() {
  const { t } = useTranslation()

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <h2 className={styles.h2}>
            {t('partnership.h2line1')}<br />
            {t('partnership.h2line2')}
          </h2>
          <p className={styles.body}>{t('partnership.body')}</p>
        </div>
        <div className={styles.actions}>
          <Link href="/map" className={styles.btnMap}>{t('partnership.ctaMap')} →</Link>
          <a href="mailto:dev@bas-korea.com" className={styles.btnContact}>
            {t('partnership.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}
