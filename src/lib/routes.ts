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
  gtfsStopId?: string
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
    arrivalOnly?: boolean
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
  /** 현장 GPS 실측일 — 미실측 노선은 null */
  lastFieldVerifiedAt: string | null
  /** 공식 출처와 마지막으로 대조한 날 */
  lastSourceCheckedAt: string
  coordinateSource: string
  scheduleSource: string
  scheduleNote?: Record<Lang, string>
  disclaimer: Record<Lang, string>
}

interface RawRouteData {
  metadata: RouteMetadata
  stops: Omit<RouteStop, 'destinations'>[]
  geometry?: RouteGeometry[]
}

export interface RouteGeometry {
  course: 'default' | 'A' | 'B'
  coordinates: [number, number][]
  source: string
  method: 'official-polyline' | 'road-reference'
  checkedAt: string
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

/** 근사치와 출처 대조는 현장 GPS 실측을 의미하지 않는다. */
export function getStopVerification(routeId: RouteId, stop: RouteStop): 'approximate' | 'field' | 'source' {
  if (stop.coordinatesApproximate) return 'approximate'
  return getRoute(routeId).lastFieldVerifiedAt ? 'field' : 'source'
}

export function getRouteGeometry(routeId: RouteId): RouteGeometry[] {
  return rawRoutes[routeId].geometry ?? []
}

export function getRouteCoordinates(routeId: RouteId, course: 'A' | 'B' = 'B'): [number, number][] {
  const geometry = getRouteGeometry(routeId)
  const shape = geometry.find(item => item.course === course) ?? geometry[0]
  if (shape) return shape.coordinates
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
        isBCourseOnly: (stop.courses?.length === 1 && stop.courses[0] === 'B') ?? false,
      },
    })),
  }
}

export function getDepartureInterval(departures: string[]): number | null {
  const minutes = departures.map(time => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins })
  const intervals = minutes.slice(1).map((value, index) => value - minutes[index])
  return intervals.length && intervals.every(value => value === intervals[0]) ? intervals[0] : null
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

export function isRouteAvailableToday(routeId: RouteId, now = new Date()): boolean {
  const route = getRoute(routeId)
  if (route.operatingDays === 'daily') return true
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', weekday: 'short', month: 'long',
  }).formatToParts(now)
  const day = parts.find(part => part.type === 'weekday')?.value
  const month = parts.find(part => part.type === 'month')?.value.toLowerCase() ?? ''
  return day === 'Sat' || (day === 'Fri' && (route.seasonalExtra ?? []).includes(month))
}
