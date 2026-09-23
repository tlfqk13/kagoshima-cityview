import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { findHotel } from '@/lib/hotels'
import { askDesk, checkAndCountQuota, isDeskConfigured, GUEST_LANGS, QUESTION_MAX_CHARS } from '@/lib/desk'

// 프런트 통역 도우미 API. AI 호출은 여기서만 일어난다(비용 지점).
// 호텔 slug가 유효하고, API 키가 설정돼 있고, 하루 상한 안일 때만 호출한다.
const Body = z.object({
  hotel: z.string().min(1).max(64),
  question: z.string().trim().min(2).max(QUESTION_MAX_CHARS),
  guestLang: z.enum(GUEST_LANGS),
})

export async function POST(request: Request) {
  if (!isDeskConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!findHotel(body.hotel)) {
    return NextResponse.json({ error: 'unknown_hotel' }, { status: 404 })
  }
  const quota = checkAndCountQuota(body.hotel)
  if (!quota.ok) {
    return NextResponse.json({ error: 'quota', scope: quota.scope }, { status: 429 })
  }
  try {
    const result = await askDesk({ hotelSlug: body.hotel, question: body.question, guestLang: body.guestLang })
    return NextResponse.json(result)
  } catch (error) {
    // 키·응답 원문은 로그에 남기지 않는다. 오류 종류만.
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'upstream_rate_limit' }, { status: 503 })
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
    if (error instanceof Anthropic.APIError) {
      console.warn('desk: API error', error.status)
      return NextResponse.json({ error: 'upstream' }, { status: 502 })
    }
    console.warn('desk: error', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
