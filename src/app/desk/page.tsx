import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Nav from '@/components/Nav'
import DeskContent from '@/components/desk/DeskContent'
import { findHotel, getHotelStops } from '@/lib/hotels'
import { isDeskConfigured } from '@/lib/desk'
import { getServerLang } from '@/lib/serverLang'
import { MESSAGES } from '@/lib/messages'
import styles from './desk.module.css'

interface Props {
  searchParams: Promise<{ hotel?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  return { title: MESSAGES[lang].desk.title, robots: { index: false } } // 호텔 프런트 전용 — 색인 제외
}

// /desk?hotel=slug — 호텔 프런트용 통역 도우미. 호텔 POP·제안서에서만 안내하는 URL.
export default async function DeskPage({ searchParams }: Props) {
  const { hotel: slug } = await searchParams
  const hotel = findHotel(slug)
  if (!hotel) notFound()
  const stops = getHotelStops(hotel)
  return (
    <>
      <Nav />
      <main className={styles.main}>
        <DeskContent
          hotel={{ slug: hotel.slug, nameJa: hotel.nameJa }}
          board={{ id: stops.board.id, number: stops.board.number, name: stops.board.name, minutes: stops.boardMinutes }}
          alight={{ id: stops.alight.id, number: stops.alight.number, name: stops.alight.name, minutes: stops.alightMinutes }}
          configured={isDeskConfigured()}
        />
      </main>
    </>
  )
}
