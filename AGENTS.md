# AGENTS.md

> 이 파일은 AI 코딩 에이전트를 위해 작성된 프로젝트 가이드입니다. 이 프로젝트에 대해 아무것도 모르는 상태에서 읽기 시작한다고 가정하고 작성되었습니다.

## 작업 범위와 완료 기준

- 완료 기준은 현재 사용자 요청에서 정합니다. 기존 QA 문서의 제외 항목은 사용자가 명시한 요구사항을 면제하지 않습니다.
- 외부 조건 때문에 수행하지 못한 항목은 미완료로 표시하고, 독립적으로 진행 가능한 승인 범위 내 작업은 계속합니다. 권한·승인이 필요한 단계는 우회하지 않습니다.
- 체크리스트 작성이나 제한사항 보고를 실제 구현·검증 완료로 취급하지 않습니다. 완료 보고에는 수행한 검증과 미완료 항목을 구분합니다.

## 프로젝트 개요

**가고시마 시티뷰 버스 가이드**는 일본 가고시마 시의 시티뷰(City View) 관광 버스 정류장 20곳의 정확한 GPS 위치를 지도로 제공하는 다국어 웹 서비스입니다.

- **서비스 목적:** 구글맵 등 기존 지도 서비스가 정류장 위치를 잘못 표시해 여행자가 버스를 놓치는 문제를 해결합니다.
- **최종 목표:** 가고시마시 관광과(観光課)의 공식 채택.
- **핵심 가치:** 무료 · 광고 없음 · 공식 GTFS 오픈데이터 기반 · 현장 GPS 검증.
- **지원 언어:** 日本語(ja) · English(en) · 한국어(ko) · 繁體中文(zh-Hant). 기본 언어는 일본어입니다. 중국어 요청(`zh`, `zh-TW`, `zh-HK`, `zh-CN` 등)은 모두 `zh-Hant`로 정규화합니다(ADR 008).

### 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 스토리 페이지 — 서비스 소개, 제작 경위, 관광과 협력 제안 |
| `/map` | 지도 페이지 — 핵심 기능. 노선별 정류장 지도 |
| `/map/[stopId]` | 특정 정류장 선택 상태. URL 공유 가능 |
| `/map?hotel=[slug]` | 호텔 모드 — 호텔 POP QR의 목적지. 호텔 핀·도보 경로·타는/내리는 정류장(`getHotelStops`). 호텔 좌표는 `src/data/hotels.json` |
| `/story` | 데브로그 에피소드 목록 |
| `/story/[slug]` | 개별 에피소드 상세 (MDX) |
| `/admin` | 관리자 페이지 (NextAuth 보호) |
| `/admin/login` | 관리자 로그인 (Google OAuth) |
| `/desk?hotel=[slug]` | 호텔 프런트용 통역 도우미(색인 제외). 직원이 일본어로 묻고 투숙객 언어로 답 카드. 유일한 AI 호출 지점은 `POST /api/desk` — `ANTHROPIC_API_KEY` 없으면 '준비 중'만 표시하고 호출·과금 없음. 모델·하루 상한은 `DESK_MODEL`·`DESK_DAILY_LIMIT_*`. 사실(정류장·시각·요금)은 `src/lib/desk.ts`가 데이터에서 컨텍스트로 넘기고 AI는 문장만 만든다 |
| `POST /api/e` | 이용 통계 수집(`src/lib/analytics`). 원본 이벤트 없이 `agg_daily` 일별 카운트만 UPSERT, 세션은 날짜별 솔트 해시(31일 후 cron 삭제). 좌표·IP·본문 미수집. `DATABASE_URL` 없으면 204로 무동작. 진입 경로는 QR URL의 `?src=`·`?hotel=`로 구분 |
| `/downloads` | 호텔·관광안내소용 허브 — 사이트 POP·포스터(호텔 이름 버전 포함)·정류장 POP 20개·제안서 PDF. `/card`는 여기로 리다이렉트 |
| `/card/site` | A6 사이트 QR 카드. QR은 첫 화면(`/`)으로 연결. `?hotel=slug`로 호텔 이름·최근접 정류장 표시 |
| `/card/poster` | A4 사이트 QR 포스터. 운행 정보는 노선 JSON 메타데이터에서 읽음. `?hotel=slug` 지원 |
| `/card/[stopId]` | A6 프린트용 정류장 QR 카드. 도메인은 `src/lib/site.ts`의 `SITE_URL` 하나로 관리 (`QRModal`과 공유) |
| `/accuracy` | 구글맵 정확도 감사 공개 페이지. 데이터는 `src/data/accuracy-audit.json` (`scripts/google-maps-audit` 파이프라인 산출물) |

