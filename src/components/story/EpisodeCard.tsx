import Link from 'next/link'
import type { EpisodeMeta } from '@/lib/devlog'
import styles from './EpisodeCard.module.css'

interface Props {
  episode: EpisodeMeta
}

export default function EpisodeCard({ episode }: Props) {
  const num = episode.slug.split('-')[0]
  return (
    <Link href={`/story/${episode.slug}`} className={styles.card}>
      <div className={styles.num}>{num}</div>
      <div className={styles.content}>
        <h2 className={styles.title}>{episode.title}</h2>
        <p className={styles.summary}>{episode.summary}</p>
        <time className={styles.date} dateTime={episode.date}>{episode.date}</time>
      </div>
    </Link>
  )
}
