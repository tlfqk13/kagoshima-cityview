# 이슈 트래커

버그·설계 결함·재발 방지 조치를 기록합니다.
새 이슈는 맨 위에 추가합니다.

---

## ISS-005 · SSR hydration 불일치 — Node의 `navigator.language`를 언어 감지가 읽음

**상태:** 해결 (2026-07-18 — SSR 언어 ko 고정 + 마운트 후 전환)
**발견:** 전체 QA 헤드리스 브라우저 테스트 중 React #418 (모든 지도 페이지에서 발생)
**심각도:** High — 한국어 사용자가 매 페이지에서 hydration 실패로 전체 트리 재생성

### 근본 원인

`i18next-browser-languagedetector`가 **서버(Node.js)에서도 `navigator.language`를 읽음**.
Node 21+의 글로벌 `navigator.language`는 `'en-US'`이므로 SSR이 영어로 렌더링되고,
실제 브라우저 언어(예: ko)로 hydrate하는 클라이언트와 텍스트 불일치 발생
(예: Nav 링크 — SSR "Story" vs 클라이언트 "스토리").

### 수정 내용

- `lib/i18n.ts`: init에 `lng: 'ko'` 명시 — SSR과 클라이언트 첫 렌더를 항상 ko로 고정해 hydration 일치.
- `I18nProvider.tsx`: 마운트 후 `languageDetector.detect()`로 감지 언어로 `changeLanguage`.
- 부수 효과: 첫 방문 en/ja 사용자는 짧은 한국어 플래시 후 전환 (스토리 RSC 콘텐츠는
  쿠키가 생긴 다음 방문부터 감지 언어로 제공).

---

## ISS-004 · NextAuth `UntrustedHost` 시 인증 fail-open — `/admin` 무인증 노출

**상태:** 해결 (2026-07-18 — `trustHost: true` 추가)
**발견:** 전체 QA HTTP 스모크 테스트 중 `/admin`이 세션 없이 200 + 대시보드 렌더
**심각도:** Critical — 로컬 프로덕션 빌드(`next start`)에서 관리자 페이지 공개

### 근본 원인

프로덕션 모드에서 Auth.js가 요청 호스트를 신뢰하지 않아 세션 해석이 `UntrustedHost`로 실패하고,
미들웨어 auth 래퍼가 **fail-open**(요청 통과)하여 `/admin`이 무인증 렌더링됨.
(Vercel 배포 환경에서는 자동 신뢰되지만, 명시 설정이 없으면 환경에 따라 재현 가능.)

### 수정 내용

- `src/auth.ts`에 `trustHost: true` 추가 → 비인증 `/admin` 접근 시 307 → `/admin/login` 확인.

---

## ISS-003 · `lastValidatedAt` 의미가 노선마다 다르게 사용됨

**상태:** 해결 (2026-07-18 — `lastFieldVerifiedAt`/`lastSourceCheckedAt`로 분리)
**발생일:** 2026-07-18 (평가 중 발견)
**심각도:** Medium — 관광과 제출 시 "현장 검증일"의 신뢰도 문제

### 내용

`metadata.lastValidatedAt`가 cityview는 "현장 실측일"(2026-05-31 실측), night/islandview는
"공식 데이터와 대조한 날"(2026-06-07 추출일)로 의미가 다르게 쓰임.
특히 islandview는 스스로 `coordinatesApproximate`를 선언하면서 동일한 검증일을 가짐.

### 수정 내용

- 필드 분리: `lastFieldVerifiedAt`(현장 실측일, 미실측 노선은 `null`) / `lastSourceCheckedAt`(공식 데이터 대조일)
- 표시 분기: 실측 노선은 "검증", 미실측 노선은 "데이터 확인" 문구 사용 (`map.sourceNote` / `map.sourceNoteChecked`)
- `lib/routes.ts` 타입, 3개 노선 JSON, `MapPage`, `TrustSection`, 관리자 페이지 반영

---

## ISS-002 · islandview OpenStreetMap attribution 미표기

**상태:** 해결 (2026-07-18 — 노선 선택 시 OSM 병기 + 모바일 표기 누락 수정)
**발생일:** 2026-07-18 (평가 중 발견)
**심각도:** Medium — ODbL 라이선스 컴플라이언스

### 내용

`islandview.json` 좌표 출처가 OpenStreetMap(ODbL)이지만 UI에 `© OpenStreetMap contributors`
표기가 없음. 가고시마시 CC BY 표기(`データ提供：鹿児島市（原データより加工）`)만 존재.

### 수정 내용

- `map.sourceNoteOsm` 키 추가 (ko/en/ja): `© OpenStreetMap contributors · 時刻表: 鹿児島市（原データより加工）`
- `MapPage`에서 islandview 선택 시 해당 문구 표시
- 부수 수정: 모바일 바텀시트에는 출처 표기가 아예 없던 문제 → `BottomSheet`에 `sourceNote` 표시 추가

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
