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
  destinations: Destination[]
}

export interface StopsData {
  metadata: {
    sourceVersion: string
    lastValidatedAt: string
    lastUpdatedAt: string
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

export const ROUTE_COORDINATES: [number, number][] = [
  [130.5403, 31.5839],
  [130.5481, 31.5855],
  [130.5545, 31.5892],
  [130.5512, 31.5921],
  [130.5499, 31.5943],
  [130.5511, 31.5963],
  [130.5525, 31.5985],
  [130.5563, 31.6012],
  [130.5612, 31.6054],
  [130.5721, 31.6089],
  [130.5856, 31.6112],
  [130.5999, 31.6135],
  [130.5887, 31.6098],
  [130.5657, 31.5973],
  [130.5638, 31.5961],
  [130.5621, 31.5951],
  [130.5603, 31.5934],
  [130.5591, 31.5919],
  [130.5586, 31.5908],
  [130.5581, 31.5897],
]
