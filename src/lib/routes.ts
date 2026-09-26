import cityviewRaw from '@/data/routes/cityview.json'
import cityviewNightRaw from '@/data/routes/cityview-night.json'
import islandviewRaw from '@/data/routes/islandview.json'
import destinationsRaw from '@/data/destinations.json'
import { normalizeLanguage } from './locale'

/** 노선 JSON의 현지어 필드 키. UI 언어 'zh-Hant'는 데이터에서 'zh'로 저장한다. */
export type Lang = 'ko' | 'en' | 'ja' | 'zh'
export const DATA_LANGS: Lang[] = ['ko', 'en', 'ja', 'zh']

/** UI 언어(i18n 코드·서버 언어)를 노선 JSON의 현지어 키로 바꾼다. 모르는 값은 fallback. */
export function nameKey(language: string | null | undefined, fallback: Lang = 'ja'): Lang {
  const normalized = normalizeLanguage(language)
  if (!normalized) return fallback
  return normalized === 'zh-Hant' ? 'zh' : normalized
}
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

function stopDistanceMeters(a: RouteStop, b: RouteStop): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** 이 거리 안의 정류장은 낮은 줌에서 한 마커로 묶는다 (방향별 정류장 쌍은 15~28m 떨어져 있다) */
export const STOP_GROUP_METERS = 30
/** 같은 좌표로 본다 — 중앙역 No.1(출발)·No.20(종점)처럼 실제로 같은 정류장 */
const SAME_PLACE_METERS = 2

export interface StopGroup {
  /** 번호순 정류장 */
  stops: RouteStop[]
  /** 모든 정류장이 사실상 같은 좌표(출발·종점) — 어떤 줌에서도 마커 하나 */
  samePlace: boolean
}

/** 가까운 정류장을 묶는다. 결과는 첫 정류장 번호순 */
export function getStopGroups(stops: RouteStop[]): StopGroup[] {
  const sorted = stops.slice().sort((a, b) => a.number - b.number)
  const groups: RouteStop[][] = []
  for (const stop of sorted) {
    const group = groups.find(g => g.some(s => stopDistanceMeters(s, stop) <= STOP_GROUP_METERS))
    if (group) group.push(stop)
    else groups.push([stop])
  }
  return groups.map(group => ({
    stops: group,
    samePlace: group.length > 1 && group.every(s => stopDistanceMeters(s, group[0]) <= SAME_PLACE_METERS),
  }))
}

/** 이 정류장과 묶이는 정류장들(자기 자신 제외) */
export function getGroupedStops(routeId: RouteId, stop: RouteStop): { stop: RouteStop; meters: number; samePlace: boolean }[] {
  const group = getStopGroups(getStopsForRoute(routeId)).find(g => g.stops.some(s => s.id === stop.id))
  if (!group) return []
  return group.stops
    .filter(s => s.id !== stop.id)
    .map(s => ({ stop: s, meters: Math.round(stopDistanceMeters(stop, s)), samePlace: group.samePlace }))
}

/** 묶인 정류장의 공통 이름 — 「天文館（仙巌園方面向け）」「天文館（鹿児島中央駅向け）」→「天文館」 */
function commonName(names: string[]): string {
  const bases = names.map(n => n.split(/[（(]/)[0].trim())
  return bases.every(b => b === bases[0]) && bases[0] ? bases[0] : names[0]
}

function stopFeature(stops: RouteStop[]) {
  const first = stops[0]
  const lng = stops.reduce((sum, s) => sum + s.lng, 0) / stops.length
  const lat = stops.reduce((sum, s) => sum + s.lat, 0) / stops.length
  const one = stops.length === 1
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: one ? [first.lng, first.lat] : [lng, lat] },
    properties: {
      id: first.id,
      /** 이 마커가 대표하는 정류장 id — 선택 여부 판정은 `['in', id, ['get','ids']]` */
      ids: stops.map(s => s.id).join(','),
      number: first.number,
      label: stops.map(s => s.number).join('·'),
      merged: !one,
      nameKo: one ? first.name.ko : commonName(stops.map(s => s.name.ko)),
      nameEn: one ? first.name.en : commonName(stops.map(s => s.name.en)),
      nameJa: one ? first.name.ja : commonName(stops.map(s => s.name.ja)),
      nameZh: one ? first.name.zh : commonName(stops.map(s => s.name.zh)),
      googleMapsError: stops.some(s => s.googleMapsError),
      coordinatesApproximate: stops.some(s => s.coordinatesApproximate),
      hasConnection: stops.some(s => (s.connections ?? []).length > 0),
      isBCourseOnly: stops.every(s => (s.courses?.length === 1 && s.courses[0] === 'B') ?? false),
    },
  }
}

/**
 * 지도 마커용 GeoJSON.
 * - `split: false` (낮은 줌): 30m 안의 정류장을 마커 하나(라벨 "3·19")로 묶는다
 * - `split: true` (높은 줌): 방향별 정류장은 각각 찍고, 같은 좌표(No.1·No.20)만 계속 하나로 둔다
 */
export function getStopsGeoJSON(stops: RouteStop[], split = true) {
  const features = getStopGroups(stops).flatMap(group =>
    group.samePlace || !split ? [stopFeature(group.stops)] : group.stops.map(s => stopFeature([s]))
  )
  return { type: 'FeatureCollection' as const, features }
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
  const matches = (name: Record<Lang, string>) => DATA_LANGS.some(key => name[key].toLowerCase().includes(q))
  return getStopsForRoute(routeId).filter(stop => matches(stop.name) || stop.destinations.some(d => matches(d.name)))
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

// 운행 메모에서 화면에 이미 표시되는 편수·간격·시간대 문장을 걷어내고 남는 안내만 돌려준다.
// 예: "1日19便。循環終点（1番と同一地点）。" → "循環終点（1番と同一地点）。"
const REDUNDANT_NOTE_PATTERNS = [
  /^1日\d+便(（[^）]*）)?$/,
  /^約?\d+分間隔$/,
  /^\d+ daily runs( \([^)]*\))?$/i,
  /^every \d+ min$/i,
  /^하루 \d+편( 운행)?( \([^)]*\))?$/,
  /^\d+분 간격$/,
]

export function getScheduleExtraNote(note: string): string {
  return note
    .split(/(?<=[。.])\s*/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence && !REDUNDANT_NOTE_PATTERNS.some(pattern => pattern.test(sentence.replace(/[。.]$/, ''))))
    .join(' ')
}

export type NextDeparture =
  | { status: 'upcoming'; time: string; minutesUntil: number }
  | { status: 'ended'; firstTomorrow: string }
  | { status: 'noService' }
  | { status: 'unknown' }

// 일본 시간(Asia/Tokyo) 기준 현재 시각(분). 기기 시간대와 무관하게 현지 운행표와 맞춘다.
export function getJapanMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

// 정류장의 오늘 다음 출발(또는 도착) — 시간표 기준 목안이며 실시간 위치가 아니다.
export function getNextDeparture(routeId: RouteId, departures: string[], now = new Date()): NextDeparture {
  if (!isRouteAvailableToday(routeId, now)) return { status: 'noService' }
  if (departures.length === 0) return { status: 'unknown' }
  const current = getJapanMinutes(now)
  for (const time of departures) {
    const [hours, mins] = time.split(':').map(Number)
    const minutesUntil = hours * 60 + mins - current
    if (minutesUntil >= 0) return { status: 'upcoming', time, minutesUntil }
  }
  return { status: 'ended', firstTomorrow: departures[0] }
}
