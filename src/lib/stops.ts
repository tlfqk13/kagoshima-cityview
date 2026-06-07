// Backward-compatibility shim — delegates to lib/routes.ts for 'cityview'.
// New code should import from '@/lib/routes' directly.
export type { Lang, Category, Destination, RouteStop as BusStop } from './routes'

import {
  getStopsForRoute,
  getStopById as routesGetById,
  getStopsGeoJSON as routesGeoJSON,
  getNearestStop as routesNearest,
  getStopsByCategory as routesByCategory,
  searchStops as routesSearchStops,
  getRouteCoordinates,
  type RouteStop,
  type Category,
} from './routes'
import cityviewRaw from '@/data/routes/cityview.json'

export function getAllStops() { return getStopsForRoute('cityview') }
export function getStopById(id: string) { return routesGetById('cityview', id) }
export function getStopsGeoJSON(stops: RouteStop[]) { return routesGeoJSON(stops) }
export function getNearestStop(lat: number, lng: number) { return routesNearest('cityview', lat, lng) }
export function getStopsByCategory(category: Category) { return routesByCategory('cityview', category) }
export function searchStops(query: string) { return routesSearchStops('cityview', query) }
export function getMetadata() { return (cityviewRaw as { metadata: Record<string, unknown> }).metadata }

// Derived from routes/cityview.json — single source of truth (ISS-001 compliant)
export const ROUTE_COORDINATES: [number, number][] = getRouteCoordinates('cityview')
