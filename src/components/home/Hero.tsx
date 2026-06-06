'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import styles from './Hero.module.css'

export default function Hero() {
  const { t } = useTranslation()
  return (
    <section className={styles.hero}>
      <div className={styles.left}>
        <div className={styles.eyebrow}>
          {t('hero.eyebrow')}
        </div>
        <h1 className={styles.h1}>
          {t('hero.h1line1')}<br />
          {t('hero.h1line2')}<br />
          {t('hero.h1line3')}
        </h1>
        <div className={styles.actions}>
          <Link href="/map" className={styles.btnPrimary}>{t('hero.ctaMap')} →</Link>
          <Link href="/story" className={styles.btnGhost}>{t('hero.ctaStory')}</Link>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.volcano} aria-hidden="true" />
        <span className={styles.photoNote}>桜島 / 2026.05</span>
      </div>
    </section>
  )
}
