# 가고시마 시티뷰 버스 가이드 — 개발 진행 로그

> 다음 세션에서 이 파일을 먼저 읽고 현재 상태를 파악하세요.
> 최종 업데이트: 2026-06-07 (다중 노선 아키텍처 + 좌표 업데이트 + P2/P3 완료)

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

## 현재 상태: 다중 노선 아키텍처 + P2/P3 완료 ✅

**최신 커밋:** `f5c3904` (origin/main 동기화 완료)  
**빌드:** 클린. TypeScript 에러 없음.  
**노선:** cityview 20정류장 (전좌표 확인), cityview-night 7정류장 (전좌표 확인), islandview 12정류장 (7확인 / 5근사치)

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

### Phase 11 — 다중 노선 아키텍처 (2026-06-07)

**커밋:** `aa50ee9` → `f5c3904`

**완료 내용:**

**데이터 레이어 전환 (stops.ts 삭제 → routes.ts 신설):**
- `src/lib/routes.ts` 신설 — `RouteId`, `RouteStop`, `RouteMetadata` 타입, `getRoute()`, `getStopsForRoute()`, `getStopById()`, `getRouteCoordinates()`, `getStopsGeoJSON()`, `getNearestStop()`, `isRouteAvailableToday()` 등 다중 노선 함수
- `src/lib/stops.ts` **삭제** — 하위호환 shim이었으나 모든 consumer 마이그레이션 완료 후 제거 (커밋 `159953a`)
- `src/data/routes/cityview.json` — 기존 stops.json 데이터 이전 + RouteMetadata 구조로 재편
- `src/data/routes/cityview-night.json` — 야경코스 7정류장, strEnd.php API (rosenId=1660)로 좌표 전면 갱신
- `src/data/routes/islandview.json` — 아일랜드뷰 12정류장, A/B 코스 구분

**cityview-night.json 좌표 업데이트 (`0e80825`):**
- 소스: `kotsu-city-kagoshima.jp strEnd.php API` (rosenId=1660, 2026-06-07 추출)
- 7개 정류장 전부 공식 GPS 좌표로 교체 — `coordinatesApproximate` 필드 전부 제거
- cn_stop_03 (워터프론트파크): 기존 대비 ~275m 보정
- cn_stop_04 (시청 앞): 기존 추정치 → 공식값으로 대폭 수정
- cn_stop_06 이름 갱신: `西郷銅像前（宝山ホール側）`

**islandview.json 좌표 업데이트 (`fbb22db`):**
- 기존 좌표: 전부 31.66~31.68°N (실제보다 ~8-10km 북쪽)
- OSM Nominatim/Overpass로 7개 정류장 확인:
  - iv_stop_01 (桜島港): 31.5941, 130.5982
  - iv_stop_03 (レインボー桜島): 31.5912, 130.5959
  - iv_stop_04 (ビジターセンター): 31.5908, 130.5942
  - iv_stop_05 (烏島展望所): 31.5818, 130.6011
  - iv_stop_06 (赤水展望広場): 31.5769, 130.6031
  - iv_stop_08 (砂防センター): 31.5666, 130.6175
  - iv_stop_11 (湯之平展望所): 31.5915, 130.6300
- 나머지 5개 (iv_stop_02, 07, 09, 10, 12): 추정치, `coordinatesApproximate: true` 유지
- strEnd.php가 Island View를 지원하지 않음 확인 (rosenId 1~5000 전수 스캔)

**컴포넌트 routeId 전파 (`9eddbd9`, `26f68da`, `df45fd6`):**
- `MapCanvas.tsx`: `routeId: RouteId` prop 추가, `clearMapLayers()` + `addMapLayers()` 헬퍼, routeId 변경 시 flyTo + 레이어 리셋
- `MapPage.tsx`: `activeRoute` state (`RouteId`), `?route=` URL 파라미터 지원, `routeId` → MapCanvas/SidePanel/BottomSheet 전달
- `RouteTab.tsx`: 노선 선택 탭 컴포넌트 신설
- SidePanel, BottomSheet, StopDetail, QRModal 전부 `routeId: RouteId` prop 수용, 공유 URL에 `?route=` 포함
- `TrustSection.tsx`: `getMetadata()` → `getRoute('cityview')` 전환 (TS 타입 오류 해소)

**P2 — 야경코스 시간표 표시 (`f5c3904`):**
- 기존: `departures.length > 0` 조건부로 스케줄 섹션 숨김 → 야경코스는 아무것도 표시 안 됨
- 변경: `schedule` 객체가 있으면 항상 섹션 표시, 시각 없을 때는 `operatingNote`만 표시
- 야경코스 정류장에 "매주 토요일 운행 — 공식 사이트에서 시각 확인" 문구 노출

