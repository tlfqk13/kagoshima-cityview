import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import EpisodeCard from '@/components/story/EpisodeCard'
import { getAllEpisodes } from '@/lib/devlog'
import styles from './story.module.css'

export const metadata = {
  title: '개발 일지 | 가고시마 시티뷰 버스 가이드',
  description: '가고시마 시티뷰 버스 가이드 서비스 개발 과정을 담은 이야기',
}

export default function StoryPage() {
  const episodes = getAllEpisodes('ko')

  return (
    <>
      <Nav />
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <div className={styles.eyebrow}>개발 일지</div>
            <h1 className={styles.h1}>이 서비스가 만들어진 이야기</h1>
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
