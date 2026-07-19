# AGENTS.md

> 이 파일은 AI 코딩 에이전트를 위해 작성된 프로젝트 가이드입니다. 이 프로젝트에 대해 아무것도 모르는 상태에서 읽기 시작한다고 가정하고 작성되었습니다.

## 프로젝트 개요

**가고시마 시티뷰 버스 가이드**는 일본 가고시마 시의 시티뷰(City View) 관광 버스 정류장 20곳의 정확한 GPS 위치를 지도로 제공하는 다국어 웹 서비스입니다.

- **서비스 목적:** 구글맵 등 기존 지도 서비스가 정류장 위치를 잘못 표시해 여행자가 버스를 놓치는 문제를 해결합니다.
- **최종 목표:** 가고시마시 관광과(観光課)의 공식 채택.
- **핵심 가치:** 무료 · 광고 없음 · 공식 GTFS 오픈데이터 기반 · 현장 GPS 검증.
- **지원 언어:** 한국어(ko) · English(en) · 日本語(ja). 기본 언어는 한국어입니다.

### 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 스토리 페이지 — 서비스 소개, 제작 경위, 관광과 협력 제안 |
| `/map` | 지도 페이지 — 핵심 기능. 노선별 정류장 지도 |
| `/map/[stopId]` | 특정 정류장 선택 상태. URL 공유 가능 |
| `/story` | 데브로그 에피소드 목록 |
| `/story/[slug]` | 개별 에피소드 상세 (MDX) |
| `/admin` | 관리자 페이지 (NextAuth 보호) |
| `/admin/login` | 관리자 로그인 (Google OAuth) |
| `/card` | 정류장 카드 인쇄 인덱스 (호텔·관광안내소 배포용, 색인 제외) |
| `/card/[stopId]` | A6 프린트용 정류장 QR 카드. QR은 `QRModal`과 동일한 도메인/URL 규칙 사용 |

## 기술 스택

| 레이어 | 기술 | 버전/비고 |
|--------|------|-----------|
| 프레임워크 | Next.js | 16.2.7 (App Router) |
| 런타임 | React | 19.2.4 |
| 언어 | TypeScript | 5.x |
| 번들러 | webpack | Turbopack 비활성화 (Mapbox Worker URL 충돌 회피) |
| 지도 | Mapbox GL JS | 3.24.0 |
| 국제화(i18n) | react-i18next | next-intl 대신 사용. URL prefix 없이 쿠키/쿼리스트링 기반 |
| 콘텐츠 | next-mdx-remote + gray-matter | 데브로그 MDX 렌더링 |
| 인증 | NextAuth.js v5 | `/admin` 라우트 보호 전용 |
| PWA | @ducanh2912/next-pwa | `public` 경로에 service worker 생성 |
| 분석 | @vercel/analytics | |
| 스타일 | CSS Modules + `src/styles/tokens.css` | Tailwind 미사용 |
| 배포 | Vercel | 도쿄 리전(`nrt1`) |

### 핵심 외부 의존성

```json
{
  "dependencies": {
    "@ducanh2912/next-pwa": "^10.2.9",
    "@vercel/analytics": "^2.0.1",
    "gray-matter": "^4.0.3",
    "i18next": "^26.3.1",
    "i18next-browser-languagedetector": "^8.2.1",
    "mapbox-gl": "^3.24.0",
    "next": "16.2.7",
    "next-auth": "^5.0.0-beta.31",
    "next-mdx-remote": "^6.0.0",
    "qrcode": "^1.5.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-i18next": "^17.0.8"
  }
}
```

## 코드 구조