**P3 — UI 시각 개선 (`f5c3904`):**
- `StopDetail.tsx` 배지:
  - 좌표 근사치: 점선 amber 배지 `~ 좌표 근사치 (미검증)`
  - B코스 전용: 파란 mono 배지 `B코스 전용` (`!courses.includes('A')` 기준)
- `routes.ts`: GeoJSON properties에 `isBCourseOnly` 추가
- `MapCanvas.tsx` 지도 마커:
  - 근사 좌표 정류장: circle-stroke-color = `#C87A3A` (orange)
  - B코스 전용: circle-opacity = 0.55
- `StopDetail.module.css`: `.badgeApprox`, `.badgeCourse` 스타일 추가
- i18n: `map.stopDetail.coordsApproximate`, `map.stopDetail.bCourseOnly` 키 추가 (ko/en/ja)

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
│   │   ├── map/                   ← MapCanvas(export MapCanvasProps), SidePanel, StopList, StopDetail, CategoryChips, DestinationCards, BottomSheet, StopSearch, QRModal
│   │   ├── story/                 ← EpisodeCard, EpisodeNav
│   │   ├── OfflineBanner.tsx      ← 오프라인 감지 + PWA 설치 유도 배너
│   │   ├── ThemeProvider.tsx      ← useTheme 훅 + ThemeContext + prefers-color-scheme 감지
│   │   ├── I18nProvider.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   └── Nav.tsx                ← 테마 토글 버튼 추가됨
│   ├── data/
│   │   ├── destinations.json
│   │   └── routes/
│   │       ├── cityview.json      ← 20정류장, GPS 전좌표 확인 (strEnd.php rosenId=1680)
│   │       ├── cityview-night.json← 7정류장, GPS 전좌표 확인 (strEnd.php rosenId=1660)
│   │       └── islandview.json    ← 12정류장, 7확인(OSM) / 5근사치(coordinatesApproximate: true)
│   ├── lib/
│   │   ├── devlog.ts              ← getAllEpisodes, getEpisode, ko fallback
│   │   ├── favorites.ts           ← getFavorites, toggleFavorite, isFavorite (localStorage)
│   │   ├── i18n.ts                ← react-i18next 초기화
│   │   ├── routes.ts              ← 다중노선 타입+함수 (stops.ts 대체, 삭제됨)
│   │   └── theme.ts               ← getStoredTheme, setStoredTheme, resolveTheme, applyTheme
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

### UX 개선 완료 현황

**P0 완료 (2026-06-07):**
1. ✅ Google Maps / Apple Maps(iOS전용) 링크
2. ✅ 좌표 복사 버튼
3. ✅ 정류장 URL 공유
4. ✅ 현재 위치 → 가장 가까운 정류장 자동 선택
5. ✅ 구글맵 오류 위치 시각화

**P1 완료 (2026-06-07):**
6. ✅ 정류장 검색
7. ✅ 버스 운행 시간표
8. ✅ 오프라인 안내 배너
9. ✅ 정류장 사진 슬롯 (placeholder, 실제 사진 교체 필요)
10. ✅ 도보 경로 미리보기

**P2 완료 (2026-06-07):**
11. ✅ 즐겨찾기
12. ✅ 다크 모드
13. ✅ 지도 핀 호버 툴팁
14. ✅ QR 코드 생성
15. ✅ 지도 스타일 선택 (일반/위성/야간)
16. ✅ 버스 애니메이션

**다중 노선 + 데이터 (2026-06-07):**
17. ✅ 다중 노선 아키텍처 (cityview / cityview-night / islandview)
18. ✅ cityview-night.json 좌표 전면 갱신 (strEnd.php, rosenId=1660)
19. ✅ islandview.json 좌표 갱신 (7/12 OSM 확인)
20. ✅ 야경코스 scheduleNote 표시 (P2 시간표)
21. ✅ 좌표 근사치 / B코스 전용 배지 (P3-A)
22. ✅ 지도 마커 시각 구분 (orange stroke / 55% opacity) (P3-B)

---

### 남은 작업

**P1 — 아일랜드뷰 나머지 좌표 확인**
- iv_stop_02 (火の島めぐみ館), iv_stop_07/09 (赤水麓 B), iv_stop_10 (赤水湯之平口), iv_stop_12 (桜洲小学校前)
- 현장 방문 또는 가고시마 관광정보 공식 PDF 추가 자료 분석

