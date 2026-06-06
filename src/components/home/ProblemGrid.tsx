'use client'
import { useTranslation } from 'react-i18next'
import styles from './ProblemGrid.module.css'

const PROBLEM_KEYS = ['item1', 'item2', 'item3'] as const

export default function ProblemGrid() {
  const { t } = useTranslation()

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>
          {t('problem.title').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </h2>
        <div className={styles.grid}>
          {PROBLEM_KEYS.map((key, i) => (
            <div key={key} className={styles.cell}>
              <div className={styles.num}>0{i + 1}</div>
              <p className={styles.body}>{t(`problem.${key}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