## 기술 스택

| 레이어 | 기술 | 버전/비고 |
|--------|------|-----------|
| 프레임워크 | Next.js | 16.3.5 (App Router) |
| 런타임 | React | 19.2.7 |
| 언어 | TypeScript | 5.x |
| 번들러 | webpack | Turbopack 비활성화 (Mapbox Worker URL 충돌 회피) |
| 지도 | Mapbox GL JS | 3.26.0 |
| 국제화(i18n) | react-i18next | next-intl 대신 사용. URL prefix 없이 쿠키/쿼리스트링 기반 |
| 콘텐츠 | next-mdx-remote + gray-matter | 데브로그 MDX 렌더링 |
| 인증 | NextAuth.js v5 | `/admin` 라우트 보호 전용 |
| PWA | @ducanh2912/next-pwa | `public` 경로에 service worker 생성 |
| 분석 | @vercel/analytics | |
| 스타일 | CSS Modules + `src/styles/tokens.css` | Tailwind 미사용 |
| 폰트 | next/font/google (Zen Maru Gothic) | 빌드 시 자체 호스팅, 런타임 CDN 없음 (ADR 007) |
| 배포 | Vercel | 도쿄 리전(`hnd1`) |

### 핵심 외부 의존성

```json
{
  "dependencies": {
    "@ducanh2912/next-pwa": "^10.2.9",
    "@vercel/analytics": "^2.0.1",
    "gray-matter": "^4.0.3",
    "i18next": "^26.3.6",
    "i18next-browser-languagedetector": "^8.2.1",
    "mapbox-gl": "^3.26.0",
    "next": "^16.3.5",
    "next-auth": "^5.0.0-beta.32",
    "next-mdx-remote": "^6.0.0",
    "qrcode": "^1.5.4",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "react-i18next": "^17.0.10"
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
│   │   ├── ja.json
│   │   └── zh-Hant.json      # 繁體中文 (ja.json 기준 빌드 타임 번역)
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

> 실행 명령의 기준은 `package.json`의 scripts입니다. 환경에 따라 `npm run build`가 `sh` 바이너리를 찾지 못할 때만 `node node_modules/next/dist/bin/next build --webpack`을 직접 실행합니다. 개발 서버도 같은 문제라면 `node node_modules/next/dist/bin/next dev --webpack`을 사용합니다. 직접 실행할 때도 `--webpack`을 생략하지 않습니다.

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

# 프런트 통역 도우미 (/desk). 비워 두면 AI 호출·과금 없음
ANTHROPIC_API_KEY=
DESK_MODEL=claude-haiku-4-5
```

- `NEXT_PUBLIC_MAPBOX_TOKEN`은 반드시 Mapbox Dashboard에서 허용 URL 스코프를 제한하세요. 공개될 경우 무료 사용량이 남용될 수 있습니다.
- `.env*` 파일은 `.gitignore`에 의해 커밋되지 않습니다. `!.env.local.example` 예외만 유지됩니다.

## 코드 스타일 가이드라인

### 언어 및 주석

- **소스코드 주석:** 한국어로 작성합니다.
- **컴포넌트/변수명:** TypeScript 식별자는 영문 camelCase/PascalCase를 사용합니다.
- **CSS 클래스명:** kebab-case를 사용합니다.
- **JSON 데이터의 현지어 필드:** `name: { ko, en, ja, zh }` 구조를 유지합니다. UI 언어 `zh-Hant`는 데이터 키 `zh`로 저장하며 `nameKey(lang)`(`src/lib/routes.ts`)로 변환합니다. 서버 컴포넌트의 번역 묶음은 `src/lib/messages.ts`의 `MESSAGES`를 씁니다.

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