**P2 — 야경코스 실제 시간표 채우기**
- 현재: `departures: []` (공식 사이트 확인 문구 표시)
- 정확한 출발 시각 공식 홈페이지 확인 후 JSON 업데이트

**P3 — 배포 설정**
- [ ] **Vercel 환경변수:**
  ```
  NEXT_PUBLIC_MAPBOX_TOKEN=pk.실제토큰
  NEXTAUTH_SECRET=랜덤32자
  NEXTAUTH_URL=https://your-domain.vercel.app
  GOOGLE_CLIENT_ID=실제값
  GOOGLE_CLIENT_SECRET=실제값
  ADMIN_EMAILS=fkffksk20@gmail.com
  ```
- [ ] **Mapbox 토큰 도메인 제한** — Mapbox 대시보드에서 URL 허용 목록 설정
- [ ] **Google OAuth 콘솔** — 승인된 리다이렉트 URI: `https://your-domain.vercel.app/api/auth/callback/google`

**P4 — 우선순위 중간**
- [ ] **PWA 아이콘 교체** — `public/icons/icon-*.svg` → 실제 PNG (192x192, 512x512)
- [ ] **에피소드 06 공개** — 관광과 제안 결과 후 `06-pitch.mdx` published: true
- [ ] **middleware.ts → proxy.ts 이름 변경** — Next.js 16 deprecation warning 해소
- [ ] **en/ja 스토리 번역** — `content/story/en/`, `content/story/ja/` MDX 파일 추가

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
| dynamic() 타입 추론 | 해결 | `MapCanvasProps` export + `dynamic<MapCanvasProps>()` 명시 필수 |
| islandview 좌표 5개 근사치 | 미해결 | iv_stop_02,07,09,10,12 — coordinatesApproximate: true, 현장 또는 자료로 확인 필요 |
| 야경코스 departures[] 비어있음 | 미해결 | 공식 사이트 문구 표시 중, 실제 시각 채워야 함 |

---

## P2 신규 파일/컴포넌트 요약

| 파일 | 역할 |
|------|------|
| `src/lib/favorites.ts` | localStorage 즐겨찾기 CRUD |
| `src/lib/theme.ts` | 다크모드 유틸 (get/set/apply) |
| `src/components/ThemeProvider.tsx` | ThemeContext + useTheme 훅 |
| `src/components/map/QRModal.tsx` | QR 코드 모달 (qrcode 패키지, PNG 다운로드) |
| `src/components/map/QRModal.module.css` | QR 모달 스타일 |

**MapCanvas.tsx 주요 추가 사항:**
- `addMapLayers(map, selectedId)` — 모듈레벨 헬퍼, `style.load` 이벤트 후 레이어 복원
- `interpolateRoute(coords, t)` — 선분 길이 비례 위치 보간
- `getCurrentLang()` — cookie/localStorage에서 현재 언어 읽기 (툴팁용)
- `hoverPopupRef` — 핀 호버 팝업
- `busMarkerRef`, `animFrameRef`, `animStartRef` — 버스 애니메이션
- `mapStyle` state + `mapStyleRef` — 지도 스타일 선택
- `selectedStopIdRef` — style.load 클로저에서 선택 정류장 접근용

---

## 핵심 설계 결정 빠른 참조

- **Mapbox color expression:** `mapboxgl.Expression` 타입 deprecated → `as unknown as string` 사용
- **지도 SSR 방지:** `dynamic(() => import('@/components/map/MapCanvas'), { ssr: false })`
- **Mapbox CSS 위치:** `mapbox-gl/dist/mapbox-gl.css`는 반드시 `MapCanvas.tsx` 안에서 import (globals.css 아님)
- **Next.js 15+ dynamic params:** `interface Props { params: Promise<{ stopId: string }> }` + `await params`
- **언어 감지 순서:** `querystring('lang') → cookie('i18next') → navigator`
- **MDX fallback:** `getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')`
- **dynamic() 타입:** `dynamic<MapCanvasProps>()` — 제네릭 생략 시 새 props 인식 못함, `MapCanvasProps`는 반드시 export
- **userLocation 상태 위치:** MapPage에서 관리, MapCanvas → `onUserLocation` 콜백으로 전달 → SidePanel/BottomSheet → StopDetail로 전달
- **정류장 사진 추가 방법:** stops.json 해당 stop에 `"photos": ["/images/stops/stop_XX.jpg"]` 추가 후 `public/images/stops/`에 파일 배치
