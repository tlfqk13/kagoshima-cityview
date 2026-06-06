# 가고시마 시티뷰 버스 가이드 — 개발 진행 로그

> 다음 세션에서 이 파일을 먼저 읽고 현재 상태를 파악하세요.
> 최종 업데이트: 2026-06-07 (P0 UX 개선 완료)

---

## 프로젝트 개요

**서비스명:** 가고시마 시티뷰 버스 가이드  
**목표:** 가고시마 시티뷰 버스 20개 정류장의 정확한 GPS 위치를 제공하는 다국어 관광 웹 서비스  
**최종 목표:** 가고시마시 관광과(観光課) 공식 채택  
**계기:** 개발자가 2026년 5월 가고시마 방문 시 구글 지도 정류장 위치 오류(덴몬칸 ~200m 오차)로 버스를 놓친 경험  
**데이터:** 가고시마시 GTFS 오픈데이터 (CC BY 4.0) — 직접 현장 검증 완료 (2026-05-31)

---

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 16.2.7 (App Router) | — |
| 번들러 | Webpack only (Turbopack 비활성) | Mapbox Worker URL 충돌 → `--no-turbo` |
| 지도 | Mapbox GL JS | Google Maps 좌표 오류가 문제의 원인 → ADR 001 |
| 다국어 | react-i18next | next-intl은 URL prefix 필수 → /map/[stopId] 구조와 충돌 → ADR 002 |
| 스타일 | CSS Modules + tokens.css | macOS 시스템 폰트, Google Fonts CDN 없음 |
| MDX | next-mdx-remote v6 + gray-matter | 데브로그 에피소드 렌더링 |
| PWA | @ducanh2912/next-pwa v10 | next-pwa가 abandoned → ADR 없음, 직접 선택 |
| 인증 | NextAuth v5 (beta) | 어드민 라우트만 보호 |
| 배포 | Vercel (도쿄 리전 nrt1) | — |
| 분석 | @vercel/analytics | — |

---

## 현재 상태: 전체 구현 완료 ✅

**총 17개 태스크 완료. 빌드 클린. TypeScript 에러 없음.**

---

## Phase별 진행 로그

### Phase 0 — 기획 및 문서화 (2026-06-06)

**완료 내용:**
- `docs/project-overview.md` — 서비스 개요, 라우트, 기술 스택
- `docs/data-sources.md` — GTFS-JP 출처, CC BY 4.0 의무사항, 현장 검증 기록
- `docs/adr/001-mapbox-over-google.md` — Mapbox 선택 근거
- `docs/adr/002-react-i18next.md` — next-intl 대신 react-i18next 선택 근거
- `docs/adr/003-no-turbopack.md` — Turbopack 비활성화 근거
- `docs/adr/004-route-params.md` — `/map/[stopId]` vs `?stop=id` 결정
- `docs/adr/005-mdx-multilingual.md` — `content/story/{ko,en,ja}/` 구조 결정
- `docs/superpowers/specs/2026-06-06-kagoshima-cityview-design.md` — 전체 설계 스펙
- `docs/superpowers/plans/2026-06-06-kagoshima-cityview.md` — 17개 태스크 구현 플랜

---

### Phase 1 — 프로젝트 기반 설정 (Tasks 1~5)

**커밋:** `e018d8e` → `c8ce338`

**완료 내용:**
- Next.js 16.2.7 초기화, Turbopack 비활성화 (`next dev --no-turbo`)
- `next.config.mjs` ESM 형식으로 전환 (CommonJS lint 경고 해소)
- `package.json` name `"nextjs-scaffold"` → `"kagoshima-cityview"` 수정
- `.env.local.example` 생성 (MAPBOX_TOKEN, NEXTAUTH 시크릿, GOOGLE OAuth, ADMIN_EMAILS)
- `.gitignore` — `.env*` 패턴, `!.env.local.example` 예외
- `src/styles/tokens.css` — 디자인 토큰 (컬러, 폰트, 레이아웃 변수)
- `src/app/globals.css` — tokens.css import, reset, body 기본 스타일
- `src/app/layout.tsx` — Metadata, I18nProvider 래핑, `lang="ko"`
- 핵심 패키지 설치: mapbox-gl, react-i18next, next-auth@beta, @ducanh2912/next-pwa, next-mdx-remote, gray-matter, @vercel/analytics

