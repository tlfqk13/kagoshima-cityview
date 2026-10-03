import rawOffices from '@/data/ticket-offices.json'
import { distanceMeters, walkMinutes } from '@/lib/hotels'
import type { Lang, RouteStop } from '@/lib/routes'

// 1일 승차권·CUTE 판매처 (src/data/ticket-offices.json). 지도 표시와 정류장 상세의 "가까운 판매처"에 쓴다.
export type TicketKind = 'dayPass' | 'cute'

export interface TicketOffice {
  id: string
  name: Record<Lang, string>
  place: Record<Lang, string>
  hours: string | null
  sells: TicketKind[]
  lat: number
  lng: number
  coordSource: string
  sellsSource: string
}

const offices = (rawOffices as unknown as { offices: TicketOffice[] }).offices

/** 정류장에서 걸어갈 수 있다고 보는 거리 (호텔과 같은 기준) */
const NEAR_METERS = 450

export function getTicketOffices(): TicketOffice[] {
  return offices
}

export function getTicketOfficesNearStop(stop: RouteStop): { office: TicketOffice; meters: number; minutes: number }[] {
  return offices
    .map(office => {
      const meters = distanceMeters(stop.lat, stop.lng, office.lat, office.lng)
      return { office, meters: Math.round(meters), minutes: walkMinutes(meters) }
    })
    .filter(({ meters }) => meters <= NEAR_METERS)
    .sort((a, b) => a.meters - b.meters)
}
