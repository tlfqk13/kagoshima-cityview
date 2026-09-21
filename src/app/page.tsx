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

// 랜딩 — 여행 스크랩북: 정류장 표지판 히어로 → 만든 이유 → 노선 한 바퀴 → 신뢰 근거 → 관광과에 보내는 편지
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
