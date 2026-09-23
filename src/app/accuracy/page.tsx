import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import AccuracyContent from '@/components/accuracy/AccuracyContent'
import { getServerLang } from '@/lib/serverLang'
import { pageMetadata } from '@/lib/seo'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

const messages = { ko, en, ja }

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const t = messages[lang].accuracy
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