**중요 픽스:**
- `scroll-behavior: smooth` → `@media (prefers-reduced-motion: no-preference)` 안에 이동

---

### Phase 2 — 데이터 레이어 (Tasks 6~7)

**커밋:** `c975048`

**완료 내용:**
- `src/data/stops.json` — 20개 정류장 (stop_01 ~ stop_20), stop_03 덴몬칸에 `googleMapsError: true`
- `src/data/destinations.json` — 10개 목적지 (관광/자연/음식/쇼핑 카테고리)
- `src/lib/stops.ts` — `getAllStops()`, `getStopById()`, `getStopsGeoJSON()`, `getMetadata()`, `getStopsByCategory()`, `ROUTE_COORDINATES` 내보내기

---

### Phase 3 — 다국어 시스템 (Tasks 8~9)

**커밋:** `ee20a25` → `4f53a99`

**완료 내용:**
- `src/lib/i18n.ts` — react-i18next 초기화, 언어 감지 순서: querystring `?lang=` → cookie → navigator, fallback `ko`
- `src/components/I18nProvider.tsx` — 클라이언트 I18nextProvider 래퍼
- `src/messages/ko.json`, `en.json`, `ja.json` — 번역 키: nav, hero, trust, map, partnership, footer, devlog, problem

**중요 픽스:**
- i18n 비동기 초기화 race condition: `let initPromise` 가드 추가
- I18nProvider 중복 import 제거

---

### Phase 4 — 네비게이션 컴포넌트 (Task 10)

**커밋:** `688a066` → `0d8228c`

**완료 내용:**
- `src/components/Nav.tsx` — sticky, 모바일 768px 이하 링크 숨김, CTA "지도 열기 →"
- `src/components/LanguageSwitcher.tsx` — KO/EN/JA 버튼, `aria-pressed={currentLang === lang}`

**중요 픽스:**
- LanguageSwitcher `aria-pressed` 누락 → 접근성 Critical 이슈로 즉시 수정

---

### Phase 5 — 지도 페이지 (Tasks 11~12)

**커밋:** `298bd16` → `32c229d`

**완료 내용:**
- `src/components/map/MapCanvas.tsx` — Mapbox GL JS, GeoJSON 레이어, 노선 폴리라인, 정류장 핀/텍스트
  - `dynamic(() => import(...), { ssr: false })` 패턴으로 SSR 크래시 방지
  - `mapbox-gl/dist/mapbox-gl.css` — globals.css 아닌 MapCanvas 내부에서 import
  - Mapbox Expression 타입 deprecated 대응: `as unknown as number`, `as unknown as string`
- `src/components/map/SidePanel.tsx` — 데스크톱 사이드패널
- `src/components/map/StopList.tsx` — 정류장 목록
- `src/components/map/StopDetail.tsx` — 정류장 상세 (번호, 다국어명, GPS 뱃지, 목적지+도보시간)
- `src/components/map/CategoryChips.tsx` — 카테고리 필터 칩
- `src/components/map/DestinationCards.tsx` — 목적지 카드 그리드
- `src/components/map/BottomSheet.tsx` — 모바일 바텀시트 (peek/half/full, 터치 드래그)
- `src/app/map/MapPage.tsx` — 클라이언트 컴포넌트, selectedStop/activeCategory state
- `src/app/map/page.tsx` — `/map` 라우트
- `src/app/map/[stopId]/page.tsx` — `/map/[stopId]` 동적 라우트, `await params` (Next.js 15+)

**중요 픽스:**
- `mapboxgl.Expression` deprecated [6385] → `as unknown as number/string` 캐스팅
- MapPage에서 미사용 `useTranslation` import 제거 → TS [6133] 해소

