import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import EpisodeCard from '@/components/story/EpisodeCard'
import { getAllEpisodes } from '@/lib/devlog'
import { getServerLang } from '@/lib/serverLang'
import { pageMetadata } from '@/lib/seo'
import { MESSAGES } from '@/lib/messages'
import Image from 'next/image'
import { HOME_PHOTOS } from '@/components/home/photos'
import styles from './story.module.css'


export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const t = MESSAGES[lang].devlog
  return pageMetadata(lang, { title: t.pageEyebrow, description: t.metaDescription, path: '/story' })
}

export default async function StoryPage() {
  const lang = await getServerLang()
  const t = MESSAGES[lang].devlog
  const episodes = getAllEpisodes(lang)

  return (
    <>
      <Nav />
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <div>
              <div className={styles.eyebrow}>{t.pageEyebrow}</div>
              <h1 className={styles.h1}>{t.pageHeading}</h1>
            </div>
            <div className={styles.postcard} aria-hidden="true">
              <Image src={HOME_PHOTOS.postcardFerry} alt="" fill sizes="(max-width: 1023px) 40vw, 220px" className={styles.postcardImg} />
            </div>
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
