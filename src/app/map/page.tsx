import MapPage from './MapPage'
import type { RouteId } from '@/lib/routes'

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
