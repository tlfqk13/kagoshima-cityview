import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import EpisodeNav from '@/components/story/EpisodeNav'
import { getEpisode, getAllEpisodes } from '@/lib/devlog'
import { getServerLang } from '@/lib/serverLang'
import styles from './episode.module.css'

interface Props {
  params: Promise<{ slug: string }>
}

// slug 목록은 ko 기준 (번역이 없는 에피소드는 devlog fallback으로 ko 제공)
export async function generateStaticParams() {
  return getAllEpisodes('ko').map(ep => ({ slug: ep.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const lang = await getServerLang()
  const episode = getEpisode(slug, lang)
  if (!episode) return {}
  return {
    title: `${episode.title} | 鹿児島シティビューバスガイド`,
    description: episode.summary,
  }
}

export default async function EpisodePage({ params }: Props) {
  const { slug } = await params
  const lang = await getServerLang()
  const episode = getEpisode(slug, lang)
  if (!episode) notFound()

  const allEpisodes = getAllEpisodes(lang)
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