---

### Phase 6 — 홈 페이지 (Task 13)

**커밋:** `31b0d50`

**완료 내용:**
- `src/components/home/Hero.tsx` + CSS — 다크 히어로, 세리프 h1, CTA 버튼 2개, 화산 SVG 배경
- `src/components/home/TrustSection.tsx` + CSS — 통계 수치 (20 정류장, 3개 언어, 무료), 데이터 출처/검증일
- `src/components/home/ProblemGrid.tsx` + CSS — 3개 문제 그리드 (다크 배경)
- `src/components/home/PartnershipSection.tsx` + CSS — 관광과 제안 CTA
- `src/components/home/Footer.tsx` + CSS — 출처, 라이선스, 면책조항
- `src/app/page.tsx` — 전체 홈 페이지 조합

---

### Phase 7 — MDX 데브로그 (Tasks 14~15)

**커밋:** `e91df90` → `544391b`

**완료 내용:**
- `src/lib/devlog.ts` — `getAllEpisodes(lang)`, `getEpisode(slug, lang)`, ko fallback 로직, `EpisodeMeta`/`Episode` 타입
- `content/story/ko/01-missed-the-bus.mdx` — 버스를 놓쳤다 (published: true)
- `content/story/ko/02-everyone-suffers.mdx` — 나만 그런 게 아니었다 (published: true)
- `content/story/ko/03-planning.mdx` — 뭘 만들면 해결될까 (published: true)
- `content/story/ko/04-design.mdx` — 디자인: 종이 지도에서 영감을 (published: true)
- `content/story/ko/05-building.mdx` — 만들기: 지도와 씨름하다 (published: true)
- `content/story/ko/06-pitch.mdx` — 다음 단계: 가고시마시에 제안하기 (**published: false** — 결과 공개 후 true로 변경)
- `src/components/story/EpisodeCard.tsx` + CSS — 에피소드 목록 카드
- `src/components/story/EpisodeNav.tsx` + CSS — 이전/다음 에피소드 네비게이션
- `src/app/story/page.tsx` + CSS — `/story` 에피소드 목록 페이지
- `src/app/story/[slug]/page.tsx` + CSS — `/story/[slug]` MDX 렌더링 (next-mdx-remote/rsc)

---

### Phase 8 — PWA (Task 16)

**커밋:** `b44dd25`

**완료 내용:**
- `next.config.mjs` — `withPWAInit` 래퍼 추가, `disable: process.env.NODE_ENV === 'development'`
- `public/manifest.json` — name/short_name, theme_color `#8B4513`, background `#F4EFE9`, lang `ko`, SVG 아이콘 참조
- `public/icons/icon-192.svg`, `public/icons/icon-512.svg` — 갈색 배경에 バ 문자 (실제 PNG 아이콘으로 교체 필요)
- `src/app/layout.tsx` metadata에 manifest, appleWebApp 추가; themeColor는 `viewport` export로 분리 (Next.js 16 요구사항)
- `.gitignore`에 `/public/sw.js`, `/public/workbox-*.js` 추가

**미완료 (다음 세션):**
- SVG placeholder → 실제 PNG 아이콘 교체 (192x192, 512x512)

---

### Phase 9 — 어드민 인증 (Task 17)

**커밋:** `e057da1`

**완료 내용:**
- `src/auth.ts` — NextAuth v5 설정, Google OAuth 프로바이더, ADMIN_EMAILS 기반 signIn 콜백
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth 핸들러
- `src/middleware.ts` — `/admin/*` 라우트 보호, `/admin/login`은 통과
- `src/app/admin/login/page.tsx` + CSS — Google 로그인 버튼 (Server Action)
- `src/app/admin/page.tsx` + CSS — 어드민 대시보드, 로그아웃

**중요 메모:**
- Next.js 16.2.7에서 `middleware.ts` → `proxy.ts` 이름 변경 deprecation warning 있음 (빌드는 통과)
- `.env.local` stub 값 포함 (빌드용, gitignored)

