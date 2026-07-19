'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { EpisodeMeta } from '@/lib/devlog'
import styles from './EpisodeNav.module.css'

interface Props {
  prev: EpisodeMeta | null
  next: EpisodeMeta | null
}

export default function EpisodeNav({ prev, next }: Props) {
  const { t } = useTranslation()
  return (
    <nav className={styles.nav}>
      <div className={styles.side}>
        {prev && (
          <Link href={`/story/${prev.slug}`} className={styles.link}>
            <span className={styles.label}>← {t('devlog.prev')}</span>
            <span className={styles.title}>{prev.title}</span>
          </Link>
        )}
      </div>
      <div className={`${styles.side} ${styles.right}`}>
        {next && (
          <Link href={`/story/${next.slug}`} className={styles.link}>
            <span className={styles.label}>{t('devlog.next')} →</span>
            <span className={styles.title}>{next.title}</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