```
/Users/sondong-gyu/IdeaProjects/kagoshima-cityview/
├── src/
│   ├── app/                    # Next.js App Router 페이지
│   │   ├── page.tsx            # 스토리 랜딩 페이지
│   │   ├── layout.tsx          # 루트 레이아웃 (i18n, theme, analytics)
│   │   ├── globals.css         # 전역 스타일 + tokens.css import
│   │   ├── map/
│   │   │   ├── page.tsx        # /map (정류장 미선택)
│   │   │   ├── [stopId]/page.tsx  # /map/[stopId]
│   │   │   └── MapPage.tsx     # 지도 페이지 클라이언트 컴포넌트
│   │   ├── story/
│   │   │   ├── page.tsx        # /story 에피소드 목록
│   │   │   └── [slug]/page.tsx # /story/[slug] 에피소드 상세
│   │   ├── admin/
│   │   │   ├── page.tsx        # 관리자 대시보드
│   │   │   └── login/page.tsx  # 관리자 로그인
│   │   └── api/auth/[...nextauth]/route.ts  # NextAuth 핸들러
│   ├── components/             # React 컴포넌트
│   │   ├── Nav.tsx             # 글로벌 네비게이션
│   │   ├── LanguageSwitcher.tsx
│   │   ├── I18nProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── home/               # 스토리 페이지 섹션 컴포넌트
│   │   ├── map/                # 지도 관련 컴포넌트
│   │   └── story/              # 데브로그 컴포넌트
│   ├── data/                   # 정적 데이터
│   │   ├── routes/
│   │   │   ├── cityview.json      # 시티뷰 노선 (20정류장)
│   │   │   ├── cityview-night.json # 야경 코스 (7정류장)
│   │   │   └── islandview.json    # 아일랜드뷰 (12정류장)
│   │   └── destinations.json   # 목적지 추천 데이터
│   ├── lib/                    # 비즈니스 로직 유틸리티
│   │   ├── routes.ts           # 노선 데이터 모델 및 조회 함수
│   │   ├── devlog.ts           # 데브로그 MDX 파일 조회
│   │   ├── i18n.ts             # react-i18next 설정
│   │   ├── theme.ts            # 다크/라이트 테마 유틸
│   │   └── favorites.ts        # localStorage 즐겨찾기
│   ├── messages/               # i18n 번역 JSON
│   │   ├── ko.json
│   │   ├── en.json
│   │   └── ja.json
│   └── styles/
│       └── tokens.css          # 디자인 토큰 (색상, 폰트, 레이아웃)
├── content/
│   └── story/                  # 데브로그 MDX (ko/en/ja)
├── docs/                       # 프로젝트 문서
│   ├── project-overview.md
│   ├── data-sources.md
│   ├── data-update-guide.md
│   ├── issues.md
│   ├── ux-improvements.md
│   └── adr/                    # 아키텍처 결정 기록
├── public/                     # 정적 에셋
│   ├── manifest.json           # PWA manifest
│   ├── icons/
│   └── images/
├── next.config.mjs
├── vercel.json
├── eslint.config.mjs
└── tsconfig.json
```

## 빌드 및 실행 명령어

```bash
# 개발 서버 실행 (localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행 (build 후)
npm run start

# ESLint 검사
npm run lint
```

> **참고:** Mapbox GL JS와의 Web Worker 충돌로 인해 Turbopack을 사용하지 않습니다. `next.config.mjs`의 `turbopack: {}`는 webpack 설정과의 공존 오류를 막는 용도일 뿐 webpack을 선택해주지는 않습니다. Next.js 16부터 Turbopack이 기본이므로 `package.json`의 `dev`/`build` 스크립트에 `--webpack` 플래그를 명시해 webpack을 강제해야 하며, 이 플래그가 없으면 next-pwa service worker가 생성되지 않습니다.

> 환경에 따라 `npm run build`가 `sh` 바이너리를 찾지 못하는 경우가 있습니다. 이때는 다음을 직접 실행합니다:  
> `node node_modules/.bin/next build`

## 환경 변수

`.env.local.example`을 복사해 `.env.local`을 생성하고 아래 값을 채웁니다.

```bash
# Mapbox (필수 — 클라이언트에서 노출됨, 도메인 스코프 제한 권장)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here

# NextAuth (필수)
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (관리자 로그인용)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 관리자 허용 이메일 (콤마 구분)
ADMIN_EMAILS=your@email.com
```

