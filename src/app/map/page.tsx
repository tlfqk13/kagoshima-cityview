import type { Metadata } from 'next'
import MapPage from './MapPage'
import type { RouteId } from '@/lib/routes'

export const metadata: Metadata = {
  title: '정류장 지도 | 가고시마 시티뷰 버스 가이드',
  description:
    '가고시마 시티뷰 버스 20개 정류장의 정확한 GPS 위치 지도. Kagoshima City View bus stop map. カゴシマシティビュー停留所マップ.',
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
