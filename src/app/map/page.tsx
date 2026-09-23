import type { Metadata } from 'next'
import MapPage from './MapPage'
import type { RouteId } from '@/lib/routes'
import { getServerLang } from '@/lib/serverLang'
import { pageMetadata, seoText } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const seo = seoText(lang)
  return pageMetadata(lang, { title: seo.mapTitle, description: seo.mapDescription, path: '/map' })
}

const VALID_ROUTES: RouteId[] = ['cityview', 'cityview-night', 'islandview']

export default async function MapRoute({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; stop?: string; hotel?: string }>
}) {
  const { route, stop, hotel } = await searchParams
  const routeId: RouteId = VALID_ROUTES.includes(route as RouteId)
    ? (route as RouteId)
    : 'cityview'
  return <MapPage initialRouteId={routeId} initialStopId={stop} initialHotelSlug={hotel} />
}
