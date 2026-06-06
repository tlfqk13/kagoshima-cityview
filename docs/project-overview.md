# 가고시마 시티뷰 버스 가이드 — 프로젝트 개요

## 한 줄 요약

가고시마 시티뷰 버스 20개 정류장의 정확한 GPS 위치를 지도로 제공하는 다국어 관광 안내 서비스.

## 왜 만들었나

2026년 5월, 개발자가 직접 가고시마를 여행하며 경험한 문제에서 시작됐다.

구글맵에서 텐몬칸 정류장을 검색했더니 실제 위치와 약 200m 다른 곳을 가리켰다. 15분을 기다렸지만 버스는 오지 않았고, 현지인에게 물어보고서야 실제 정류장 위치를 알 수 있었다. 그 사이 버스는 이미 떠났다.

귀국 후 조사해보니 이 문제는 2017년부터 8년간 전 세계 여행자들이 동일하게 경험한 구조적 문제였다 (TripAdvisor, 한국 여행 블로그, 일본 4travel.jp 모두 동일한 민원 존재).

## 최종 목표

**가고시마시 관광과(観光課)의 공식 채택.**

단순한 개인 프로젝트가 아니라, 공무원에게 직접 제안할 수 있는 수준의 완성된 서비스로 만드는 것이 목표다.

## 서비스 구성

```
/                  → 스토리 페이지 (서비스 소개, 제작 경위, 파트너십 제안)
/map               → 지도 페이지 (핵심 기능)
/map/[stopId]      → 정류장 선택 상태 (URL 공유 가능)
/story             → 데브로그 에피소드 목록
/story/[slug]      → 에피소드 상세 (MDX)
/admin             → 관리자 (MVP: 라우트 보호만, 데이터 편집 UI 없음)
```

## 핵심 기능

- **정확한 GPS 핀** — 가고시마시 공식 GTFS 오픈데이터 기반 + 2026-05-31 현장 검증
- **구글맵 오류 표시** — 실제로 위치가 틀린 정류장에 경고 뱃지 표시
- **카테고리 브라우징** — 🏯역사·관광 / 🌊자연 / 🍜맛집 / 🛍쇼핑
- **3개 언어** — 한국어 / English / 日本語 (쿠키 저장, `?lang=xx` URL 공유)
- **모바일 최적화** — 현장에서 쓰는 서비스이므로 바텀시트 기반 모바일 UX
- **데브로그** — 제작 과정을 에피소드 형식으로 서비스 안에 포함 (투명성)
- **PWA** — 오프라인 지원, 홈 화면 추가 가능

## 문서 구조

```
docs/
  project-overview.md          ← 이 파일. 진입점.
  data-sources.md              ← 데이터 출처, 라이선스, 검증 방법
  adr/
    001-mapbox-over-google.md  ← 지도 라이브러리 선택
    002-react-i18next.md       ← i18n 라이브러리 선택
    003-no-turbopack.md        ← Turbopack 비활성화 이유
    004-route-params.md        ← /map/[stopId] 설계
    005-mdx-multilingual.md    ← MDX 다국어 구조
  superpowers/
    specs/
      2026-06-06-kagoshima-cityview-design.md   ← 설계 스펙 v1.2
    plans/
      2026-06-06-kagoshima-cityview.md          ← 구현 플랜
```

## 기술 스택 한 눈에 보기

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| 프레임워크 | Next.js 15 (App Router) | SSG+SSR 혼용, 정적 MDX 최적화 |
| 지도 | Mapbox GL JS | 커스텀 핀·레이어 자유도, GeoJSON 네이티브 지원 |
| i18n | react-i18next | next-intl App Router 미들웨어 충돌 회피 |
| 콘텐츠 | next-mdx-remote | MDX 서버 렌더링 |
| 인증 | NextAuth.js v5 | 어드민 라우트 보호 |
| PWA | @ducanh2912/next-pwa | next-pwa 패키지 deprecated 대체 |
| 분석 | Vercel Analytics | 설치 1줄 |
| 배포 | Vercel | Hobby → Pro (관광과 채택 전) |

## 라이선스 및 출처

- 정류장 GPS 데이터: 가고시마시 GTFS-JP 오픈데이터 (CC BY 4.0)
- 원본 URL: `https://www.city.kagoshima.lg.jp/ict/opendata.html` (항목 3-30)
- 이 서비스는 원본 데이터를 가공하여 사용하며, 출처를 UI 내 Footer에 명시함

## 연락처

- 개발자: fkffksk20@gmail.com
- 관광과 협력 문의 대상: 鹿児島市 観光課
