// 이용 통계 테이블 생성. DATABASE_URL 환경변수 필요 (Neon Postgres).
//   DATABASE_URL=... node scripts/db-migrate.mjs
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL이 없습니다'); process.exit(1) }
const sql = neon(url)
const statements = `
CREATE TABLE IF NOT EXISTS agg_daily (
  day date NOT NULL, name text NOT NULL, k text NOT NULL DEFAULT '', v text NOT NULL DEFAULT '',
  lang text NOT NULL, entry text NOT NULL, country text NOT NULL DEFAULT '--', count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, k, v, lang, entry, country));
CREATE TABLE IF NOT EXISTS sessions_daily (
  day date NOT NULL, session_hash text NOT NULL, lang text NOT NULL, entry text NOT NULL, country text NOT NULL DEFAULT '--',
  PRIMARY KEY (day, session_hash));
CREATE INDEX IF NOT EXISTS agg_daily_day_idx ON agg_daily (day);
CREATE INDEX IF NOT EXISTS sessions_daily_day_idx ON sessions_daily (day);
`.split(';').map(s => s.trim()).filter(Boolean)
for (const s of statements) await sql.query(s)
const [{ count }] = await sql.query('SELECT count(*)::int AS count FROM agg_daily')
console.log('ok — agg_daily rows:', count)
