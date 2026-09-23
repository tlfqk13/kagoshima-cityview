import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { findHotel, getHotelStops, type Hotel, type HotelStops } from '@/lib/hotels'
import { getRoute, getStopsForRoute, getNextDeparture, type RouteStop } from '@/lib/routes'

// 프런트 통역 도우미 — 호텔 직원이 일본어로 물으면, 투숙객 언어로 답 카드를 만든다.
// 원칙: 정류장·시간·요금 같은 "사실"은 전부 우리 데이터에서 아래 컨텍스트로 넘기고,
// AI는 질문 이해와 문장 생성만 한다. 컨텍스트에 없는 것은 "모른다"고 답하게 한다.

export const GUEST_LANGS = ['en', 'ko', 'zh-Hant', 'zh-Hans', 'ja'] as const
export type GuestLang = typeof GUEST_LANGS[number]

const GUEST_LANG_LABEL: Record<GuestLang, string> = {
  en: 'English',
  ko: '한국어 (Korean)',
  'zh-Hant': '繁體中文 (Traditional Chinese, Taiwan/Hong Kong)',
  'zh-Hans': '简体中文 (Simplified Chinese)',
  ja: '日本語 (Japanese)',
}

// 비용 통제: 모델·하루 상한은 환경변수로. 기본은 저비용 모델(Haiku 4.5).
export const DESK_MODEL = process.env.DESK_MODEL ?? 'claude-haiku-4-5'
const DAILY_LIMIT_HOTEL = Number(process.env.DESK_DAILY_LIMIT_HOTEL ?? 50)
const DAILY_LIMIT_TOTAL = Number(process.env.DESK_DAILY_LIMIT_TOTAL ?? 300)
export const QUESTION_MAX_CHARS = 300

export const DeskAnswer = z.object({
  guestAnswer: z.string().describe('투숙객에게 보여줄 답. 투숙객 언어로, 2~4문장, 정류장 번호·이름·시간을 구체적으로'),
  staffSummary: z.string().describe('직원용 요약. 일본어 1~2문장. 투숙객 답과 같은 내용'),
  stopIds: z.array(z.string()).max(3).describe('답에 등장한 정류장 id (예: stop_03). 없으면 빈 배열'),
  confidence: z.enum(['high', 'low']).describe('컨텍스트만으로 확실히 답했으면 high, 추측이 섞였거나 범위 밖이면 low'),
})
export type DeskAnswerT = z.infer<typeof DeskAnswer>

export interface DeskResult {
  answer: DeskAnswerT
  stops: { id: string; number: number; nameJa: string }[]
  model: string
  usage: { input: number; cached: number; output: number }
}

// ---------- 컨텍스트 (모두 우리 데이터) ----------

function japanClock(now: Date) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
}

function stopLine(stop: RouteStop): string {
  const dests = stop.destinations.map(d => `${d.name.ja}(${d.name.en}, 徒歩${d.walkMinutes}分)`).join(', ')
  const note = stop.schedule?.arrivalOnly ? '【終点・降車専用】' : ''
  return `No.${stop.number} ${stop.name.ja} / ${stop.name.en} / ${stop.name.ko} / ${stop.name.zh} [id=${stop.id}]${note}${dests ? ` — 近く: ${dests}` : ''}`
}

function departuresLine(stop: RouteStop, now: Date): string {
  const deps = stop.schedule?.departures ?? []
  if (deps.length === 0) return `No.${stop.number}: 時刻表なし`
  const next = getNextDeparture('cityview', deps, now)
  const nextText = next.status === 'upcoming' ? `次は ${next.time}（あと${next.minutesUntil}分）`
    : next.status === 'ended' ? `本日は終了（明日の始発 ${next.firstTomorrow}）`
    : next.status === 'noService' ? '本日は運行なし' : '不明'
  return `No.${stop.number} ${stop.name.ja}: 始発 ${deps[0]} / 最終 ${deps[deps.length - 1]} / ${nextText} / 全便: ${deps.join(' ')}`
}

/** 호텔 하나의 사실 묶음. 호텔별로 내용이 같아 프롬프트 캐시가 잘 먹는다(현재 시각은 별도 블록). */
export function buildHotelContext(hotel: Hotel, stops: HotelStops): string {
  const route = getRoute('cityview')
  const all = getStopsForRoute('cityview')
  return [
    `# ホテル: ${hotel.nameJa}`,
    `乗る停留所: No.${stops.board.number} ${stops.board.name.ja} [id=${stops.board.id}]（ホテルから徒歩約${stops.boardMinutes}分）`,
    stops.alight.id === stops.board.id
      ? `帰りに降りる停留所: 同じ No.${stops.board.number}（1周して戻る）`
      : `帰りに降りる停留所: No.${stops.alight.number} ${stops.alight.name.ja} [id=${stops.alight.id}]（ホテルまで徒歩約${stops.alightMinutes}分）`,
    '',
    `# 路線: カゴシマシティビュー（一方向の循環バス、1周約${route.loopDurationMin}分、約${route.frequencyMin}分間隔、1日${route.totalRuns}便、${route.firstDeparture}〜${route.lastDeparture}）`,
    `運賃: 大人${route.fare.adult}円・小児${route.fare.child}円${route.dayPass ? ` / 1日乗車券 大人${route.dayPass.adult}円・小児${route.dayPass.child}円` : ''}`,
    '注意: 一方向循環なので、目的地が乗る停留所より前の番号なら1周近く乗ることになる。No.1とNo.20は同じ鹿児島中央駅。',
    '',
    '# 停留所一覧（番号順・近くの見どころ）',
    ...all.map(stopLine),
  ].join('\n')
}

