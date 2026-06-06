# ADR 002: react-i18next 선택 (next-intl 대신)

**날짜:** 2026-06-06  
**상태:** 승인됨

## 컨텍스트

Next.js 15 App Router 환경에서 한국어·영어·일본어 3개 언어를 지원해야 했다.  
초기 검토 대상: `next-intl`, `react-i18next + i18next`.

## 결정

**react-i18next** 사용.

## 이유

`next-intl`은 App Router에서 i18n을 지원하지만, **URL prefix 방식(`/ko/`, `/en/`)을 요구**한다.

- `middleware.ts`에서 locale을 URL segment로 인식해야 Server Component에서 `useTranslations()`가 작동
- prefix 없이 쓰면 `createNavigation()`, `getTranslations()` 등 Server Component API를 사용할 수 없어 Client Component에서만 번역이 가능

이 프로젝트는 URL을 `/ko/map/stop_03`, `/en/map/stop_03` 형태로 만들지 않기로 결정했다:
- URL이 복잡해지면 관광과에 공유할 때 인상이 나빠짐
- 이미 `/map/[stopId]` 동적 세그먼트가 있는데 `/[locale]/map/[stopId]` 가 되면 라우팅 복잡도 증가
- 언어 전환은 URL이 아닌 쿠키 + `?lang=xx` 쿼리 파라미터로 충분

`react-i18next`는:
- URL 구조와 무관하게 작동
- `i18next-browser-languagedetector`로 `querystring → cookie → navigator` 순서 감지
- `?lang=ko` 링크 공유 → 쿠키에 저장 → 이후 방문에서도 유지

## 트레이드오프

- Server Component에서 번역 불가 → 모든 번역 텍스트는 Client Component에서 처리 (`'use client'`)
- 초기 언어 감지가 서버에서 안 되므로 hydration 시 언어 플래시 가능 → `suppressHydrationWarning` 또는 로딩 스켈레톤으로 완화