이 규칙은 좌표 원본의 관리 위치를 제한하며, JSON 이외의 파일 수정을 금지하는 규칙은 아닙니다. 요청된 데이터 구조 변경에 필요한 타입·조회 함수·화면·검증 코드는 함께 수정할 수 있습니다. 좌표 값을 TypeScript에 복제하지 마세요.

정류장과 운행 경로는 별도 데이터입니다. 노선 JSON의 `geometry`에 출처·확인일·코스별 도로 형상을 저장하고 `getRouteCoordinates(routeId, course)`로 조회합니다. 공식 출처 대조는 현장 GPS 실측과 다릅니다. 실제 실측 없이 `lastFieldVerifiedAt`을 갱신하지 마세요. 아일랜드뷰 도로 형상은 OSM 기반 참고 경로이며 공식 GPS 궤적이 아닙니다.

### 사진 에셋 경로 규칙

- 사진 파일은 `public/images/` 아래 용도별 디렉터리에 둡니다.
- **랜딩·포스터 사진:** `public/images/home/*.jpg` — 슬롯은 `src/components/home/photos.ts`의 `HOME_PHOTOS`가 관리합니다. 현재는 루트 `image/` 일러스트의 글자 부분을 잘라낸 임시 이미지이며, 실사 사진은 같은 파일명으로 덮어쓰거나 `photos.ts`의 경로만 바꾸면 됩니다(가로 1200px 전후, JPG q70~80). 스팟 카드의 정류장 연결(`SPOTS`)도 같은 파일에 있습니다.
- 랜딩은 여행 스크랩북 톤입니다. 토큰(`--paper`, `--tape`, `--stamp`, `--font-hand` 등)은 `src/styles/tokens.css`, 공통 요소는 `src/styles/scrapbook.module.css`에 있습니다. 스크롤 등장 연출은 `ScrapbookReveal`이 `[data-reveal]` 요소에 `data-in`을 붙이는 방식이며, 준비 클래스가 붙기 전(JS 실패 포함)에는 모든 내용이 그대로 보입니다. `prefers-reduced-motion`이면 연출하지 않습니다.
- 손글씨 폰트는 CDN 없이 시스템 폰트(Bradley Hand·Noteworthy·Segoe Print)를 쓰며 한글·가나는 세리프로 대체됩니다.
- **정류장 사진:** `public/images/stops/`에 내용 기반 이름(예: `senganen.jpg`, `shiroyama.jpg`, `kagoshima-bay.jpg`)으로 추가한 뒤, 해당 노선 JSON(`src/data/routes/*.json`)의 정류장 객체에 `"photos": ["/images/stops/senganen.jpg"]`를 추가해야 `StopDetail`에 표시됩니다. `photos`가 없으면 사진 영역 자체를 표시하지 않습니다(빈자리를 보여주지 않음). 무거운 PNG 원본은 `public/`이 아닌 루트 `image/`에 보관하고, 웹용은 JPG(q75~85)로 변환해 넣습니다(PWA precache 부피 절약).

### 디자인 시스템

**새 화면·컴포넌트를 만들기 전에 [`docs/design/design-system.md`](docs/design/design-system.md)를 먼저 읽으세요.** 레퍼런스 1번(ひらやすみ × 杉並区)을 기준으로 정한 여행 스크랩북(旅のしおり) 규칙입니다. 레퍼런스 분석은 [`docs/design/reference-analysis.md`](docs/design/reference-analysis.md)에 있습니다.

