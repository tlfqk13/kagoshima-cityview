# 이슈 트래커

버그·설계 결함·재발 방지 조치를 기록합니다.
새 이슈는 맨 위에 추가합니다.

---

## ISS-001 · ROUTE_COORDINATES 좌표 중복 선언으로 인한 동기화 실패

**상태:** 해결 (`a182e80` → `stops.ts` 하드코딩 제거)
**발생일:** 2026-06-07
**발견자:** 손동규
**심각도:** High — 지도 노선 폴리라인 및 버스 애니메이션이 실제 경로와 완전히 다른 위치를 표시

### 증상

`stops.json` 좌표를 공식 데이터로 전면 교체했으나, 지도의 노선 폴리라인(갈색 점선)과 버스 🚌 애니메이션이 기존 가짜 경로를 그대로 따라감.

### 근본 원인

`src/lib/stops.ts`의 `ROUTE_COORDINATES` 상수가 `stops.json`과 **독립적으로 하드코딩** 된 좌표 배열이었음. 데이터 소스가 두 군데 존재하는 DRY 위반.

```
stops.json          ← 업데이트됨 ✓
ROUTE_COORDINATES   ← 업데이트 안 됨 ✗  (별도 하드코딩)
```

지도 마커는 `stops.json`에서 직접 읽으므로 즉시 반영됐으나, 노선/애니메이션은 `ROUTE_COORDINATES`를 참조해 구버전 경로를 유지.

### 수정 내용

`ROUTE_COORDINATES`를 하드코딩 배열에서 `stops.json` 파생값으로 변경:

```typescript
// Before (문제): 좌표를 별도 배열로 복제 → stops.json 업데이트 시 자동 반영 안 됨
export const ROUTE_COORDINATES: [number, number][] = [
  [130.5403, 31.5839], // 구버전 가짜 좌표
  ...
]

// After (수정): stops.json에서 파생 → 단일 진실의 원천
export const ROUTE_COORDINATES: [number, number][] = (stopsData as StopsData).stops
  .slice()
  .sort((a, b) => a.number - b.number)
  .map(s => [s.lng, s.lat])
```

### 재발 방지 규칙

> **규칙 ISS-001:** 정류장 좌표는 `src/data/routes/*.json`이 유일한 진실의 원천.
> TypeScript 파일(`lib/routes.ts`, `lib/stops.ts`, 컴포넌트 등)에 좌표를 직접 선언하지 않는다.
> 지도 렌더링에 필요한 좌표 배열은 반드시 `getStopsForRoute(routeId)` 또는 `getRouteCoordinates(routeId)`로 파생한다.
>
> *(2026-06-07: `stops.json` → `routes/cityview.json`으로 마이그레이션 완료. 야경·아일랜드뷰 노선 추가)*

### 체크리스트 (앞으로 노선 데이터 업데이트 시)

- [ ] `npm run dev` → 해당 노선 탭 선택 후 지도 마커 위치 확인
- [ ] `npm run dev` → 노선 폴리라인 경로 확인 (노선 색상 점선이 실제 도로를 따르는지)
- [ ] `npm run dev` → 버스 애니메이션 경로 확인 (🚌 이 정류장을 순서대로 통과하는지)
- [ ] `src/lib/routes.ts` 또는 컴포넌트에 좌표 하드코딩이 새로 추가되지 않았는지 확인

---

*이슈 추가 형식: `## ISS-NNN · 제목` → 상태·날짜·근본 원인·수정·재발 방지 규칙 순으로 작성*
