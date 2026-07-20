import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import AccuracyContent from '@/components/accuracy/AccuracyContent'
import { getServerLang } from '@/lib/serverLang'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

const messages = { ko, en, ja }

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const t = messages[lang].accuracy
  return {
    title: `${t.title} | 가고시마 시티뷰 버스 가이드`,
    description: t.intro,
  }
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
