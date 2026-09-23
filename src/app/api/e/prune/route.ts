import { NextResponse } from 'next/server'
import { isAnalyticsConfigured, pruneSessions } from '@/lib/analytics/store'

// 31일 지난 세션 해시 삭제 — Vercel Cron이 매일 호출한다 (vercel.json). CRON_SECRET으로 보호.
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 })
  }
  if (!isAnalyticsConfigured()) return NextResponse.json({ skipped: true })
  await pruneSessions()
  return NextResponse.json({ ok: true })
}