- **토큰:** `src/styles/tokens.css`. 기본 토큰(`--bg`, `--ink`, `--accent` 등)과 스크랩북 토큰(`--paper`, `--card`, `--pencil`, `--text-subtle`, `--stamp`, `--sea`, `--leaf`, `--marker`, `--partner`, `--tape`, `--shadow*`, `--radius-*`, `--fs-*`, `--space-*`, `--ease-out`, `--dur-*`)이 있습니다. 라이트·다크 값을 함께 정의합니다.
- **공통 요소:** `src/styles/scrapbook.module.css`(`texture`, `sheet`, `roughSheet`, `tape`, `marker`, `hand`, `dashedRule`, `stampIn`, `jitter`). 컴포넌트 CSS에서 `composes`로 씁니다. 테이프·종이 스타일을 새로 복사하지 마세요.
- **색:** 컴포넌트에 헥스값을 직접 쓰지 않습니다(인쇄물 `/card/*` 제외). 텍스트 대비는 JIS X 8341-3 AA(4.5:1) 이상입니다. `--muted`(3.2:1)는 텍스트에 쓰지 않고 `--text-subtle`을 씁니다. `--partner`(지자체 색)는 큰 글씨·장식 전용입니다.
- **정보는 똑바로:** 본문·시간표·요금·정류장 이름은 기울이지 않고 손글씨체로 쓰지 않습니다. 손글씨는 짧은 장식 문구에만 씁니다.
- **전환점:** `@media (max-width: 1023px)` 하나를 씁니다(레퍼런스 공통 기준).
- **모션:** `ScrapbookReveal`(`[data-reveal]` → `data-in`) 방식으로 통일하고, `prefers-reduced-motion`을 반드시 존중합니다.
- **폰트:** 기본은 Zen Maru Gothic입니다. `next/font/google`로 빌드할 때 받아 같은 도메인에서 제공합니다(런타임 CDN 없음, CSP `font-src 'self'`). 일본어 조각 파일은 PWA precache에서 제외하고 런타임 캐시로만 쌓습니다(`next.config.mjs`, ADR 007). 외부 폰트 `<link>`를 추가하지 마세요.
- **아이콘·메뉴:** UI 아이콘은 이모지 대신 `src/components/icons.tsx`의 선 아이콘을 씁니다. 주요 페이지 링크는 `SITE_LINKS`(`Nav.tsx`)에 추가하면 상단 메뉴·모바일 메뉴·푸터에 함께 반영됩니다.
- **운행 시각:** 다음 버스 등 시간 계산은 `getNextDeparture`/`getJapanMinutes`(일본 시간 기준)를 쓰고, 현재 시각은 `useNow`로 클라이언트에서만 읽습니다(hydration 불일치 방지).
- **화면 레이어:** 지도·관리자·인쇄물은 기능 레이어입니다. 색·서체 토큰만 쓰고 종이 질감·기울기·손글씨·등장 연출은 쓰지 않습니다.
- **다크 모드:** `data-theme="dark"` 속성으로 전환합니다(ThemeProvider가 `prefers-color-scheme`를 해석해 설정).

## 테스트

1. **정적·단위·빌드 검사:** `npm run check` (ESLint → Vitest → Next.js 빌드 및 타입 검사).
2. **브라우저 회귀:** 처음에는 `npx playwright install chromium`, 빌드 후 `npm run test:e2e`. 데스크톱·모바일의 언어, 탐색, 배지, 관리자 접근 보호를 검사합니다.
3. **실제 지도 확인:** 로컬 브라우저에서 마커, 노선 형상, A/B 코스, 스타일 전환, 모바일 바텀시트를 확인합니다. 자동 UI 테스트는 외부 지도 요청을 차단하므로 실제 지도 검증을 대신하지 않습니다.

`.github/workflows/ci.yml`은 같은 검사를 실행합니다. 로컬 통과와 원격 CI 통과는 구분해서 보고합니다.

### 노선 데이터 업데이트 후 체크리스트

`docs/data-update-guide.md`를 참고하세요. 핵심 항목:

- [ ] 해당 노선의 모든 마커가 실제 도로 위에 찍히는지
- [ ] 노선 폴리라인이 실제 운행 경로를 따르는지
- [ ] `stop_01`과 `stop_20`이 동일 위치(가고시마 중앙역)인지
- [ ] 시간표 첫/막차 시간이 공식 데이터와 일치하는지
- [ ] `coordinatesApproximate`와 `metadata.lastSourceCheckedAt`(실측 시 `lastFieldVerifiedAt`) 등 메타데이터가 갱신되었는지

## 배포 프로세스

`main`에 대한 푸시는 운영 배포를 유발합니다. 아래 절차 설명 자체는 커밋·푸시·배포 권한을 부여하지 않습니다. 각 단계는 현재 사용자 요청이나 해당 대상·범위에 대한 유효한 기존 승인에 포함된 경우에만 수행합니다. 같은 대상·범위의 승인을 반복해서 묻지 않되, 별도의 건별 승인 요구와 도구의 권한 제한은 그대로 따릅니다. 승인이 필요한 배포 단계가 남아 있어도 독립적으로 가능한 구현·검증은 진행하고, 배포 여부를 완료 보고에서 구분합니다.