---

### Phase 10 — 배포 설정 (Task 18)

**커밋:** `059e257`

**완료 내용:**
- `@vercel/analytics` 설치 및 `<Analytics />` layout.tsx에 추가
- `vercel.json` — 빌드 커맨드, 도쿄 리전 `nrt1`, manifest/icons 캐시 헤더

---

## 현재 라우트 구조

```
/ (static)                  — 홈 페이지
/map (static)               — 지도 페이지 (Mapbox, SSR:false)
/map/[stopId] (dynamic)     — 특정 정류장 선택 지도
/story (static)             — 데브로그 에피소드 목록
/story/[slug] (SSG)         — 에피소드 상세 (MDX, 5개 공개)
/admin (dynamic)            — 어드민 대시보드 (Google OAuth 필요)
/admin/login (static)       — 어드민 로그인
/api/auth/[...nextauth]     — NextAuth 핸들러
```

---

## 디렉토리 구조 전체

```
kagoshima-cityview/
├── content/
│   └── story/
│       └── ko/                    ← 한국어 MDX 에피소드 (en/, ja/ 번역 미완성)
│           ├── 01-missed-the-bus.mdx
│           ├── 02-everyone-suffers.mdx
│           ├── 03-planning.mdx
│           ├── 04-design.mdx
│           ├── 05-building.mdx
│           └── 06-pitch.mdx       ← published: false (결과 공개 후 변경)
├── docs/
│   ├── adr/
│   │   ├── 001-mapbox-over-google.md
│   │   ├── 002-react-i18next.md
│   │   ├── 003-no-turbopack.md
│   │   ├── 004-route-params.md
│   │   └── 005-mdx-multilingual.md
│   ├── superpowers/
│   │   ├── plans/2026-06-06-kagoshima-cityview.md
│   │   └── specs/2026-06-06-kagoshima-cityview-design.md
│   ├── data-sources.md
│   └── project-overview.md
├── public/
│   ├── icons/
│   │   ├── icon-192.svg           ← ⚠ PNG로 교체 필요
│   │   └── icon-512.svg           ← ⚠ PNG로 교체 필요
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── login/page.tsx + login.module.css
│   │   │   └── page.tsx + admin.module.css
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── map/
│   │   │   ├── [stopId]/page.tsx  ← await params (Next.js 15+)
│   │   │   ├── MapPage.tsx + MapPage.module.css
│   │   │   └── page.tsx
│   │   ├── story/
│   │   │   ├── [slug]/page.tsx + episode.module.css
│   │   │   └── page.tsx + story.module.css
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── auth.ts                    ← NextAuth v5 config
│   ├── components/
│   │   ├── home/                  ← Hero, TrustSection, ProblemGrid, PartnershipSection, Footer
│   │   ├── map/                   ← MapCanvas, SidePanel, StopList, StopDetail, CategoryChips, DestinationCards, BottomSheet
│   │   ├── story/                 ← EpisodeCard, EpisodeNav
│   │   ├── I18nProvider.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── Nav.tsx
│   ├── data/
│   │   ├── destinations.json
│   │   └── stops.json             ← stop_03 googleMapsError:true
│   ├── lib/
│   │   ├── devlog.ts              ← getAllEpisodes, getEpisode, ko fallback
│   │   ├── i18n.ts                ← react-i18next 초기화
│   │   └── stops.ts              ← getAllStops, getStopsGeoJSON, ROUTE_COORDINATES
│   ├── messages/
│   │   ├── en.json
│   │   ├── ja.json
│   │   └── ko.json
│   ├── middleware.ts              ← /admin/* 보호
│   └── styles/
│       └── tokens.css             ← 디자인 토큰
├── .env.local                     ← gitignored, stub 값 포함
├── .env.local.example
├── global-log.md                  ← 이 파일
├── next.config.mjs
├── package.json
└── vercel.json                    ← regions: ["nrt1"] (도쿄)
```

---

## 다음 세션에서 할 일