export function buildNowContext(stops: HotelStops, now: Date): string {
  const lines = [`# 現在時刻（日本時間）: ${japanClock(now)}`, departuresLine(stops.board, now)]
  if (stops.alight.id !== stops.board.id) lines.push(departuresLine(stops.alight, now))
  return lines.join('\n')
}

const SYSTEM_PROMPT = `あなたは鹿児島のホテルのフロントで使う「バス案内の通訳アシスタント」です。
フロントスタッフが日本語で質問を入力します。宿泊客に見せる答えを、指定された宿泊客の言語で作ってください。

必ず守ること:
- 停留所の番号・名前・時刻・運賃・徒歩時間は、下のコンテキストにある情報だけを使う。コンテキストにない情報（他のバス路線、観光施設の営業時間、料金の割引、天気など）は絶対に作らない。分からないときは「この案内では分かりません。フロントまたは公式サイトでご確認ください」と、宿泊客の言語で正直に伝え、confidence を low にする。
- 時刻は「時刻表の目安」であり実際は前後することを、時刻を案内するときは一言添える。
- 宿泊客向けの答え（guestAnswer）は、その場で読み上げたり画面を見せたりできる長さ（2〜4文）。丁寧だが簡潔に。停留所は必ず「No.3 天文館」のように番号と名前を書く。
- スタッフ向け要約（staffSummary）は日本語で1〜2文。
- stopIds には答えに出した停留所の id（例: stop_03）を最大3つ。
- カゴシマシティビューは一方向循環。目的地の番号が乗る停留所より小さいときは、その旨と所要の目安（1周約80分）を伝える。`

// ---------- 하루 상한 (서버리스라 프로세스 단위 best-effort. 사고 방지용) ----------
const counters = new Map<string, number>()
function dayKey(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function checkAndCountQuota(hotelSlug: string, now = new Date()): { ok: true } | { ok: false; scope: 'hotel' | 'total' } {
  const day = dayKey(now)
  const hotelKey = `${day}:${hotelSlug}`
  const totalKey = `${day}:*`
  const hotelCount = counters.get(hotelKey) ?? 0
  const totalCount = counters.get(totalKey) ?? 0
  if (totalCount >= DAILY_LIMIT_TOTAL) return { ok: false, scope: 'total' }
  if (hotelCount >= DAILY_LIMIT_HOTEL) return { ok: false, scope: 'hotel' }
  counters.set(hotelKey, hotelCount + 1)
  counters.set(totalKey, totalCount + 1)
  return { ok: true }
}

export function isDeskConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

// ---------- 호출 ----------
let client: Anthropic | null = null
function getClient() {
  client ??= new Anthropic()
  return client
}

export async function askDesk(params: { hotelSlug: string; question: string; guestLang: GuestLang; now?: Date }): Promise<DeskResult> {
  const hotel = findHotel(params.hotelSlug)
  if (!hotel) throw new Error('unknown hotel')
  const stops = getHotelStops(hotel)
  const now = params.now ?? new Date()
  const question = params.question.trim().slice(0, QUESTION_MAX_CHARS)

  const response = await getClient().messages.parse({
    model: DESK_MODEL,
    max_tokens: 1024,
    // 고정 지시문 + 호텔 컨텍스트는 캐시(호텔당 동일). 현재 시각·질문은 그 뒤에 둔다.
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      { type: 'text', text: buildHotelContext(hotel, stops), cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `${buildNowContext(stops, now)}\n\n宿泊客の言語: ${GUEST_LANG_LABEL[params.guestLang]}\nフロントからの質問: ${question}`,
      },
    ],
    output_config: { format: zodOutputFormat(DeskAnswer) },
  })

  const answer = response.parsed_output
  if (!answer) throw new Error('unparseable answer')
  const all = getStopsForRoute('cityview')
  const referenced = answer.stopIds
    .map(id => all.find(s => s.id === id))
    .filter((s): s is RouteStop => Boolean(s))
    .map(s => ({ id: s.id, number: s.number, nameJa: s.name.ja }))

  return {
    answer,
    stops: referenced,
    model: response.model,
    usage: {
      input: response.usage.input_tokens,
      cached: response.usage.cache_read_input_tokens ?? 0,
      output: response.usage.output_tokens,
    },
  }
}