- `NEXT_PUBLIC_MAPBOX_TOKEN`은 반드시 Mapbox Dashboard에서 허용 URL 스코프를 제한하세요. 공개될 경우 무료 사용량이 남용될 수 있습니다.
- `.env*` 파일은 `.gitignore`에 의해 커밋되지 않습니다. `!.env.local.example` 예외만 유지됩니다.

## 코드 스타일 가이드라인

### 언어 및 주석

- **소스코드 주석:** 한국어로 작성합니다.
- **컴포넌트/변수명:** TypeScript 식별자는 영문 camelCase/PascalCase를 사용합니다.
- **CSS 클래스명:** kebab-case를 사용합니다.
- **JSON 데이터의 현지어 필드:** `name: { ko, en, ja }` 구조를 유지합니다.

### TypeScript

- `strict: true`가 적용되어 있습니다. `any` 사용을 최소화하세요.
- 절대 경로 별칭 `@/*`는 `src/*`를 가리킵니다.
- JSON import 후 `as unknown as RawRouteData`와 같은 캐스팅 패턴이 데이터 레이어에서 사용됩니다.
- Mapbox GL JS의 `PaintProperty` 타입 불일치 문제로 일부 `as unknown as ...` 캐스팅이 존재합니다. 새로 추가 시에도 동일한 방식으로 처리하세요.

### 컴포넌트 작성 규칙

- **react-i18next 사용 시:** 번역이 필요한 컴포넌트는 최상단에 `'use client'`를 선언해야 합니다. Server Component에서는 번역 API를 사용할 수 없습니다.
- **Mapbox 컴포넌트:** `MapCanvas`는 `dynamic(() => import(...), { ssr: false })`로 임포트해야 합니다. 서버에서 `window`를 참조하면 오류가 발생합니다.
- **CSS Modules:** 컴포넌트와 동일한 기본 이름에 `.module.css` 확장자를 사용합니다. 예: `Nav.tsx` → `Nav.module.css`.

### 데이터 관리 규칙 (필수)

> **규칙 ISS-001:** 정류장 좌표는 `src/data/routes/*.json` 파일이 유일한 진실의 원천입니다.  
> TypeScript 파일(컴포넌트, `lib/routes.ts`, 기타 유틸 등)에 좌표를 직접 하드코딩하지 마세요.  
> 지도 렌더링에 필요한 좌표 배열은 반드시 `getRouteCoordinates(routeId)` 또는 `getStopsForRoute(routeId)`로 파생하세요.

### 사진 에셋 경로 규칙

- 사진 파일은 `public/images/` 아래 용도별 디렉터리에 둡니다.
- **홈 히어로:** `public/images/hero/sakurajima.jpg` — `HeroScroll.tsx`의 `HERO_PHOTO` 상수가 참조합니다. 파일이 없으면 기존 그라디언트+실루엣 fallback이 자동 표시되므로, 파일을 추가하기만 하면 됩니다.
- 히어로는 스크롤 스크럽 컴포넌트(`src/components/home/HeroScroll.tsx`)입니다. JS는 진행률 CSS 변수 `--p`만 갱신하고 연출은 CSS(`HeroScroll.module.css`의 `--p1`~`--p5` 단계 변수)가 담당합니다. `/?p=0.6` 같은 쿼리 파라미터로 진행률을 고정해 구간별 확인이 가능합니다. `prefers-reduced-motion`이면 정적 히어로로 fallback합니다.
- **정류장 사진:** `public/images/stops/`에 내용 기반 이름(예: `senganen.jpg`, `shiroyama.jpg`, `kagoshima-bay.jpg`)으로 추가한 뒤, 해당 노선 JSON(`src/data/routes/*.json`)의 정류장 객체에 `"photos": ["/images/stops/senganen.jpg"]`를 추가해야 `StopDetail`에 표시됩니다. `photos`가 없으면 `placeholder.svg`가 표시됩니다. 무거운 PNG 원본은 `public/`이 아닌 루트 `image/`에 보관하고, 웹용은 JPG(q75~85)로 변환해 넣습니다(PWA precache 부피 절약).

