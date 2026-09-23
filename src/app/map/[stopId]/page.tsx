import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MapPage from '../MapPage'
import { getStopsForRoute, nameKey } from '@/lib/routes'
import { getServerLang } from '@/lib/serverLang'
import { pageMetadata } from '@/lib/seo'

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
  const descSuffix = {
    ko: `정류장 No. ${stop.number}의 정확한 GPS 위치.`,
    en: `Accurate GPS location of bus stop No. ${stop.number}.`,
    ja: `停留所 No. ${stop.number}の正確なGPS位置。`,
    'zh-Hant': `站牌 No. ${stop.number}的正確GPS位置。`,
  } as const
  return pageMetadata(lang, {
    title: `${stop.name[nameKey(lang)]} (No. ${stop.number})`,
    description: `${stop.name.ko} · ${stop.name.en} · ${stop.name.ja} · ${stop.name.zh} — ${descSuffix[lang]}`,
    path: `/map/${stop.id}`,
  })
}

export default async function StopRoute({ params }: Props) {
  const { stopId } = await params
  if (!findStop(stopId)) notFound()
  return <MapPage initialStopId={stopId} />
}
