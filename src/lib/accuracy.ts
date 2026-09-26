import rawAudit from '@/data/accuracy-audit.json'

// 구글맵 정확도 비교(scripts/google-maps-audit 산출물) 요약 — 랜딩의 도장·띠·손그림 지도가 같은 값을 쓴다
interface AuditStop {
  id: string
  errorMeters: number
  grade: 'ok' | 'warn' | 'error'
}

const audit = rawAudit as unknown as { auditedAt: string; stops: AuditStop[] }

const wrongStops = audit.stops.filter(stop => stop.grade === 'error')
const worst = audit.stops.reduce((a, b) => (b.errorMeters > a.errorMeters ? b : a))

export const accuracySummary = {
  auditedAt: audit.auditedAt,
  /** 번호순 20곳의 판정 — 랜딩의 점 띠 */
  stops: audit.stops
    .slice()
    .sort((a, b) => Number(a.id.replace(/\D/g, '')) - Number(b.id.replace(/\D/g, '')))
    .map(s => ({ id: s.id, number: Number(s.id.replace(/\D/g, '')), grade: s.grade, errorMeters: s.errorMeters })),
  /** 50m 이상 어긋난 정류장 수(주의+오류) */
  offCount: audit.stops.filter(s => s.grade !== 'ok').length,
  /** 구글맵 위치가 틀린(오류 등급) 정류장 수 */
  wrongCount: wrongStops.length,
  /** 가장 크게 어긋난 정류장 */
  worst,
}

// 랜딩 사례: 天文館 — 지도 앱의 핀은 1개, 실제 정류장은 방향별 2곳(No.3·No.19). 감사 결과에서 매번 읽는다
const t3 = audit.stops.find(s => s.id === 'stop_03')
const t19 = audit.stops.find(s => s.id === 'stop_19')
export const tenmonkanCase = {
  auditedAt: audit.auditedAt,
  toNo3: t3?.errorMeters ?? 0,
  toNo19: t19?.errorMeters ?? 0,
}
