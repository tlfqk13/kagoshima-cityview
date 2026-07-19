import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MapPage from '../MapPage'
import { getStopsForRoute } from '@/lib/routes'
import { getServerLang } from '@/lib/serverLang'

interface Props {
  params: Promise<{ stopId: string }>
}

// /map/[stopId]는 시티뷰 노선 정류장만 지원 (기존 동작 유지)
function findStop(stopId: string) {
  return getStopsForRoute('cityview').find(s => s.id === stopId)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stopId } = await params
  const stop = findStop(stopId)
  if (!stop) return {}
  // UI 언어 쿠키(i18next)에 맞춰 타이틀 로컬라이즈
  const lang = await getServerLang()
  return {
    title: `${stop.name[lang]} (No. ${stop.number}) | 가고시마 시티뷰 버스 가이드`,
    description: `${stop.name.ko} · ${stop.name.en} · ${stop.name.ja} — 정류장 No. ${stop.number}의 정확한 GPS 위치.`,
  }
}

export default async function StopRoute({ params }: Props) {
  const { stopId } = await params
  if (!findStop(stopId)) notFound()
  return <MapPage initialStopId={stopId} />
}
