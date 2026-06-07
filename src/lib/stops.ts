import stopsData from '@/data/stops.json'
import destinations from '@/data/destinations.json'

export type Lang = 'ko' | 'en' | 'ja'
export type Category = 'sightseeing' | 'food' | 'nature' | 'shopping'

export interface Destination {
  id: string
  stopId: string
  name: Record<Lang, string>
  walkMinutes: number
  category: Category
}

export interface BusStop {
  id: string
  number: number
  lat: number
  lng: number
  name: Record<Lang, string>
  googleMapsError: boolean
  googleMapsErrorNote: string
  googleMapsLat?: number
  googleMapsLng?: number
  photos?: string[]
  destinations: Destination[]
  schedule?: {
    departures: string[]
    operatingNote: Record<Lang, string>
  }
}

export interface StopsData {
  metadata: {
    sourceVersion: string
    lastUpdatedAt: string
    lastValidatedAt: string
    totalRuns: number
    firstDeparture: string
    lastDeparture: string
    frequencyMin: number
    coordinateSource: string
    scheduleSource: string
    disclaimer: Record<Lang, string>
  }
  stops: BusStop[]
}

const data = stopsData as StopsData
const allDestinations = destinations as Destination[]

export function getAllStops(): BusStop[] {
  return data.stops.map(stop => ({
    ...stop,
    destinations: allDestinations.filter(d => d.stopId === stop.id),
  }))
}

export function getStopById(id: string): BusStop | undefined {
  const stop = data.stops.find(s => s.id === id)
  if (!stop) return undefined
  return {
    ...stop,
    destinations: allDestinations.filter(d => d.stopId === id),
  }
}

export function getStopsGeoJSON(stops: BusStop[]) {
  return {
    type: 'FeatureCollection' as const,
    features: stops.map(stop => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [stop.lng, stop.lat],
      },
      properties: {
        id: stop.id,
        number: stop.number,
        nameKo: stop.name.ko,
        nameEn: stop.name.en,
        nameJa: stop.name.ja,
        googleMapsError: stop.googleMapsError,
      },
    })),
  }
}

export function getMetadata() {
  return data.metadata
}

export function getStopsByCategory(category: Category): BusStop[] {
  const stopIds = new Set(
    allDestinations
      .filter(d => d.category === category)
      .map(d => d.stopId)
  )
  return getAllStops().filter(s => stopIds.has(s.id))
}

export function getNearestStop(lat: number, lng: number): BusStop | null {
  const stops = getAllStops()
  if (stops.length === 0) return null

  let nearest: BusStop | null = null
  let minDist = Infinity

  for (const stop of stops) {
    const R = 6371000 // Earth radius in meters
    const dLat = ((stop.lat - lat) * Math.PI) / 180
    const dLng = ((stop.lng - lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((stop.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (dist < minDist) {
      minDist = dist
      nearest = stop
    }
  }

  return nearest
}

export function searchStops(query: string): BusStop[] {
  if (!query.trim()) return getAllStops()
  const q = query.toLowerCase().trim()
  return getAllStops().filter(stop => {
    const nameMatch =
      stop.name.ko.toLowerCase().includes(q) ||
      stop.name.en.toLowerCase().includes(q) ||
      stop.name.ja.toLowerCase().includes(q)
    const destMatch = stop.destinations.some(d =>
      d.name.ko.toLowerCase().includes(q) ||
      d.name.en.toLowerCase().includes(q) ||
      d.name.ja.toLowerCase().includes(q)
    )
    return nameMatch || destMatch
  })
}

// Official stop coordinates in route order (stop_01 → stop_20)
// Source: kotsu-city-kagoshima.jp rosenId=1680 bus_json
export const ROUTE_COORDINATES: [number, number][] = [
  [130.5436063, 31.58508327], // 01 가고시마 중앙역
  [130.5473077, 31.58379916], // 02 유신 고향관
  [130.5541581, 31.59034199], // 03 텐몬칸 (센간엔방면)
  [130.5542251, 31.59472224], // 04 사이고 동상앞
  [130.5550727, 31.59957012], // 05 사쓰마 의사비 (시로야마방면)
  [130.550293,  31.5996478],  // 06 사이고 동굴앞 (시로야마방면)
  [130.5491745, 31.59658192], // 07 시로야마
  [130.5501321, 31.59964094], // 08 사이고 동굴앞 (센간엔방면)
  [130.5553624, 31.59957469], // 09 사쓰마 의사비 (센간엔방면)
  [130.5581787, 31.6055371],  // 10 사이고 난슈 현창관
  [130.5618319, 31.60552111], // 11 아쓰히메 출생지
  [130.5771232, 31.61738082], // 12 센간엔
  [130.574689,  31.614019],   // 13 이진칸
  [130.5676603, 31.6033258],  // 14 이시바시 기념공원
  [130.563508,  31.600995],   // 15 가고시마역
  [130.562776,  31.59618566], // 16 수족관
  [130.5627573, 31.59482962], // 17 워터프론트파크
  [130.557564,  31.593116],   // 18 가나쇼마치
  [130.5543941, 31.59021226], // 19 텐몬칸 (중앙역방면)
  [130.5436063, 31.58508327], // 20 가고시마 중앙역 (종점)
]
