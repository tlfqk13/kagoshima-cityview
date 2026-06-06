# ADR 004: /map/[stopId] 라우트 파라미터 (쿼리스트링 대신)

**날짜:** 2026-06-06  
**상태:** 승인됨

## 컨텍스트

선택된 정류장을 URL에 표현하는 방법 두 가지를 검토했다:

- **A안:** `/map?stop=stop_03`
- **B안:** `/map/stop_03`

## 결정

**B안 — `/map/[stopId]` 동적 라우트** 사용.

## 이유

Next.js 15 App Router에서 `useSearchParams()`를 사용하면 **Suspense 경계가 필수**다.

```tsx
// ❌ 이렇게 쓰면 빌드 시 에러
'use client'
import { useSearchParams } from 'next/navigation'

export default function MapPage() {
  const params = useSearchParams()  // Suspense 없으면 에러
  const stopId = params.get('stop')
  ...
}
```

쿼리스트링 방식을 쓰려면 `<Suspense>`로 래핑해야 하고, Mapbox 지도처럼 무거운 컴포넌트 위에 Suspense를 걸면 레이아웃 시프트와 로딩 플래시가 발생한다.

동적 라우트 방식은:
- `params.stopId`를 서버에서 직접 받으므로 Suspense 불필요
- URL 자체가 상태를 표현 → SNS·카카오톡 공유 시 바로 해당 정류장 화면
- `generateStaticParams()`로 20개 정류장 페이지를 SSG로 사전 생성 가능

## 트레이드오프

- `/map` (미선택)과 `/map/stop_03` (선택)이 별도 페이지 → `MapPage` 클라이언트 컴포넌트를 공유하여 중복 제거
- 정류장 선택 해제 시 `/map`으로 `router.push()` 필요 → 뒤로가기 히스토리에 쌓임 (의도된 동작)
