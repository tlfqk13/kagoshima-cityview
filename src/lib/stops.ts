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

// Derived from stops.json in route order — single source of truth.
// Never hardcode coordinates here; update stops.json instead.
export const ROUTE_COORDINATES: [number, number][] = (stopsData as StopsData).stops
  .slice()
  .sort((a, b) => a.number - b.number)
  .map(s => [s.lng, s.lat])
