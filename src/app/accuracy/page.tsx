import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import AccuracyContent from '@/components/accuracy/AccuracyContent'
import { getServerLang } from '@/lib/serverLang'
import { pageMetadata } from '@/lib/seo'
import { MESSAGES } from '@/lib/messages'


export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const t = MESSAGES[lang].accuracy
  return pageMetadata(lang, { title: t.title, description: t.intro, path: '/accuracy' })
}

export default function AccuracyPage() {
  return (
    <>
      <Nav />
      <main>
        <AccuracyContent />
      </main>
      <Footer />
    </>
  )
}
