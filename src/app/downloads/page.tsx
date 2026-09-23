import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import DownloadsContent from '@/components/downloads/DownloadsContent'
import { getServerLang } from '@/lib/serverLang'
import { pageMetadata } from '@/lib/seo'
import { getStopsForRoute } from '@/lib/routes'
import { getAllHotels } from '@/lib/hotels'
import { MESSAGES } from '@/lib/messages'


export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const t = MESSAGES[lang].downloads
  return pageMetadata(lang, { title: t.title, description: t.intro, path: '/downloads' })
}

export default function DownloadsPage() {
  const stops = getStopsForRoute('cityview').map(s => ({ id: s.id, number: s.number, name: s.name }))
  return (
    <>
      <Nav />
      <main>
        <DownloadsContent stops={stops} hotels={getAllHotels()} />
      </main>
      <Footer />
    </>
  )
}
