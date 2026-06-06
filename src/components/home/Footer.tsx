'use client'
import { useTranslation } from 'react-i18next'
import styles from './Footer.module.css'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <div className={styles.logo}>
          가고시마 <em>시티뷰</em> 버스 가이드
        </div>
      </div>
      <div className={styles.right}>
        <div>{t('footer.source')}</div>
        <div>
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('footer.license')}
          </a>
        </div>
        <div className={styles.disclaimer}>{t('footer.disclaimer')}</div>
      </div>
    </footer>
  )
}