### 디자인 시스템

디자인 토큰은 `src/styles/tokens.css`에 정의되어 있습니다.

```css
:root {
  --bg:     #F4EFE9;   /* 화산재 베이지 */
  --white:  #FFFFFF;
  --ink:    #1C1A18;   /* 먹색 */
  --mid:    #555555;
  --muted:  #8A8278;
  --rule:   #DDD7D0;   /* 구분선 */
  --accent: #8B4513;   /* 적갈색 */
  --dark:   #1F1E1A;   /* 다크 배경 */
  --pin-default: #1E3A4F;
  --pin-active:  #8B4513;
  --pin-warn:    #C87A3A;
  --nav-h:  64px;
  --side-w: 320px;
  --radius: 4px;
}
```

- 폰트는 Google Fonts CDN 없이 macOS/Windows 시스템 폰트(Hiragino, Yu Gothic, -apple-system)를 사용합니다. 오프라인 환경을 고려한 선택입니다.
- 다크 모드는 `data-theme="dark"` 속성과 `prefers-color-scheme` 미디어쿼리를 조합해 작동합니다.

## 테스트

현재 프로젝트에 별도의 테스트 프레임워크(Jest, Vitest, Playwright 등)는 설치되어 있지 않습니다.  
품질 확인은 다음 방법으로 수행합니다.

1. **TypeScript 컴파일:** `npm run build` (빌드 실패 = 타입 오류)
2. **ESLint:** `npm run lint`
3. **수동 확인:** `npm run dev` 후 브라우저에서 지도 마커 위치, 노선 폴리라인, 언어 전환, 모바일 바텀시트 등을 확인

### 노선 데이터 업데이트 후 체크리스트

`docs/data-update-guide.md`를 참고하세요. 핵심 항목:

- [ ] 해당 노선의 모든 마커가 실제 도로 위에 찍히는지
- [ ] 노선 폴리라인이 실제 운행 경로를 따르는지
- [ ] `stop_01`과 `stop_20`이 동일 위치(가고시마 중앙역)인지
- [ ] 시간표 첫/막차 시간이 공식 데이터와 일치하는지
- [ ] `coordinatesApproximate`와 `metadata.lastSourceCheckedAt`(실측 시 `lastFieldVerifiedAt`) 등 메타데이터가 갱신되었는지

## 배포 프로세스

1. Vercel에 연결된 Git 저장소의 `main` 브랜치에 푸시하면 자동 빌드/배포됩니다.
2. `vercel.json` 설정:
   - `buildCommand`: `npm run build`
   - `devCommand`: `npm run dev`
   - `framework`: `nextjs`
   - `regions`: `["nrt1"]` (도쿄 리전)
   - `manifest.json`과 아이콘에 대한 캐시 헤더 설정 포함
3. PWA service worker는 `@ducanh2912/next-pwa`가 빌드 시 `public/`에 생성합니다. `public/sw.js`, `public/workbox-*.js`는 `.gitignore`에 포함되어 Git에서 제외됩니다.
4. 관광과 공식 채택 이전에는 Vercel Hobby → Pro 전환이 필요합니다. Hobby ToS의 상업적 이용 제한에 해당할 수 있습니다.

## 보안 및 민감 정보 고려사항

1. **Mapbox 토큰:**
   - `NEXT_PUBLIC_MAPBOX_TOKEN`은 클라이언트에 노출됩니다.
   - Mapbox Dashboard에서 허용 URL(도메인) 스코프를 제한하세요.
   - 토큰 노출 시 즉시 재발급하고 `vercel.json`/`next.config.mjs`에 추가적인 남용 방지 설정은 없으므로 모니터링이 필요합니다.

