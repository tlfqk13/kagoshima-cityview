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
  /** 구글맵 위치가 틀린(오류 등급) 정류장 수 */
  wrongCount: wrongStops.length,
  /** 가장 크게 어긋난 정류장 */
  worst,
}