1. Vercel에 연결된 Git 저장소의 `main` 브랜치에 푸시하면 자동 빌드/배포됩니다.
2. `vercel.json` 설정:
   - `buildCommand`: `npm run build`
   - `devCommand`: `npm run dev`
   - `framework`: `nextjs`
   - `regions`: `["hnd1"]` (도쿄 리전. 예전 ID `nrt1`은 현재 Vercel에서 "Invalid region selector"로 배포가 실패함)
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
   - `/admin/:path*`는 `src/proxy.ts`와 관리자 페이지의 서버 인증 검사에서 보호됩니다.
   - 관리자 페이지는 현재 데이터 편집 UI 없이 라우트 보호만 구현되어 있습니다.

3. **.env 파일:**
   - `.env*`는 Git에 커밋되지 않습니다.
   - `ADMIN_EMAILS`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`은 절대로 클라이언트 코드나 로그에 노출하지 마세요.

4. **외부 API:**
   - Mapbox Directions API를 클라이언트에서 직접 호출합니다(`MapCanvas.tsx`). 요청 URL에 토큰이 포함되므로 네트워크 탭에서 노출됩니다.
   - 도보 경로 요청은 선택 변경 시 취소하고 오류 종류만 기록합니다. 토큰이 포함된 요청 URL이나 응답 원문을 로그에 남기지 마세요.

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
- **ADR 006:** 쿼리·쿠키·요청 헤더 순으로 언어를 결정하고 요청별 i18n 인스턴스로 SSR/본문을 일치시킵니다. 노선 형상은 출처가 있는 JSON으로 관리합니다.
- **ADR 007:** 기본 서체 Zen Maru Gothic을 next/font로 자체 호스팅합니다. 일본어 조각 파일은 precache에서 빼고 런타임 캐시에만 쌓습니다(빌드 시 Google Fonts 접근 필요).
- **ADR 008:** 繁體中文(zh-Hant)을 빌드 타임 번역 파일로 추가합니다. 간체 요청도 당분간 繁體로 안내하고, 데브로그 MDX는 영어로 대체합니다.

## 개발 시 참고 문서

- `docs/project-overview.md` — 서비스 개요, 핵심 기능, 기술 스택
- `docs/data-sources.md` — 노선별 데이터 출처, 라이선스(공식 정류장 CC BY 4.0 · OSM 도로 ODbL), 현장 검증 기록
- `docs/data-update-guide.md` — 노선 데이터 정기 업데이트 절차
- `docs/ux-improvements.md` — UX 기능 우선순위 및 기획
- `docs/design/design-system.md` — 디자인 토큰·컴포넌트·지자체 사이트 요건 (UI 작업 전 필독)
- `docs/design/reference-analysis.md` — 레퍼런스 사이트 분석 (히라야스미 × 스기나미구, 사가시)
- `docs/issues.md` — 이슈 트래커 (ISS-001 등)
- `docs/adr/` — 아키텍처 결정 기록
- `global-log.md` — 개발 진행 로그 및 컨텍스트

## 개발 워크플로우 요약

1. 새 기능 추가 전 `docs/ux-improvements.md`의 우선순위와 `docs/adr/`의 결정을 확인하세요. UI 작업이면 `docs/design/design-system.md`의 토큰과 규칙을 따르세요.
2. 노선 데이터를 변경할 때는 위 **데이터 관리 규칙(ISS-001)**을 따르세요. 좌표 원본은 JSON에서 관리하고, 요청에 필요한 관련 코드도 함께 수정할 수 있습니다.
3. `npm run check`로 린트·단위 테스트·타입·빌드를 확인하세요.
4. 변경에 관련된 브라우저 회귀 및 실제 지도 검증을 위 **테스트** 절차에 따라 수행하세요.
5. 커밋·푸시·배포는 위 **배포 프로세스**의 승인 범위를 따르세요. 절차가 문서에 있다는 이유만으로 실행하지 않습니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
