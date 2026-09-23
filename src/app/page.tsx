import Nav from '@/components/Nav'
import ScrapbookReveal from '@/components/home/ScrapbookReveal'
import RoughEdgeDefs from '@/components/home/RoughEdgeDefs'
import HeroScrapbook from '@/components/home/HeroScrapbook'
import Ticker from '@/components/home/Ticker'
import ProblemGrid from '@/components/home/ProblemGrid'
import SpotCards from '@/components/home/SpotCards'
import TrustSection from '@/components/home/TrustSection'
import PartnershipSection from '@/components/home/PartnershipSection'
import Footer from '@/components/home/Footer'
import styles from './page.module.css'
import type { Metadata } from 'next'
import { getServerLang } from '@/lib/serverLang'
import { SITE_NAME, pageMetadata, seoText } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const meta = pageMetadata(lang, { title: SITE_NAME[lang], description: seoText(lang).description, path: '/' })
  return { ...meta, title: { absolute: SITE_NAME[lang] } }
}

// 랜딩 — 여행 스크랩북: 정류장 표지판 히어로 → 만든 이유 → 노선 한 바퀴 → 신뢰 근거 → 호텔·관광안내소 안내
// 방문자는 대부분 QR로 들어온 관광객. 지자체(관광과) 대상 제안은 랜딩이 아니라 제안서 PDF와 직접 전달로 한다.
export default function HomePage() {
  return (
    <>
      <Nav />
      <RoughEdgeDefs />
      <ScrapbookReveal className={styles.paper} readyClassName={styles.ready}>
        <main>
          <HeroScrapbook />
          <Ticker />
          <ProblemGrid />
          <SpotCards />
          <TrustSection />
          <PartnershipSection />
        </main>
        <div className={styles.torn} aria-hidden="true" />
      </ScrapbookReveal>
      <Footer />
    </>
  )
}
