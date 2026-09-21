import rawHotels from '@/data/hotels.json'

// 호텔 브랜드 인쇄물(?hotel=slug)용 매핑. 좌표 없이 최근접 정류장 ID와 거리만 보관한다.
export interface Hotel {
  slug: string
  nameJa: string
  stopId: string
  walkMeters: number
}

const hotels = (rawHotels as unknown as { hotels: Hotel[] }).hotels

export function findHotel(slug: string | undefined): Hotel | undefined {
  return slug ? hotels.find(h => h.slug === slug) : undefined
}

export function getAllHotels(): Hotel[] {
  return hotels
}
