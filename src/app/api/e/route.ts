import { NextResponse } from 'next/server'
import { EventSchema, isAnalyticsConfigured, normalizeCountry, recordEvent } from '@/lib/analytics/store'

// 이용 통계 수집. DATABASE_URL이 없으면 조용히 204 — 화면에는 어떤 영향도 없다.
// IP는 읽지 않는다. 국가는 Vercel이 붙여 주는 2글자 헤더만 쓴다.
export async function POST(request: Request) {
  if (!isAnalyticsConfigured()) return new NextResponse(null, { status: 204 })
  let event
  try {
    event = EventSchema.parse(await request.json())
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  try {
    await recordEvent(event, normalizeCountry(request.headers.get('x-vercel-ip-country')))
  } catch (error) {
    console.warn('analytics: write failed', error instanceof Error ? error.name : 'UnknownError')
  }
  return new NextResponse(null, { status: 204 })
}
