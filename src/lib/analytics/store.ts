import { createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import { EVENT_NAMES, ENTRY_SOURCES, LANG_CODES } from './events'

// 서버 저장소 — 원본 이벤트를 저장하지 않고 일별 카운트만 더한다.
// 세션은 "날짜 + 비밀 솔트"로 해시한 값만 두어(31일 후 삭제) 날짜를 넘어 이어 붙일 수 없다.

export const EventSchema = z.object({
  n: z.enum(EVENT_NAMES),
  k: z.string().max(64).regex(/^[\w-]*$/).optional(),
  v: z.string().max(32).regex(/^[\w-]*$/).optional(),
  lang: z.string().max(8),
  entry: z.enum(ENTRY_SOURCES),
  s: z.string().uuid(),
})
export type EventInput = z.infer<typeof EventSchema>

export function isAnalyticsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

// 일본 시간 기준 날짜 — 리포트가 일본 달력으로 나가므로
export function japanDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function normalizeLang(lang: string): string {
  return (LANG_CODES as readonly string[]).includes(lang) ? lang : 'other'
}

/** 세션 해시: 같은 날 같은 브라우저면 같은 값, 다음 날이면 다른 값. 솔트가 없으면 세션을 세지 않는다 */
export function hashSession(sessionId: string, day: string): string | null {
  const salt = process.env.ANALYTICS_SALT
  if (!salt) return null
  return createHash('sha256').update(`${salt}:${day}:${sessionId}`).digest('hex').slice(0, 32)
}

/** 국가 코드(Vercel 헤더). 2글자 대문자만 인정, 그 외는 '--' */
export function normalizeCountry(header: string | null): string {
  return header && /^[A-Z]{2}$/.test(header) ? header : '--'
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agg_daily (
  day date NOT NULL,
  name text NOT NULL,
  k text NOT NULL DEFAULT '',
  v text NOT NULL DEFAULT '',
  lang text NOT NULL,
  entry text NOT NULL,
  country text NOT NULL DEFAULT '--',
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, k, v, lang, entry, country)
);
CREATE TABLE IF NOT EXISTS sessions_daily (
  day date NOT NULL,
  session_hash text NOT NULL,
  lang text NOT NULL,
  entry text NOT NULL,
  country text NOT NULL DEFAULT '--',
  PRIMARY KEY (day, session_hash)
);
CREATE INDEX IF NOT EXISTS agg_daily_day_idx ON agg_daily (day);
CREATE INDEX IF NOT EXISTS sessions_daily_day_idx ON sessions_daily (day);
`

function sql() {
  return neon(process.env.DATABASE_URL!)
}

export async function ensureSchema() {
  const q = sql()
  for (const statement of SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean)) {
    await q.query(statement)
  }
}

export async function recordEvent(event: EventInput, country: string, now = new Date()) {
  const q = sql()
  const day = japanDay(now)
  const lang = normalizeLang(event.lang)
  await q.query(
    `INSERT INTO agg_daily (day, name, k, v, lang, entry, country, count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
     ON CONFLICT (day, name, k, v, lang, entry, country) DO UPDATE SET count = agg_daily.count + 1`,
    [day, event.n, event.k ?? '', event.v ?? '', lang, event.entry, country],
  )
  const hash = hashSession(event.s, day)
  if (hash) {
    await q.query(
      `INSERT INTO sessions_daily (day, session_hash, lang, entry, country) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (day, session_hash) DO NOTHING`,
      [day, hash, lang, event.entry, country],
    )
  }
}

/** 31일 지난 세션 해시 삭제 (집계 카운트는 영구 보관) */
export async function pruneSessions(now = new Date()) {
  const q = sql()
  await q.query(`DELETE FROM sessions_daily WHERE day < ($1::date - INTERVAL '31 days')`, [japanDay(now)])
}
