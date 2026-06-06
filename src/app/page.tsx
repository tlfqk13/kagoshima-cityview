import Nav from '@/components/Nav'
import Hero from '@/components/home/Hero'
import TrustSection from '@/components/home/TrustSection'
import ProblemGrid from '@/components/home/ProblemGrid'
import PartnershipSection from '@/components/home/PartnershipSection'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustSection />
        <ProblemGrid />
        <PartnershipSection />
      </main>
      <Footer />
    </>
  )
}
