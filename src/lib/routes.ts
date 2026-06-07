import cityviewRaw from '@/data/routes/cityview.json'
import cityviewNightRaw from '@/data/routes/cityview-night.json'
import islandviewRaw from '@/data/routes/islandview.json'
import destinationsRaw from '@/data/destinations.json'

export type Lang = 'ko' | 'en' | 'ja'
export type Category = 'sightseeing' | 'food' | 'nature' | 'shopping'
export type RouteId = 'cityview' | 'cityview-night' | 'islandview'

export interface Destination {
  id: string
  stopId: string
  name: Record<Lang, string>
  walkMinutes: number
  category: Category
}

export interface Connection {
  type: 'ferry' | 'tram' | 'bus'
  to: string
  note: Record<Lang, string>
}

export interface RouteStop {
  id: string
  number: number
  lat: number
  lng: number
  coordinatesApproximate?: boolean
  courses?: string[]
  name: Record<Lang, string>
  googleMapsError?: boolean
  googleMapsErrorNote?: string
  googleMapsLat?: number
  googleMapsLng?: number
  photos?: string[]
  connections: Connection[]
  destinations: Destination[]
  schedule?: {
    departures: string[]
    operatingNote: Record<Lang, string>
  }
}

export interface RouteMetadata {
  routeId: RouteId
  name: Record<Lang, string>
  color: string
  fare: { adult: number; child: number }
  dayPass: { adult: number; child: number } | null
  operatingDays: 'daily' | 'saturday'
  seasonalExtra?: string[]
  loopDurationMin: number
  center: [number, number]
  zoom: number
  frequencyMin: number | null
  totalRuns: number | null
  firstDeparture: string | null
  lastDeparture: string | null
  coordinatesApproximate?: boolean
  sourceVersion: string
  lastUpdatedAt: string
  lastValidatedAt: string
  coordinateSource: string
  scheduleSource: string
  scheduleNote?: Record<Lang, string>
  disclaimer: Record<Lang, string>
}

interface RawRouteData {
  metadata: RouteMetadata
  stops: Omit<RouteStop, 'destinations'>[]
}

const allDestinations = destinationsRaw as Destination[]

const rawRoutes: Record<RouteId, RawRouteData> = {
  cityview: cityviewRaw as unknown as RawRouteData,
  'cityview-night': cityviewNightRaw as unknown as RawRouteData,
  islandview: islandviewRaw as unknown as RawRouteData,
}

function attachDestinations(stop: Omit<RouteStop, 'destinations'>): RouteStop {
  return {
    ...stop,
    connections: stop.connections ?? [],
    destinations: allDestinations.filter(d => d.stopId === stop.id),
  }
}

export const ROUTE_ORDER: RouteId[] = ['cityview', 'cityview-night', 'islandview']

export function getRoute(id: RouteId): RouteMetadata {
  return rawRoutes[id].metadata
}

export function getAllRoutes(): RouteMetadata[] {
  return ROUTE_ORDER.map(id => rawRoutes[id].metadata)
}

export function getStopsForRoute(routeId: RouteId): RouteStop[] {
  return rawRoutes[routeId].stops.map(attachDestinations)
}

export function getStopById(routeId: RouteId, stopId: string): RouteStop | undefined {
  const raw = rawRoutes[routeId].stops.find(s => s.id === stopId)
  return raw ? attachDestinations(raw) : undefined
}

export function getRouteCoordinates(routeId: RouteId): [number, number][] {
  return rawRoutes[routeId].stops
    .slice()
    .sort((a, b) => a.number - b.number)
    .map(s => [s.lng, s.lat])
}

export function getStopsGeoJSON(stops: RouteStop[]) {
  return {
    type: 'FeatureCollection' as const,
    features: stops.map(stop => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [stop.lng, stop.lat] },
      properties: {
        id: stop.id,
        number: stop.number,
        nameKo: stop.name.ko,
        nameEn: stop.name.en,
        nameJa: stop.name.ja,
        googleMapsError: stop.googleMapsError ?? false,
        coordinatesApproximate: stop.coordinatesApproximate ?? false,
        hasConnection: (stop.connections ?? []).length > 0,
      },
    })),
  }
}

export function getNearestStop(routeId: RouteId, lat: number, lng: number): RouteStop | null {
  const stops = getStopsForRoute(routeId)
  if (!stops.length) return null
  let nearest: RouteStop | null = null
  let minDist = Infinity
  for (const stop of stops) {
    const R = 6371000
    const dLat = ((stop.lat - lat) * Math.PI) / 180
    const dLng = ((stop.lng - lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) * Math.cos((stop.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (dist < minDist) { minDist = dist; nearest = stop }
  }
  return nearest
}

export function getStopsByCategory(routeId: RouteId, category: Category): RouteStop[] {
  const stopIds = new Set(allDestinations.filter(d => d.category === category).map(d => d.stopId))
  return getStopsForRoute(routeId).filter(s => stopIds.has(s.id))
}

export function searchStops(routeId: RouteId, query: string): RouteStop[] {
  if (!query.trim()) return getStopsForRoute(routeId)
  const q = query.toLowerCase().trim()
  return getStopsForRoute(routeId).filter(stop =>
    stop.name.ko.toLowerCase().includes(q) ||
    stop.name.en.toLowerCase().includes(q) ||
    stop.name.ja.toLowerCase().includes(q) ||
    stop.destinations.some(d =>
      d.name.ko.toLowerCase().includes(q) ||
      d.name.en.toLowerCase().includes(q) ||
      d.name.ja.toLowerCase().includes(q)
    )
  )
}

export function isRouteAvailableToday(routeId: RouteId): boolean {
  if (routeId === 'cityview' || routeId === 'islandview') return true
  const day = new Date().getDay()
  const month = new Date().getMonth() + 1
  return day === 6 || (day === 5 && [8, 12, 1].includes(month))
}
