import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import EpisodeNav from '@/components/story/EpisodeNav'
import { getEpisode, getAllEpisodes } from '@/lib/devlog'
import styles from './episode.module.css'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllEpisodes('ko').map(ep => ({ slug: ep.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const episode = getEpisode(slug, 'ko')
  if (!episode) return {}
  return {
    title: `${episode.title} | 가고시마 시티뷰 버스 가이드`,
    description: episode.summary,
  }
}

export default async function EpisodePage({ params }: Props) {
  const { slug } = await params
  const episode = getEpisode(slug, 'ko')
  if (!episode) notFound()

  const allEpisodes = getAllEpisodes('ko')
  const idx = allEpisodes.findIndex(ep => ep.slug === slug)
  const prev = idx > 0 ? allEpisodes[idx - 1] : null
  const next = idx < allEpisodes.length - 1 ? allEpisodes[idx + 1] : null

  return (
    <>
      <Nav />
      <main className={styles.main}>
        <article className={styles.article}>
          <header className={styles.header}>
            <div className={styles.eyebrow}>
              {slug.split('-')[0]} / {episode.date}
            </div>
            <h1 className={styles.h1}>{episode.title}</h1>
            <p className={styles.summary}>{episode.summary}</p>
          </header>
          <div className={styles.body}>
            <MDXRemote source={episode.content} />
          </div>
          <EpisodeNav prev={prev} next={next} />
        </article>
      </main>
      <Footer />
    </>
  )
}