### UX 개선 기획서
`docs/ux-improvements.md` — 18개 기능 전수조사 완료, 우선순위 정의됨

**P0 완료 (2026-06-07):**
1. ✅ Google Maps / Apple Maps(iOS전용) 링크 — StopDetail 하단 "Open in Maps" 섹션
2. ✅ 좌표 복사 버튼 — GPS 배지 옆 ⎘ 아이콘, 토스트 피드백
3. ✅ 정류장 URL 공유 — Web Share API (폴백: 클립보드 복사)
4. ✅ 현재 위치 → 가장 가까운 정류장 자동 선택 — GeolocateControl + haversine
5. ✅ 구글맵 오류 위치 시각화 — stop_03에 googleMapsLat/Lng 추가, 선택 시 빨간 반투명 핀 표시

**다음 (P1):**
- 정류장 검색
- 버스 운행 시간표 (GTFS stop_times.txt 파싱)
- 오프라인 모드 안내 배너
- 정류장 사진
- 도보 경로 미리보기 (Mapbox Directions API)

### 우선순위 높음
- [ ] **Vercel 배포** — 레포 연결 후 환경변수 설정:
  ```
  NEXT_PUBLIC_MAPBOX_TOKEN=pk.실제토큰
  NEXTAUTH_SECRET=랜덤32자
  NEXTAUTH_URL=https://your-domain.vercel.app
  GOOGLE_CLIENT_ID=실제값
  GOOGLE_CLIENT_SECRET=실제값
  ADMIN_EMAILS=fkffksk20@gmail.com
  ```
- [ ] **Google OAuth 콘솔** — 승인된 리다이렉트 URI 추가:
  `https://your-domain.vercel.app/api/auth/callback/google`

### 우선순위 중간
- [ ] **PWA 아이콘 교체** — SVG placeholder(`public/icons/icon-*.svg`) → 실제 PNG (192x192, 512x512)
- [ ] **에피소드 06 공개** — 관광과 제안 결과 나오면 `06-pitch.mdx`에서 `published: false` → `true`
- [ ] **middleware.ts → proxy.ts 이름 변경** — Next.js 16 deprecation warning 해소

### 우선순위 낮음
- [ ] **en/ja 번역** — `content/story/en/`, `content/story/ja/` MDX 파일 추가 (현재 ko만 존재, fallback으로 동작)
- [ ] **generateStaticParams for /map/[stopId]** — 20개 정류장을 SSG로 사전 생성하려면 추가
- [ ] **실제 GTFS 데이터 재검증** — 다음 현장 방문 시 좌표 재확인 및 `data-sources.md` 업데이트

---

## 알려진 기술 이슈

| 이슈 | 상태 | 비고 |
|------|------|------|
| Mapbox Expression deprecated | 해결 | `as unknown as number/string` 캐스팅 |
| Turbopack + Mapbox Worker 충돌 | 해결 | `--no-turbo` 플래그 |
| next-intl URL prefix 충돌 | 해결 | react-i18next로 전환 |
| i18n 비동기 race condition | 해결 | `initPromise` 가드 |
| middleware.ts deprecation warning | 미해결 | 빌드는 통과, 다음 세션에 `proxy.ts`로 이름 변경 |
| PWA SVG 아이콘 | 미해결 | placeholder, PNG 교체 필요 |

---

## 핵심 설계 결정 빠른 참조

- **Mapbox color expression:** `mapboxgl.Expression` 타입 deprecated → `as unknown as string` 사용
- **지도 SSR 방지:** `dynamic(() => import('@/components/map/MapCanvas'), { ssr: false })`
- **Mapbox CSS 위치:** `mapbox-gl/dist/mapbox-gl.css`는 반드시 `MapCanvas.tsx` 안에서 import (globals.css 아님)
- **Next.js 15+ dynamic params:** `interface Props { params: Promise<{ stopId: string }> }` + `await params`
- **언어 감지 순서:** `querystring('lang') → cookie('i18next') → navigator`
- **MDX fallback:** `getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')`
