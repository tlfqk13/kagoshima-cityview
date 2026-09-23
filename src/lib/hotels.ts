import rawHotels from '@/data/hotels.json'
import { getStopsForRoute, getStopById, type RouteStop } from '@/lib/routes'

// 호텔 브랜드 인쇄물(?hotel=slug)과 지도 호텔 모드(/map?hotel=slug)용 데이터.
// stopId는 "타는 정류장", 좌표는 호텔 건물 위치(정류장 좌표가 아니므로 JSON에 둔다).
export interface Hotel {
  slug: string
  nameJa: string
  stopId: string
  walkMeters: number
  lat: number
  lng: number
}

// 호텔에서 걸어갈 수 있는 정류장 쌍. 시티뷰는 한 방향 순환이라
// 갈 때 타는 정류장(번호가 작은 쪽)과 돌아올 때 내리는 정류장(번호가 큰 쪽)이 다를 수 있다.
export interface HotelStops {
  board: RouteStop
  alight: RouteStop
  boardMeters: number
  alightMeters: number
  boardMinutes: number
  alightMinutes: number
}

// 이 거리 안의 정류장만 "걸어갈 수 있다"고 본다 (직선거리)
const WALKABLE_METERS = 450
const WALK_METERS_PER_MIN = 80

const hotels = (rawHotels as unknown as { hotels: Hotel[] }).hotels

export function findHotel(slug: string | undefined): Hotel | undefined {
  return slug ? hotels.find(h => h.slug === slug) : undefined
}

export function getAllHotels(): Hotel[] {
  return hotels
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN))
}

export function getHotelStops(hotel: Hotel): HotelStops {
  const board = getStopById('cityview', hotel.stopId)
  if (!board) throw new Error(`호텔 ${hotel.slug}의 정류장 ${hotel.stopId}이 시티뷰 노선에 없습니다`)
  const boardMeters = distanceMeters(hotel.lat, hotel.lng, board.lat, board.lng)

  // 걸어갈 수 있는 정류장 중 번호가 가장 큰 것 = 한 바퀴 돌아와서 내리는 정류장
  const walkable = getStopsForRoute('cityview')
    .map(stop => ({ stop, meters: distanceMeters(hotel.lat, hotel.lng, stop.lat, stop.lng) }))
    .filter(({ meters }) => meters <= WALKABLE_METERS)
  const last = walkable.reduce<typeof walkable[number] | null>((best, cur) => (!best || cur.stop.number > best.stop.number ? cur : best), null)
  const alightEntry = last && last.stop.number > board.number ? last : { stop: board, meters: boardMeters }

  return {
    board,
    alight: alightEntry.stop,
    boardMeters: Math.round(boardMeters),
    alightMeters: Math.round(alightEntry.meters),
    boardMinutes: walkMinutes(boardMeters),
    alightMinutes: walkMinutes(alightEntry.meters),
  }
}