2. **인증:**
   - NextAuth v5(Google OAuth)를 사용합니다.
   - `ADMIN_EMAILS` 환경변수에 등록된 이메일만 로그인할 수 있습니다.
   - `/admin/:path*`는 `src/middleware.ts`에서 보호됩니다.
   - 관리자 페이지는 현재 데이터 편집 UI 없이 라우트 보호만 구현되어 있습니다.

3. **.env 파일:**
   - `.env*`는 Git에 커밋되지 않습니다.
   - `ADMIN_EMAILS`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`은 절대로 클라이언트 코드나 로그에 노출하지 마세요.

4. **외부 API:**
   - Mapbox Directions API를 클라이언트에서 직접 호출합니다(`MapCanvas.tsx`). 요청 URL에 토큰이 포함되므로 네트워크 탭에서 노출됩니다.
   - 오류 발생 시 `.catch(() => {})`로 무방비하게 실패 처리되어 있으므로, 실패 원인을 추적하려면 로깅을 추가해야 합니다.

5. **법적/라이선스:**
   - 정류장 GPS 데이터는 가고시마시 공식 GTFS-JP 오픈데이터(CC BY 4.0)를 가공하여 사용합니다.
   - 푸터와 데이터 메타데이터에 반드시 출처를 표기해야 합니다: `データ提供：鹿児島市（原データより加工）`.
   - TripAdvisor 리뷰 등 제3자 콘텐츠의 직접 인용은 ToS 위반 리스크로 금지되어 있습니다.

## 주요 설계 결정 (ADRs)

`docs/adr/`에 기록된 핵심 결정입니다.

- **ADR 001:** Mapbox GL JS 선택 (Google Maps 대안). GeoJSON 네이티브 지원과 커스텀 레이어 자유도 때문. 또한 서비스의 핵심 메시지가 "구글맵이 틀렸다"는 점을 고려함.
- **ADR 002:** `react-i18next` 선택 (`next-intl` 대안). URL prefix(`/ko/`, `/en/`) 없이 `/map` 등 동일 URL로 다국어 지원 가능.
- **ADR 003:** Turbopack 비활성화. Mapbox GL JS의 Web Worker URL 처리와 충돌(`Cannot find module './mapbox-gl-csp-worker'`)을 회피하기 위함.
- **ADR 004:** `/map/[stopId]` 동적 라우트 사용. `useSearchParams()`는 Suspense boundary가 필요해 지도 컴포넌트에 부적합.
- **ADR 005:** MDX 다국어를 `content/story/{ko,en,ja}/`로 분리. 번역 파일이 독립적이고, 번역이 없으면 `ko`로 fallback.

## 개발 시 참고 문서

- `docs/project-overview.md` — 서비스 개요, 핵심 기능, 기술 스택
- `docs/data-sources.md` — 노선별 데이터 출처, 라이선스(CC BY 4.0 · islandview는 ODbL), 현장 검증 기록
- `docs/data-update-guide.md` — 노선 데이터 정기 업데이트 절차
- `docs/ux-improvements.md` — UX 기능 우선순위 및 기획
- `docs/issues.md` — 이슈 트래커 (ISS-001 등)
- `docs/adr/` — 아키텍처 결정 기록
- `global-log.md` — 개발 진행 로그 및 컨텍스트

## 개발 워크플로우 요약

1. 새 기능 추가 전 `docs/ux-improvements.md`의 우선순위와 `docs/adr/`의 결정을 확인하세요.
2. 데이터 변경이 필요하면 `src/data/routes/*.json`만 수정하고, TypeScript 파일에 좌표를 하드코딩하지 마세요.
3. `npm run build`와 `npm run lint`를 실행해 타입 및 린트 오류를 확인하세요.
4. 로컬에서 `npm run dev`로 브라우저 테스트를 수행하세요.
5. 변경 사항을 커밋하고 `main` 브랜치에 푸시하면 Vercel로 자동 배포됩니다.
