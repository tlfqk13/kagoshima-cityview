import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import EpisodeCard from '@/components/story/EpisodeCard'
import { getAllEpisodes } from '@/lib/devlog'
import { getServerLang } from '@/lib/serverLang'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'
import styles from './story.module.css'

const messages = { ko, en, ja }

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const t = messages[lang].devlog
  return {
    title: `${t.pageEyebrow} | 가고시마 시티뷰 버스 가이드`,
    description: t.metaDescription,
  }
}

export default async function StoryPage() {
  const lang = await getServerLang()
  const t = messages[lang].devlog
  const episodes = getAllEpisodes(lang)

  return (
    <>
      <Nav />
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <div className={styles.eyebrow}>{t.pageEyebrow}</div>
            <h1 className={styles.h1}>{t.pageHeading}</h1>
          </header>
          <div className={styles.list}>
            {episodes.map(ep => (
              <EpisodeCard key={ep.slug} episode={ep} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
