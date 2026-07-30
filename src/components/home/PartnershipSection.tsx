'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import styles from './PartnershipSection.module.css'

const CONTACT_EMAIL = 'fkffksk20@gmail.com'

export default function PartnershipSection() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  // mailto:는 메일 클라이언트가 없는 환경에서 무작동 — 클립보드 복사 방식 사용
  function handleCopyEmail() {
    try {
      navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`
    }
  }

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
          <button type="button" className={styles.btnContact} onClick={handleCopyEmail}>
            {copied ? t('partnership.copied') : t('partnership.cta')}
          </button>
        </div>
      </div>
      <div className={styles.about}>
        <h3 className={styles.aboutTitle}>{t('partnership.aboutTitle')}</h3>
        <p className={styles.aboutBody}>{t('partnership.aboutBody')}</p>
        <p className={styles.aboutMaintenance}>
          {t('partnership.aboutMaintenance')} — <Link href="/accuracy" className={styles.aboutLink}>Accuracy Audit →</Link>
        </p>
        <p className={styles.aboutEmail}>
          <span className={styles.emailLabel}>{t('partnership.emailLabel')}:</span> {CONTACT_EMAIL}
        </p>
      </div>
    </section>
  )
}
