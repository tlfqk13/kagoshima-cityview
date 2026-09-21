'use client'
import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { copyText } from '@/lib/clipboard'
import { HOME_PHOTOS } from './photos'
import styles from './PartnershipSection.module.css'

const CONTACT_EMAIL = 'fkffksk20@gmail.com'

// 관광과에 보내는 편지 — 왼쪽은 편지지, 오른쪽은 우표·소인이 찍힌 엽서 뒷면
export default function PartnershipSection() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  // mailto:는 메일 클라이언트가 없는 환경에서 무작동 — 클립보드 복사 우선, 실패 시 mailto
  async function handleCopyEmail() {
    if (await copyText(CONTACT_EMAIL)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      window.location.href = `mailto:${CONTACT_EMAIL}`
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <article className={styles.letter} data-reveal="" style={{ '--tilt': '-0.8deg' } as CSSProperties}>
          <p className={styles.to}>{t('home.letterTo')}</p>
          <h2 className={styles.h2}>
            {t('partnership.h2line1')}<br />
            {t('partnership.h2line2')}
          </h2>
          <p className={styles.body}>{t('partnership.body')}</p>
          <div className={styles.actions}>
            <Link href="/map" className={styles.btnMap}>{t('partnership.ctaMap')} →</Link>
            <button type="button" className={styles.btnContact} onClick={handleCopyEmail} aria-live="polite">
              {copied ? t('partnership.copied') : t('partnership.cta')}
            </button>
          </div>
        </article>

        <aside className={styles.postcard} data-reveal="" style={{ '--tilt': '1.6deg', '--reveal-delay': '0.15s' } as CSSProperties}>
          <div className={styles.postTop}>
            <div className={styles.stampFrame}>
              <Image src={HOME_PHOTOS.bay} alt="" fill sizes="96px" className={styles.stampImg} />
            </div>
            <div className={styles.postmark} aria-hidden="true">
              <span>KAGOSHIMA</span>
              <span className={styles.postmarkLine} />
              <span>CITY VIEW</span>
            </div>
          </div>
          <h3 className={styles.aboutTitle}>{t('partnership.aboutTitle')}</h3>
          <p className={styles.aboutBody}>{t('partnership.aboutBody')}</p>
          <p className={styles.aboutMaintenance}>
            {t('partnership.aboutMaintenance')} — <Link href="/accuracy" className={styles.aboutLink}>Accuracy Audit →</Link>
          </p>
          <p className={styles.aboutEmail}>
            <span className={styles.emailLabel}>{t('partnership.emailLabel')}</span>
            {CONTACT_EMAIL}
          </p>
        </aside>
      </div>
    </section>
  )
}
