import type { Metadata } from 'next'
import MapPage from './MapPage'
import type { RouteId } from '@/lib/routes'

export const metadata: Metadata = {
  title: '停留所マップ | 鹿児島シティビューバスガイド',
  description:
    '鹿児島シティビューバス20停留所の正確なGPS位置マップ。Kagoshima City View bus stop map. 가고시마 시티뷰 버스 정류장 지도.',
}

const VALID_ROUTES: RouteId[] = ['cityview', 'cityview-night', 'islandview']

export default async function MapRoute({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; stop?: string }>
}) {
  const { route, stop } = await searchParams
  const routeId: RouteId = VALID_ROUTES.includes(route as RouteId)
    ? (route as RouteId)
    : 'cityview'
  return <MapPage initialRouteId={routeId} initialStopId={stop} />
}
