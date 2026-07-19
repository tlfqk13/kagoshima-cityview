import Nav from '@/components/Nav'
import HeroScroll from '@/components/home/HeroScroll'
import TrustSection from '@/components/home/TrustSection'
import ProblemGrid from '@/components/home/ProblemGrid'
import PartnershipSection from '@/components/home/PartnershipSection'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <HeroScroll />
        <TrustSection />
        <ProblemGrid />
        <PartnershipSection />
      </main>
      <Footer />
    </>
  )
}
