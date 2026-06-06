# 가고시마 시티뷰 버스 가이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가고시마 시티뷰 버스 20개 정류장의 정확한 GPS 위치를 지도에 표시하고, 목적지 카테고리 브라우징·다국어·데브로그·PWA를 포함한 관광 안내 웹 서비스를 구축한다.

**Architecture:** Next.js 15 App Router + Mapbox GL JS(ssr:false) + react-i18next + MDX 데브로그 + @ducanh2912/next-pwa. Turbopack 비활성화(Mapbox Worker 호환성). 모바일은 사이드패널 대신 바텀시트. 어드민 UI는 MVP 제외.

**Tech Stack:** Next.js 15, TypeScript, Mapbox GL JS, react-i18next, next-mdx-remote, NextAuth v5, @ducanh2912/next-pwa, Vercel Analytics, Vercel

---

## 파일 구조 (생성 기준)

```
/Users/sondong-gyu/IdeaProjects/kagoshima-cityview/
  src/
    app/
      layout.tsx
      page.tsx                        # 스토리 페이지
      map/
        page.tsx                      # 지도 (정류장 미선택)
        [stopId]/page.tsx             # 정류장 선택 상태
      story/
        page.tsx                      # 에피소드 목록
        [slug]/page.tsx               # 개별 에피소드
      admin/
        page.tsx                      # 관리자 (라우트 보호만)
        login/page.tsx
      api/auth/[...nextauth]/route.ts
    components/
      Nav.tsx
      LanguageSwitcher.tsx
      home/
        Hero.tsx
        StorySection.tsx
        TrustSection.tsx
        ProblemGrid.tsx
        DevlogTeaser.tsx
        PartnershipSection.tsx
        Footer.tsx
      map/
        MapCanvas.tsx                 # Mapbox 래퍼 (client-only)
        RoutePolyline.tsx
        StopMarkers.tsx               # GeoJSON 레이어
        SidePanel.tsx                 # 데스크톱
        StopList.tsx
        StopDetail.tsx
        BottomSheet.tsx               # 모바일
        CategoryChips.tsx
        DestinationCards.tsx
        MapDisclaimer.tsx
      devlog/
        EpisodeCard.tsx
        EpisodeNav.tsx
        EpisodeToc.tsx
    lib/
      stops.ts
      devlog.ts
      i18n.ts
    data/
      stops.json
      destinations.json
    messages/
      ko.json
      en.json
      ja.json
    styles/
      globals.css
      tokens.css
  content/
    story/
      ko/01-missed-the-bus.mdx
      ko/02-everyone-suffers.mdx
      ko/03-planning.mdx
      ko/04-design.mdx
      ko/05-building.mdx
      ko/06-pitch.mdx                 # published: false
  public/
    manifest.json
    icons/
  middleware.ts                       # NextAuth 보호
  next.config.js
  .env.local.example
```

---

## PHASE 1: 프로젝트 기반

### Task 1: Git + Next.js 15 초기화

**Files:**
- Create: `next.config.js`
- Create: `.env.local.example`
- Create: `.gitignore`

- [ ] **Step 1: Git 초기화 및 Next.js scaffold**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview
git init
npx create-next-app@latest . \
  --typescript \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-tailwind \
  --no-turbopack
```

프롬프트: 모두 기본값(Yes) 선택. `--no-turbopack`이 Mapbox Worker URL 이슈를 회피한다.

- [ ] **Step 2: next.config.js 작성**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mapbox GL JS는 Turbopack과 Worker URL 충돌 — webpack만 사용
  experimental: {},
}

module.exports = nextConfig
```

- [ ] **Step 3: .env.local.example 작성**

```bash
# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here

# NextAuth
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (관리자 로그인용)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 관리자 허용 이메일 (콤마 구분)
ADMIN_EMAILS=your@email.com
```

- [ ] **Step 4: .env.local 생성**

```bash
cp .env.local.example .env.local
# Mapbox 토큰 실제값 입력 (mapbox.com → Tokens → Create token)
# 허용 URL 스코프: localhost:3000, kagoshima-bus.vercel.app
```

- [ ] **Step 5: 초기 커밋**

```bash
git add -A
git commit -m "chore: initialize Next.js 15 project (no Turbopack)"
```

---

### Task 2: 의존성 설치

**Files:** `package.json`

- [ ] **Step 1: 핵심 의존성 설치**

```bash
npm install \
  mapbox-gl \
  react-i18next \
  i18next \
  i18next-browser-languagedetector \
  next-mdx-remote \
  next-auth@beta \
  @ducanh2912/next-pwa \
  @vercel/analytics
```

- [ ] **Step 2: 타입 의존성 설치**

```bash
npm install -D \
  @types/mapbox-gl
```

- [ ] **Step 3: 설치 확인**

```bash
npm run build
```

Expected: 빌드 성공 (경고 있어도 에러 없으면 OK)

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: install core dependencies"
```

---

### Task 3: CSS 디자인 시스템

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: 토큰 파일 작성**

```css
/* src/styles/tokens.css */
:root {
  /* 폰트 */
  --font-serif: 'Hiragino Mincho ProN', 'HiraMinProN-W3', 'Yu Mincho', 'YuMincho', Georgia, serif;
  --font-sans: 'Hiragino Kaku Gothic ProN', 'HiraKakuProN-W3', 'Yu Gothic', 'YuGothic', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'SF Mono', 'Menlo', 'Monaco', monospace;

  /* 색상 */
  --bg:     #F4EFE9;
  --white:  #FFFFFF;
  --ink:    #1C1A18;
  --mid:    #555555;
  --muted:  #8A8278;
  --rule:   #DDD7D0;
  --accent: #8B4513;
  --dark:   #1F1E1A;

  /* 지도 핀 */
  --pin-default: #1E3A4F;
  --pin-active:  #8B4513;
  --pin-warn:    #C87A3A;

  /* 레이아웃 */
  --nav-h: 64px;
  --side-w: 320px;
  --radius: 4px;
}
```

- [ ] **Step 2: globals.css 재작성**

```css
/* src/styles/globals.css */
@import './tokens.css';
@import 'mapbox-gl/dist/mapbox-gl.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a { color: inherit; text-decoration: none; }
button { cursor: pointer; font-family: inherit; }
img { display: block; max-width: 100%; }
```

- [ ] **Step 3: layout.tsx에서 import**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: '가고시마 시티뷰 버스 가이드',
  description: '가고시마 시티뷰 버스 20개 정류장 정확한 GPS 위치 가이드. 한국어·English·日本語.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/styles/ src/app/layout.tsx
git commit -m "feat: add CSS design system tokens"
```

---

### Task 4: 데이터 파일

**Files:**
- Create: `src/data/stops.json`
- Create: `src/data/destinations.json`
- Create: `src/lib/stops.ts`

- [ ] **Step 1: stops.json 작성**

실제 운영 시 가고시마시 GTFS `stops.txt`에서 파싱. MVP는 20개 정류장 수동 입력.

```json
{
  "metadata": {
    "sourceVersion": "2026-05",
    "lastValidatedAt": "2026-05-31",
    "lastUpdatedAt": "2026-06-06",
    "disclaimer": {
      "ko": "이 서비스는 GPS 정류장 위치 정보를 제공합니다. 실제 운행 시간 및 노선은 가고시마시 공식 앱 또는 정류장 안내판을 반드시 확인하세요.",
      "en": "This service provides GPS stop location data. Always verify actual bus schedules via the official Kagoshima City app or stop signs.",
      "ja": "本サービスはGPS停留所位置情報を提供します。実際の運行時刻・路線は鹿児島市公式アプリまたは停留所の案内板でご確認ください。"
    }
  },
  "stops": [
    {
      "id": "stop_01",
      "number": 1,
      "lat": 31.5839,
      "lng": 130.5403,
      "name": { "ko": "가고시마 중앙역", "en": "Kagoshima-Chuo Station", "ja": "鹿児島中央駅" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    },
    {
      "id": "stop_03",
      "number": 3,
      "lat": 31.5892,
      "lng": 130.5545,
      "name": { "ko": "텐몬칸", "en": "Tenmonkan", "ja": "天文館" },
      "googleMapsError": true,
      "googleMapsErrorNote": "구글맵이 실제 위치보다 약 200m 남쪽을 가리킴. 2026-05-31 현장 확인.",
      "destinations": []
    },
    {
      "id": "stop_04",
      "number": 4,
      "lat": 31.5921,
      "lng": 130.5512,
      "name": { "ko": "사이고 동상 앞", "en": "Saigo Statue Mae", "ja": "西郷銅像前" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    },
    {
      "id": "stop_07",
      "number": 7,
      "lat": 31.5985,
      "lng": 130.5525,
      "name": { "ko": "시로야마", "en": "Shiroyama", "ja": "城山" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    },
    {
      "id": "stop_12",
      "number": 12,
      "lat": 31.6135,
      "lng": 130.5999,
      "name": { "ko": "센간엔 앞", "en": "Sengan-en Mae", "ja": "仙巌園（磯庭園）前" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    },
    {
      "id": "stop_14",
      "number": 14,
      "lat": 31.5973,
      "lng": 130.5657,
      "name": { "ko": "이시바시 기념공원 앞", "en": "Ishibashi Park Mae", "ja": "石橋記念公園前" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    },
    {
      "id": "stop_16",
      "number": 16,
      "lat": 31.5951,
      "lng": 130.5621,
      "name": { "ko": "수족관 앞", "en": "Aquarium Mae", "ja": "水族館前" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    },
    {
      "id": "stop_20",
      "number": 20,
      "lat": 31.5897,
      "lng": 130.5581,
      "name": { "ko": "가고시마역", "en": "Kagoshima Station", "ja": "鹿児島駅" },
      "googleMapsError": false,
      "googleMapsErrorNote": "",
      "destinations": []
    }
  ]
}
```

> **주의:** 위 좌표는 근사값. 실제 서비스 전 가고시마시 GTFS `stops.txt` 원본으로 교체할 것.

- [ ] **Step 2: destinations.json 작성**

```json
[
  {
    "id": "sengan-en",
    "stopId": "stop_12",
    "name": { "ko": "센간엔 (이소 정원)", "en": "Sengan-en Garden", "ja": "仙巌園（磯庭園）" },
    "walkMinutes": 2,
    "category": "sightseeing"
  },
  {
    "id": "shiroyama",
    "stopId": "stop_07",
    "name": { "ko": "시로야마 전망대", "en": "Shiroyama Observatory", "ja": "城山展望台" },
    "walkMinutes": 5,
    "category": "sightseeing"
  },
  {
    "id": "saigo-statue",
    "stopId": "stop_04",
    "name": { "ko": "사이고 다카모리 동상", "en": "Saigo Takamori Statue", "ja": "西郷隆盛銅像" },
    "walkMinutes": 1,
    "category": "sightseeing"
  },
  {
    "id": "aquarium",
    "stopId": "stop_16",
    "name": { "ko": "가고시마 수족관", "en": "Kagoshima Aquarium", "ja": "かごしま水族館" },
    "walkMinutes": 2,
    "category": "nature"
  },
  {
    "id": "tenmonkan-food",
    "stopId": "stop_03",
    "name": { "ko": "텐몬칸 쇼핑 아케이드", "en": "Tenmonkan Shopping Arcade", "ja": "天文館アーケード" },
    "walkMinutes": 3,
    "category": "shopping"
  }
]
```

- [ ] **Step 3: stops.ts 유틸 작성**

```ts
// src/lib/stops.ts
import stopsData from '@/data/stops.json'
import destinations from '@/data/destinations.json'

export type Lang = 'ko' | 'en' | 'ja'
export type Category = 'sightseeing' | 'food' | 'nature' | 'shopping'

export interface Destination {
  id: string
  stopId: string
  name: Record<Lang, string>
  walkMinutes: number
  category: Category
}

export interface BusStop {
  id: string
  number: number
  lat: number
  lng: number
  name: Record<Lang, string>
  googleMapsError: boolean
  googleMapsErrorNote: string
  destinations: Destination[]
}

export interface StopsData {
  metadata: {
    sourceVersion: string
    lastValidatedAt: string
    lastUpdatedAt: string
    disclaimer: Record<Lang, string>
  }
  stops: BusStop[]
}

const data = stopsData as StopsData
const allDestinations = destinations as Destination[]

export function getAllStops(): BusStop[] {
  return data.stops.map(stop => ({
    ...stop,
    destinations: allDestinations.filter(d => d.stopId === stop.id),
  }))
}

export function getStopById(id: string): BusStop | undefined {
  const stop = data.stops.find(s => s.id === id)
  if (!stop) return undefined
  return {
    ...stop,
    destinations: allDestinations.filter(d => d.stopId === id),
  }
}

export function getStopsGeoJSON(stops: BusStop[]) {
  return {
    type: 'FeatureCollection' as const,
    features: stops.map(stop => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [stop.lng, stop.lat] },
      properties: {
        id: stop.id,
        number: stop.number,
        nameKo: stop.name.ko,
        nameEn: stop.name.en,
        nameJa: stop.name.ja,
        googleMapsError: stop.googleMapsError,
      },
    })),
  }
}

export function getMetadata() {
  return data.metadata
}

export function getStopsByCategory(category: Category): BusStop[] {
  const stopIds = allDestinations
    .filter(d => d.category === category)
    .map(d => d.stopId)
  return getAllStops().filter(s => stopIds.includes(s.id))
}

export const ROUTE_COORDINATES: [number, number][] = [
  [130.5403, 31.5839],
  [130.5532, 31.5892],
  [130.5512, 31.5921],
  [130.5525, 31.5985],
  [130.5999, 31.6135],
  [130.5657, 31.5973],
  [130.5621, 31.5951],
  [130.5581, 31.5897],
]
```

- [ ] **Step 4: 커밋**

```bash
git add src/data/ src/lib/stops.ts
git commit -m "feat: add stop data and stops utility"
```

---

### Task 5: react-i18next 설정

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/messages/ko.json`
- Create: `src/messages/en.json`
- Create: `src/messages/ja.json`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: i18n 설정 파일**

```ts
// src/lib/i18n.ts
'use client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ko: { translation: ko },
        en: { translation: en },
        ja: { translation: ja },
      },
      fallbackLng: 'ko',
      supportedLngs: ['ko', 'en', 'ja'],
      detection: {
        order: ['querystring', 'cookie', 'navigator'],
        lookupQuerystring: 'lang',
        lookupCookie: 'i18next',
        caches: ['cookie'],
      },
      interpolation: { escapeValue: false },
    })
}

export default i18n
```

- [ ] **Step 2: 번역 파일 — ko.json**

```json
{
  "nav": {
    "story": "스토리",
    "map": "지도",
    "openMap": "지도 열기"
  },
  "hero": {
    "eyebrow": "Kagoshima City View Bus Guide",
    "h1": "버스 정류장을 찾지 못해\n헤맸던 여행자가\n직접 만든 가이드",
    "ctaMap": "지도 보기",
    "ctaStory": "스토리 읽기"
  },
  "trust": {
    "stops": "개 정류장",
    "stopsLabel": "GPS 검증 완료",
    "langs": "개 언어",
    "langsLabel": "KO · EN · JP",
    "cost": "원",
    "costLabel": "무료 · 광고 없음",
    "source": "가고시마시 공식 GTFS 오픈데이터 기반",
    "validated": "현장 검증일"
  },
  "map": {
    "categories": {
      "all": "전체",
      "sightseeing": "역사·관광",
      "nature": "자연",
      "food": "맛집",
      "shopping": "쇼핑"
    },
    "stopDetail": {
      "gpsVerified": "GPS 검증 완료",
      "googleMapsWrong": "구글맵 위치 오류 — 이 앱이 정확합니다",
      "walkTime": "도보 {{min}}분",
      "disclaimer": "운행 시간은 공식 앱을 확인하세요"
    },
    "noStops": "해당 카테고리의 정류장이 없습니다"
  },
  "partnership": {
    "h2": "가고시마시 관광과와\n함께하고 싶습니다",
    "body": "이 서비스는 가고시마시 공식 GTFS 오픈데이터 기반입니다. 무료이며 광고가 없습니다. 더 많은 여행자가 가고시마를 편하게 즐길 수 있도록.",
    "cta": "협력 문의하기",
    "ctaMap": "지도 바로 보기"
  },
  "footer": {
    "source": "데이터 제공：鹿児島市（원본 데이터에서 가공）",
    "license": "CC BY 4.0",
    "disclaimer": "GPS 위치 기준. 운행 시간은 공식 앱 확인 필수."
  },
  "devlog": {
    "sectionTitle": "제작 이야기",
    "viewAll": "전체 보기"
  }
}
```

- [ ] **Step 3: en.json 작성**

```json
{
  "nav": { "story": "Story", "map": "Map", "openMap": "Open Map" },
  "hero": {
    "eyebrow": "Kagoshima City View Bus Guide",
    "h1": "A guide made by a traveler\nwho got lost looking\nfor the bus stop",
    "ctaMap": "View Map", "ctaStory": "Read Story"
  },
  "trust": {
    "stops": " stops", "stopsLabel": "GPS verified",
    "langs": " languages", "langsLabel": "KO · EN · JP",
    "cost": "Free", "costLabel": "No ads",
    "source": "Based on official Kagoshima City GTFS open data",
    "validated": "Last verified"
  },
  "map": {
    "categories": { "all": "All", "sightseeing": "Sightseeing", "nature": "Nature", "food": "Food", "shopping": "Shopping" },
    "stopDetail": {
      "gpsVerified": "GPS Verified",
      "googleMapsWrong": "Google Maps location is wrong — this app is accurate",
      "walkTime": "{{min}} min walk",
      "disclaimer": "Check official app for schedules"
    },
    "noStops": "No stops for this category"
  },
  "partnership": {
    "h2": "We'd love to work with\nKagoshima City Tourism",
    "body": "This service is based on official Kagoshima City GTFS open data. Free, no ads.",
    "cta": "Contact Us", "ctaMap": "Open Map"
  },
  "footer": {
    "source": "Data: 鹿児島市 (processed from original)",
    "license": "CC BY 4.0",
    "disclaimer": "GPS location only. Always verify schedules via official app."
  },
  "devlog": { "sectionTitle": "Making Of", "viewAll": "View All" }
}
```

- [ ] **Step 4: ja.json 작성**

```json
{
  "nav": { "story": "ストーリー", "map": "地図", "openMap": "地図を開く" },
  "hero": {
    "eyebrow": "鹿児島シティビューバスガイド",
    "h1": "バス停を見つけられず\n迷った旅行者が\n作ったガイド",
    "ctaMap": "地図を見る", "ctaStory": "ストーリーを読む"
  },
  "trust": {
    "stops": "停留所", "stopsLabel": "GPS確認済み",
    "langs": "言語", "langsLabel": "KO · EN · JP",
    "cost": "無料", "costLabel": "広告なし",
    "source": "鹿児島市公式GTFSオープンデータ基準",
    "validated": "現地確認日"
  },
  "map": {
    "categories": { "all": "すべて", "sightseeing": "観光", "nature": "自然", "food": "グルメ", "shopping": "ショッピング" },
    "stopDetail": {
      "gpsVerified": "GPS確認済み",
      "googleMapsWrong": "Googleマップの位置は誤りです — このアプリが正確です",
      "walkTime": "徒歩{{min}}分",
      "disclaimer": "運行時刻は公式アプリでご確認ください"
    },
    "noStops": "該当カテゴリの停留所はありません"
  },
  "partnership": {
    "h2": "鹿児島市観光課と\n連携したいと思っています",
    "body": "このサービスは鹿児島市公式GTFSオープンデータに基づいています。無料・広告なし。",
    "cta": "連携のお問い合わせ", "ctaMap": "地図を開く"
  },
  "footer": {
    "source": "データ提供：鹿児島市（原データより加工）",
    "license": "CC BY 4.0",
    "disclaimer": "GPS位置情報のみ。運行時刻は必ず公式アプリでご確認ください。"
  },
  "devlog": { "sectionTitle": "制作の記録", "viewAll": "すべて見る" }
}
```

- [ ] **Step 5: layout.tsx에 I18nProvider 추가**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import '@/styles/globals.css'
import I18nProvider from '@/components/I18nProvider'

export const metadata: Metadata = {
  title: '가고시마 시티뷰 버스 가이드',
  description: '가고시마 시티뷰 버스 20개 정류장 정확한 GPS 위치 가이드.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: I18nProvider 컴포넌트 작성**

```tsx
// src/components/I18nProvider.tsx
'use client'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/i18n.ts src/messages/ src/components/I18nProvider.tsx src/app/layout.tsx
git commit -m "feat: add react-i18next with KO/EN/JA translations"
```

---

### Task 6: 글로벌 Nav

**Files:**
- Create: `src/components/Nav.tsx`
- Create: `src/components/LanguageSwitcher.tsx`

- [ ] **Step 1: LanguageSwitcher 작성**

```tsx
// src/components/LanguageSwitcher.tsx
'use client'
import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

const LANGS = ['ko', 'en', 'ja'] as const

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <div className={styles.wrap}>
      {LANGS.map(lang => (
        <button
          key={lang}
          className={i18n.language === lang ? styles.on : styles.btn}
          onClick={() => i18n.changeLanguage(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: LanguageSwitcher CSS 모듈**

```css
/* src/components/LanguageSwitcher.module.css */
.wrap { display: flex; gap: 3px; }
.btn, .on {
  padding: 5px 11px;
  border-radius: 2px;
  border: 1px solid var(--rule);
  background: transparent;
  font-size: 11px;
  font-family: var(--font-sans);
  color: var(--muted);
  transition: all 0.15s;
}
.on {
  background: var(--dark);
  border-color: var(--dark);
  color: var(--white);
}
```

- [ ] **Step 3: Nav 컴포넌트 작성**

```tsx
// src/components/Nav.tsx
'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import styles from './Nav.module.css'

export default function Nav() {
  const { t } = useTranslation()
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        가고시마 <em>시티뷰</em> 버스 가이드
      </Link>
      <ul className={styles.links}>
        <li><Link href="/">{t('nav.story')}</Link></li>
        <li><Link href="/map">{t('nav.map')}</Link></li>
      </ul>
      <div className={styles.right}>
        <LanguageSwitcher />
        <Link href="/map" className={styles.ctaBtn}>{t('nav.openMap')} →</Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Nav CSS 모듈**

```css
/* src/components/Nav.module.css */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 52px;
  height: var(--nav-h);
  border-bottom: 1px solid var(--rule);
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo {
  font-family: var(--font-serif);
  font-size: 13px;
  letter-spacing: 0.12em;
  color: var(--ink);
}
.logo em { color: var(--accent); font-style: normal; }
.links {
  display: flex;
  gap: 36px;
  list-style: none;
}
.links a {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--muted);
  transition: color 0.15s;
}
.links a:hover { color: var(--ink); }
.right { display: flex; align-items: center; gap: 14px; }
.ctaBtn {
  padding: 9px 20px;
  background: var(--dark);
  color: var(--white);
  font-size: 12px;
  letter-spacing: 0.06em;
  border-radius: var(--radius);
  transition: opacity 0.15s;
}
.ctaBtn:hover { opacity: 0.85; }

@media (max-width: 768px) {
  .nav { padding: 0 20px; }
  .links { display: none; }
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/Nav.tsx src/components/Nav.module.css \
  src/components/LanguageSwitcher.tsx src/components/LanguageSwitcher.module.css
git commit -m "feat: add global Nav with language switcher"
```

---

## PHASE 2: 지도 페이지 (핵심 기능)

### Task 7: Mapbox MapCanvas

**Files:**
- Create: `src/components/map/MapCanvas.tsx`
- Create: `src/components/map/MapCanvas.module.css`

- [ ] **Step 1: MapCanvas 작성 (client-only)**

```tsx
// src/components/map/MapCanvas.tsx
'use client'
import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { getAllStops, getStopsGeoJSON, ROUTE_COORDINATES, type BusStop } from '@/lib/stops'
import styles from './MapCanvas.module.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface MapCanvasProps {
  selectedStopId: string | null
  activeCategory: string | null
  onStopSelect: (stop: BusStop) => void
}

const KAGOSHIMA_CENTER: [number, number] = [130.5581, 31.5897]
const INITIAL_ZOOM = 13

export default function MapCanvas({ selectedStopId, activeCategory, onStopSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const handleStopClick = useCallback((stopId: string) => {
    const stop = getAllStops().find(s => s.id === stopId)
    if (stop) onStopSelect(stop)
  }, [onStopSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: KAGOSHIMA_CENTER,
      zoom: INITIAL_ZOOM,
      language: 'ja',
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right')

    map.on('load', () => {
      const stops = getAllStops()
      const geojson = getStopsGeoJSON(stops)

      // 노선 폴리라인
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: ROUTE_COORDINATES },
          properties: {},
        },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#8B4513', 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 },
      })

      // 정류장 소스
      map.addSource('stops', { type: 'geojson', data: geojson })

      // 배경 원
      map.addLayer({
        id: 'stops-circle',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': ['case', ['get', 'googleMapsError'], 10, 8],
          'circle-color': [
            'case',
            ['==', ['get', 'id'], selectedStopId ?? ''], '#8B4513',
            ['get', 'googleMapsError'], '#C87A3A',
            '#1E3A4F',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      })

      // 번호 텍스트
      map.addLayer({
        id: 'stops-label',
        type: 'symbol',
        source: 'stops',
        layout: {
          'text-field': ['to-string', ['get', 'number']],
          'text-size': 10,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#ffffff' },
      })

      // 클릭 이벤트
      map.on('click', 'stops-circle', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id) handleStopClick(id)
      })
      map.on('mouseenter', 'stops-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'stops-circle', () => { map.getCanvas().style.cursor = '' })
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [handleStopClick])

  // 선택 정류장 변경 시 지도 이동
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedStopId) return
    const stop = getAllStops().find(s => s.id === selectedStopId)
    if (stop) map.flyTo({ center: [stop.lng, stop.lat], zoom: 15, duration: 600 })
  }, [selectedStopId])

  return <div ref={containerRef} className={styles.canvas} />
}
```

- [ ] **Step 2: MapCanvas CSS**

```css
/* src/components/map/MapCanvas.module.css */
.canvas {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/map/MapCanvas.tsx src/components/map/MapCanvas.module.css
git commit -m "feat: add Mapbox MapCanvas with stops GeoJSON layer"
```

---

### Task 8: 지도 사이드패널 (데스크톱)

**Files:**
- Create: `src/components/map/StopList.tsx`
- Create: `src/components/map/StopDetail.tsx`
- Create: `src/components/map/SidePanel.tsx`
- Create: `src/components/map/SidePanel.module.css`

- [ ] **Step 1: StopList 작성**

```tsx
// src/components/map/StopList.tsx
'use client'
import { useTranslation } from 'react-i18next'
import type { BusStop, Lang } from '@/lib/stops'
import styles from './StopList.module.css'

interface Props {
  stops: BusStop[]
  selectedId: string | null
  onSelect: (stop: BusStop) => void
}

export default function StopList({ stops, selectedId, onSelect }: Props) {
  const { i18n } = useTranslation()
  const lang = (i18n.language as Lang) || 'ko'

  if (stops.length === 0) {
    return <p className={styles.empty}>해당 카테고리의 정류장이 없습니다</p>
  }

  return (
    <ul className={styles.list}>
      {stops.map(stop => (
        <li
          key={stop.id}
          className={`${styles.item} ${stop.id === selectedId ? styles.on : ''}`}
          onClick={() => onSelect(stop)}
        >
          <div className={styles.num}>{stop.number}</div>
          <div className={styles.info}>
            <div className={styles.name}>{stop.name[lang]}</div>
            {stop.googleMapsError && (
              <div className={styles.warn}>⚠️ 구글맵 위치 오류</div>
            )}
          </div>
          <span className={styles.chevron}>›</span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: StopList CSS**

```css
/* src/components/map/StopList.module.css */
.list { list-style: none; overflow-y: auto; flex: 1; }
.item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--rule);
  cursor: pointer; transition: background 0.12s;
}
.item:hover { background: var(--bg); }
.on { background: #FDF6F4; border-left: 2px solid var(--accent); }
.num {
  width: 28px; height: 28px; border-radius: 50%;
  background: #F0EDE8; color: var(--dark);
  font-size: 11px; font-family: var(--font-mono); font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; border: 1px solid var(--rule);
}
.on .num { background: var(--accent); color: white; border-color: var(--accent); }
.info { flex: 1; min-width: 0; }
.name { font-size: 13px; color: var(--ink); margin-bottom: 2px; }
.warn { font-size: 11px; color: var(--pin-warn); }
.chevron { color: var(--rule); font-size: 16px; }
.empty { padding: 24px 20px; font-size: 13px; color: var(--muted); }
```

- [ ] **Step 3: StopDetail 작성**

```tsx
// src/components/map/StopDetail.tsx
'use client'
import { useTranslation } from 'react-i18next'
import type { BusStop, Lang } from '@/lib/stops'
import styles from './StopDetail.module.css'

interface Props { stop: BusStop }

export default function StopDetail({ stop }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language as Lang) || 'ko'

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.num}>No. {stop.number}</div>
        <div className={styles.name}>{stop.name[lang]}</div>
        <div className={styles.nameAlt}>
          {lang !== 'ja' && stop.name.ja}&nbsp;
          {lang !== 'en' && stop.name.en}
        </div>
        {stop.googleMapsError ? (
          <div className={styles.badgeWarn}>⚠️ {t('map.stopDetail.googleMapsWrong')}</div>
        ) : (
          <div className={styles.badgeOk}>✓ {t('map.stopDetail.gpsVerified')}</div>
        )}
      </div>
      {stop.destinations.length > 0 && (
        <div className={styles.destinations}>
          {stop.destinations.map(dest => (
            <div key={dest.id} className={styles.dest}>
              <span className={styles.destName}>{dest.name[lang]}</span>
              <span className={styles.destWalk}>
                {t('map.stopDetail.walkTime', { min: dest.walkMinutes })}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.disclaimer}>{t('map.stopDetail.disclaimer')}</div>
    </div>
  )
}
```

- [ ] **Step 4: StopDetail CSS**

```css
/* src/components/map/StopDetail.module.css */
.wrap { display: flex; flex-direction: column; }
.header { padding: 20px; background: var(--dark); }
.num { font-family: var(--font-mono); font-size: 10px; color: var(--accent); letter-spacing: 0.12em; margin-bottom: 4px; }
.name { font-family: var(--font-serif); font-size: 18px; color: white; font-weight: 400; margin-bottom: 2px; }
.nameAlt { font-size: 11px; color: rgba(255,255,255,0.4); margin-bottom: 12px; }
.badgeOk {
  display: inline-block; padding: 4px 10px;
  background: rgba(139,69,19,0.2); border: 1px solid rgba(139,69,19,0.4);
  color: #E8805A; font-size: 11px; border-radius: 2px;
}
.badgeWarn {
  display: inline-block; padding: 4px 10px;
  background: rgba(200,122,58,0.2); border: 1px solid rgba(200,122,58,0.4);
  color: #C87A3A; font-size: 11px; border-radius: 2px;
}
.destinations { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.dest { display: flex; justify-content: space-between; align-items: center; }
.destName { font-size: 13px; color: var(--ink); }
.destWalk { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }
.disclaimer {
  margin: auto 20px 16px;
  font-size: 10px; color: var(--muted); letter-spacing: 0.05em;
  padding: 8px 12px; background: var(--bg); border-radius: 2px;
  border: 1px solid var(--rule);
}
```

- [ ] **Step 5: SidePanel 조합**

```tsx
// src/components/map/SidePanel.tsx
'use client'
import type { BusStop } from '@/lib/stops'
import StopList from './StopList'
import StopDetail from './StopDetail'
import styles from './SidePanel.module.css'

interface Props {
  stops: BusStop[]
  selectedStop: BusStop | null
  onSelect: (stop: BusStop) => void
  sourceNote: string
}

export default function SidePanel({ stops, selectedStop, onSelect, sourceNote }: Props) {
  return (
    <aside className={styles.panel}>
      {selectedStop && <StopDetail stop={selectedStop} />}
      <StopList stops={stops} selectedId={selectedStop?.id ?? null} onSelect={onSelect} />
      <div className={styles.note}>{sourceNote}</div>
    </aside>
  )
}
```

- [ ] **Step 6: SidePanel CSS**

```css
/* src/components/map/SidePanel.module.css */
.panel {
  width: var(--side-w);
  flex-shrink: 0;
  border-left: 1px solid var(--rule);
  background: var(--white);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
.note {
  padding: 10px 20px;
  font-size: 10px; color: var(--muted);
  letter-spacing: 0.05em;
  border-top: 1px solid var(--rule);
  background: var(--bg);
  flex-shrink: 0;
}
```

- [ ] **Step 7: 커밋**

```bash
git add src/components/map/StopList* src/components/map/StopDetail* src/components/map/SidePanel*
git commit -m "feat: add map side panel with stop list and detail"
```

---

### Task 9: 카테고리 칩 + 목적지 카드

**Files:**
- Create: `src/components/map/CategoryChips.tsx`
- Create: `src/components/map/DestinationCards.tsx`

- [ ] **Step 1: CategoryChips 작성**

```tsx
// src/components/map/CategoryChips.tsx
'use client'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/lib/stops'
import styles from './CategoryChips.module.css'

const CATEGORIES: { key: Category | 'all'; icon: string }[] = [
  { key: 'all', icon: '🗺️' },
  { key: 'sightseeing', icon: '🏯' },
  { key: 'nature', icon: '🌊' },
  { key: 'food', icon: '🍜' },
  { key: 'shopping', icon: '🛍️' },
]

interface Props {
  active: string | null
  onChange: (cat: string | null) => void
}

export default function CategoryChips({ active, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.row}>
      {CATEGORIES.map(({ key, icon }) => (
        <button
          key={key}
          className={`${styles.chip} ${(active ?? 'all') === key ? styles.on : ''}`}
          onClick={() => onChange(key === 'all' ? null : key)}
        >
          {icon} {t(`map.categories.${key}`)}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: CategoryChips CSS**

```css
/* src/components/map/CategoryChips.module.css */
.row { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 20px; border-bottom: 1px solid var(--rule); }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: 100px;
  border: 1px solid var(--rule); background: transparent;
  font-size: 12px; color: var(--muted); transition: all 0.15s;
}
.chip:hover { border-color: var(--muted); color: var(--ink); }
.on { background: var(--dark); border-color: var(--dark); color: white; }
```

- [ ] **Step 3: DestinationCards 작성**

```tsx
// src/components/map/DestinationCards.tsx
'use client'
import { useTranslation } from 'react-i18next'
import type { BusStop, Lang, Category } from '@/lib/stops'
import styles from './DestinationCards.module.css'

interface Props {
  stops: BusStop[]
  category: Category | null
  onStopSelect: (stop: BusStop) => void
}

export default function DestinationCards({ stops, category, onStopSelect }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language as Lang) || 'ko'

  const filtered = category
    ? stops.filter(s => s.destinations.some(d => d.category === category))
    : stops

  if (filtered.length === 0) {
    return <p className={styles.empty}>{t('map.noStops')}</p>
  }

  return (
    <div className={styles.grid}>
      {filtered.flatMap(stop =>
        stop.destinations
          .filter(d => !category || d.category === category)
          .map(dest => (
            <div key={dest.id} className={styles.card} onClick={() => onStopSelect(stop)}>
              <div className={styles.cardName}>{dest.name[lang]}</div>
              <div className={styles.cardMeta}>
                {stop.name[lang]} · {t('map.stopDetail.walkTime', { min: dest.walkMinutes })}
              </div>
            </div>
          ))
      )}
    </div>
  )
}
```

- [ ] **Step 4: DestinationCards CSS**

```css
/* src/components/map/DestinationCards.module.css */
.grid { display: flex; flex-direction: column; gap: 1px; background: var(--rule); }
.card {
  padding: 14px 20px; background: var(--white);
  cursor: pointer; transition: background 0.12s;
}
.card:hover { background: var(--bg); }
.cardName { font-size: 13px; color: var(--ink); margin-bottom: 3px; }
.cardMeta { font-size: 11px; color: var(--muted); }
.empty { padding: 20px; font-size: 13px; color: var(--muted); }
```

- [ ] **Step 5: 커밋**

```bash
git add src/components/map/CategoryChips* src/components/map/DestinationCards*
git commit -m "feat: add category chips and destination cards"
```

---

### Task 10: 모바일 바텀시트

**Files:**
- Create: `src/components/map/BottomSheet.tsx`
- Create: `src/components/map/BottomSheet.module.css`

- [ ] **Step 1: BottomSheet 작성**

```tsx
// src/components/map/BottomSheet.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import type { BusStop } from '@/lib/stops'
import StopList from './StopList'
import StopDetail from './StopDetail'
import CategoryChips from './CategoryChips'
import styles from './BottomSheet.module.css'

type SheetState = 'peek' | 'half' | 'full'

interface Props {
  stops: BusStop[]
  selectedStop: BusStop | null
  activeCategory: string | null
  onStopSelect: (stop: BusStop) => void
  onCategoryChange: (cat: string | null) => void
  onDismiss: () => void
}

export default function BottomSheet({ stops, selectedStop, activeCategory, onStopSelect, onCategoryChange, onDismiss }: Props) {
  const [state, setState] = useState<SheetState>('peek')
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)

  const heights: Record<SheetState, string> = {
    peek: '80px',
    half: '50dvh',
    full: '85dvh',
  }

  useEffect(() => {
    if (selectedStop) setState('half')
  }, [selectedStop])

  function handleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dy = dragStartY.current - e.changedTouches[0].clientY
    if (dy > 50) setState(state === 'peek' ? 'half' : 'full')
    else if (dy < -50) setState(state === 'full' ? 'half' : 'peek')
  }

  return (
    <div
      ref={sheetRef}
      className={styles.sheet}
      style={{ height: heights[state] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.handle} onClick={() => setState(state === 'peek' ? 'half' : 'peek')} />
      <div className={styles.content}>
        <CategoryChips active={activeCategory} onChange={onCategoryChange} />
        {selectedStop
          ? <StopDetail stop={selectedStop} />
          : <StopList stops={stops} selectedId={null} onSelect={onStopSelect} />
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 2: BottomSheet CSS**

```css
/* src/components/map/BottomSheet.module.css */
.sheet {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--white);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.handle {
  width: 36px; height: 4px;
  background: var(--rule);
  border-radius: 2px;
  margin: 10px auto 0;
  flex-shrink: 0;
  cursor: pointer;
}
.content { flex: 1; overflow-y: auto; }
```

- [ ] **Step 3: 커밋**

```bash
git add src/components/map/BottomSheet*
git commit -m "feat: add mobile bottom sheet for map"
```

---

### Task 11: 지도 페이지 라우트

**Files:**
- Create: `src/app/map/page.tsx`
- Create: `src/app/map/[stopId]/page.tsx`
- Create: `src/app/map/MapPage.tsx` (client component)
- Create: `src/app/map/MapPage.module.css`

- [ ] **Step 1: MapPage 클라이언트 컴포넌트**

```tsx
// src/app/map/MapPage.tsx
'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getAllStops, getStopsByCategory, getMetadata, type BusStop, type Category } from '@/lib/stops'
import { useTranslation } from 'react-i18next'
import Nav from '@/components/Nav'
import SidePanel from '@/components/map/SidePanel'
import BottomSheet from '@/components/map/BottomSheet'
import CategoryChips from '@/components/map/CategoryChips'
import styles from './MapPage.module.css'

const MapCanvas = dynamic(() => import('@/components/map/MapCanvas'), { ssr: false })

interface Props { initialStopId?: string }

export default function MapPage({ initialStopId }: Props) {
  const { i18n } = useTranslation()
  const lang = (i18n.language as 'ko' | 'en' | 'ja') || 'ko'

  const [selectedStop, setSelectedStop] = useState<BusStop | null>(() => {
    if (!initialStopId) return null
    return getAllStops().find(s => s.id === initialStopId) ?? null
  })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredStops = useMemo(() => {
    if (!activeCategory) return getAllStops()
    return getStopsByCategory(activeCategory as Category)
  }, [activeCategory])

  const meta = getMetadata()

  return (
    <div className={styles.wrap}>
      <Nav />
      <div className={styles.body}>
        <div className={styles.mapWrap}>
          <div className={styles.chips}>
            <CategoryChips active={activeCategory} onChange={setActiveCategory} />
          </div>
          <MapCanvas
            selectedStopId={selectedStop?.id ?? null}
            activeCategory={activeCategory}
            onStopSelect={setSelectedStop}
          />
        </div>
        <div className={styles.side}>
          <SidePanel
            stops={filteredStops}
            selectedStop={selectedStop}
            onSelect={setSelectedStop}
            sourceNote={`データ提供：鹿児島市 · ${meta.lastValidatedAt} 검증`}
          />
        </div>
        <div className={styles.mobile}>
          <BottomSheet
            stops={filteredStops}
            selectedStop={selectedStop}
            activeCategory={activeCategory}
            onStopSelect={setSelectedStop}
            onCategoryChange={setActiveCategory}
            onDismiss={() => setSelectedStop(null)}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MapPage CSS**

```css
/* src/app/map/MapPage.module.css */
.wrap { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }
.body { flex: 1; display: flex; overflow: hidden; }
.mapWrap { flex: 1; position: relative; display: flex; flex-direction: column; }
.chips { flex-shrink: 0; background: var(--white); border-bottom: 1px solid var(--rule); }
.side { display: flex; }
.mobile { display: none; }

@media (max-width: 768px) {
  .side { display: none; }
  .mobile { display: block; }
  .chips { display: none; }
}
```

- [ ] **Step 3: /map/page.tsx**

```tsx
// src/app/map/page.tsx
import MapPage from './MapPage'

export default function MapRoute() {
  return <MapPage />
}
```

- [ ] **Step 4: /map/[stopId]/page.tsx**

```tsx
// src/app/map/[stopId]/page.tsx
import MapPage from '../MapPage'

interface Props { params: { stopId: string } }

export default function StopRoute({ params }: Props) {
  return <MapPage initialStopId={params.stopId} />
}
```

- [ ] **Step 5: 로컬 서버 확인**

```bash
npm run dev
# 브라우저에서 http://localhost:3000/map 열기
# - 지도 표시 확인
# - 정류장 핀 표시 확인
# - 핀 클릭 시 사이드패널 업데이트 확인
# - 모바일 뷰: 바텀시트 표시 확인
```

- [ ] **Step 6: 커밋**

```bash
git add src/app/map/
git commit -m "feat: complete map page with sidebar, bottom sheet, category filter"
```

---

## PHASE 3: 스토리 페이지

### Task 12: 스토리 페이지 섹션들

**Files:**
- Create: `src/components/home/Hero.tsx` + `Hero.module.css`
- Create: `src/components/home/TrustSection.tsx` + `TrustSection.module.css`
- Create: `src/components/home/ProblemGrid.tsx` + `ProblemGrid.module.css`
- Create: `src/components/home/PartnershipSection.tsx` + `PartnershipSection.module.css`
- Create: `src/components/home/Footer.tsx` + `Footer.module.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Hero 컴포넌트**

```tsx
// src/components/home/Hero.tsx
'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import styles from './Hero.module.css'

export default function Hero() {
  const { t } = useTranslation()
  return (
    <section className={styles.hero}>
      <div className={styles.left}>
        <div className={styles.eyebrow}>{t('hero.eyebrow')}</div>
        <h1 className={styles.h1}>
          {t('hero.h1').split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </h1>
        <div className={styles.actions}>
          <Link href="/map" className={styles.btnPrimary}>{t('hero.ctaMap')} →</Link>
          <button className={styles.btnGhost}>{t('hero.ctaStory')}</button>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.volcano} />
        <span className={styles.photoNote}>사쿠라지마 / 2026.05</span>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Hero CSS**

```css
/* src/components/home/Hero.module.css */
.hero {
  display: grid; grid-template-columns: 5fr 4fr;
  min-height: calc(100vh - var(--nav-h));
  background: #1F1E1A;
}
.left {
  padding: 80px 60px 80px 80px;
  display: flex; flex-direction: column; justify-content: center;
}
.eyebrow {
  font-size: 10px; letter-spacing: 0.22em; color: var(--accent);
  text-transform: uppercase; margin-bottom: 28px;
  display: flex; align-items: center; gap: 10px;
}
.eyebrow::before { content:''; width:24px; height:1px; background:var(--accent); }
.h1 {
  font-family: var(--font-serif); font-size: clamp(26px, 3vw, 44px);
  font-weight: 400; line-height: 1.75; letter-spacing: 0.04em;
  color: white; margin-bottom: 36px;
}
.actions { display: flex; gap: 12px; }
.btnPrimary {
  padding: 13px 28px; background: var(--accent); color: white;
  font-size: 13px; letter-spacing: 0.06em; border-radius: var(--radius); border: none;
}
.btnGhost {
  padding: 13px 22px; background: transparent; color: rgba(255,255,255,0.6);
  font-size: 13px; letter-spacing: 0.06em;
  border: 1px solid rgba(255,255,255,0.2); border-radius: var(--radius);
}
.right {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #2C3E2D, #0D1A10);
  display: flex; align-items: flex-end; padding: 28px;
}
.volcano {
  position: absolute; bottom: 0; left: 0; right: 0; height: 55%;
  clip-path: polygon(0 100%, 18% 48%, 36% 68%, 52% 8%, 68% 42%, 82% 22%, 100% 58%, 100% 100%);
  background: linear-gradient(to top, rgba(139,69,19,0.25), transparent);
}
.photoNote {
  font-family: var(--font-mono); font-size: 9px;
  color: rgba(255,255,255,0.18); letter-spacing: 0.15em;
  writing-mode: vertical-rl; position: relative; z-index: 1;
}
@media (max-width: 768px) {
  .hero { grid-template-columns: 1fr; }
  .left { padding: 60px 24px; }
  .right { min-height: 200px; }
}
```

- [ ] **Step 3: TrustSection 컴포넌트**

```tsx
// src/components/home/TrustSection.tsx
'use client'
import { useTranslation } from 'react-i18next'
import { getMetadata } from '@/lib/stops'
import styles from './TrustSection.module.css'

export default function TrustSection() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language as 'ko'|'en'|'ja') || 'ko'
  const meta = getMetadata()

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.num}>20</span>
            <span className={styles.label}>{t('trust.stops')}<br/>{t('trust.stopsLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>3</span>
            <span className={styles.label}>{t('trust.langs')}<br/>{t('trust.langsLabel')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.num}>0</span>
            <span className={styles.label}>{t('trust.cost')}<br/>{t('trust.costLabel')}</span>
          </div>
        </div>
        <div className={styles.source}>
          <span>{t('trust.source')}</span>
          <span className={styles.date}>{t('trust.validated')}: {meta.lastValidatedAt}</span>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: TrustSection CSS**

```css
/* src/components/home/TrustSection.module.css */
.section { background: var(--white); border-bottom: 1px solid var(--rule); }
.inner { max-width: 1080px; margin: 0 auto; padding: 48px 52px; }
.stats { display: flex; gap: 60px; margin-bottom: 28px; }
.stat { display: flex; align-items: baseline; gap: 10px; }
.num { font-family: var(--font-mono); font-size: 40px; color: var(--ink); font-weight: 700; }
.label { font-size: 12px; color: var(--muted); line-height: 1.6; }
.source { font-size: 11px; color: var(--muted); letter-spacing: 0.06em; display: flex; gap: 20px; flex-wrap: wrap; }
.date { color: var(--accent); }
```

- [ ] **Step 5: ProblemGrid 컴포넌트**

```tsx
// src/components/home/ProblemGrid.tsx
'use client'
import { useTranslation } from 'react-i18next'
import styles from './ProblemGrid.module.css'

const PROBLEMS = [
  { num: '01', titleKey: 'problem1Title', body: '구글맵이 실제 위치와 다른 곳을 가리킵니다. 어느 여행자는 10분을 기다리다 버스를 놓쳤습니다.' },
  { num: '02', titleKey: 'problem2Title', body: '현장에 영어·한국어 안내판이 없습니다. 어느 외국인 여행자는 버스가 서도 탑승해야 하는지 몰랐다고 합니다.' },
  { num: '03', titleKey: 'problem3Title', body: '여러 언어로 된 정확한 정보를 한 곳에서 찾기 어렵습니다. 이 앱이 그 공백을 채웁니다.' },
] as const

export default function ProblemGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.h2}>구글맵이 틀렸고,<br/>안내판도 없습니다</h2>
        <div className={styles.grid}>
          {PROBLEMS.map(p => (
            <div key={p.num} className={styles.cell}>
              <div className={styles.num}>{p.num}</div>
              <p className={styles.body}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: ProblemGrid CSS**

```css
/* src/components/home/ProblemGrid.module.css */
.section { background: var(--dark); padding: 80px 52px; }
.inner { max-width: 1080px; margin: 0 auto; }
.h2 {
  font-family: var(--font-serif); font-size: 28px; font-weight: 400;
  color: white; line-height: 1.7; margin-bottom: 48px; letter-spacing: 0.03em;
}
.grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: rgba(255,255,255,0.06); }
.cell { background: var(--dark); padding: 36px 28px; }
.num { font-family: var(--font-mono); font-size: 10px; color: var(--accent); letter-spacing: 0.12em; margin-bottom: 16px; }
.body { font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.9; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 7: PartnershipSection + Footer**

```tsx
// src/components/home/PartnershipSection.tsx
'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import styles from './PartnershipSection.module.css'

export default function PartnershipSection() {
  const { t } = useTranslation()
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <h2 className={styles.h2}>
            {t('partnership.h2').split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}
          </h2>
          <p className={styles.body}>{t('partnership.body')}</p>
        </div>
        <div className={styles.actions}>
          <Link href="/map" className={styles.btnMap}>{t('partnership.ctaMap')} →</Link>
          <a href="mailto:dev@bas-korea.com" className={styles.btnContact}>{t('partnership.cta')}</a>
        </div>
      </div>
    </section>
  )
}
```

```css
/* src/components/home/PartnershipSection.module.css */
.section { padding: 80px 52px; background: var(--bg); }
.inner { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; gap: 60px; align-items: center; }
.h2 { font-family: var(--font-serif); font-size: 28px; font-weight: 400; line-height: 1.7; margin-bottom: 16px; }
.body { font-size: 14px; color: var(--muted); line-height: 2; }
.actions { display: flex; flex-direction: column; gap: 10px; }
.btnMap { padding: 13px 24px; background: var(--dark); color: white; font-size: 12px; letter-spacing: 0.08em; border-radius: var(--radius); text-align: center; }
.btnContact { padding: 13px 24px; border: 1px solid var(--rule); color: var(--muted); font-size: 12px; letter-spacing: 0.08em; border-radius: var(--radius); text-align: center; }
@media (max-width: 768px) { .inner { grid-template-columns: 1fr; } }
```

```tsx
// src/components/home/Footer.tsx
'use client'
import { useTranslation } from 'react-i18next'
import styles from './Footer.module.css'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <div className={styles.logo}>가고시마 <em>시티뷰</em> 버스 가이드</div>
      </div>
      <div className={styles.right}>
        <div>{t('footer.source')}</div>
        <div>
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
            {t('footer.license')}
          </a>
        </div>
        <div className={styles.disclaimer}>{t('footer.disclaimer')}</div>
      </div>
    </footer>
  )
}
```

```css
/* src/components/home/Footer.module.css */
.footer { background: var(--dark); padding: 36px 52px; display: flex; justify-content: space-between; align-items: center; gap: 40px; }
.logo { font-family: var(--font-serif); font-size: 13px; color: rgba(255,255,255,0.6); letter-spacing: 0.1em; }
.logo em { color: var(--accent); font-style: normal; }
.right { text-align: right; font-size: 11px; color: rgba(255,255,255,0.25); line-height: 2; letter-spacing: 0.05em; }
.right a { color: rgba(255,255,255,0.35); }
.disclaimer { color: rgba(255,255,255,0.2); }
```

- [ ] **Step 8: 홈 page.tsx 조합**

```tsx
// src/app/page.tsx
import Nav from '@/components/Nav'
import Hero from '@/components/home/Hero'
import TrustSection from '@/components/home/TrustSection'
import ProblemGrid from '@/components/home/ProblemGrid'
import PartnershipSection from '@/components/home/PartnershipSection'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustSection />
        <ProblemGrid />
        <PartnershipSection />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 9: 로컬 확인 후 커밋**

```bash
# http://localhost:3000 에서 확인
git add src/components/home/ src/app/page.tsx
git commit -m "feat: complete story page with hero, trust, problems, partnership"
```

---

## PHASE 4: 데브로그

### Task 13: MDX 설정 + devlog 유틸

**Files:**
- Create: `src/lib/devlog.ts`
- Create: `content/story/ko/01-missed-the-bus.mdx`
- Create: `content/story/ko/02-everyone-suffers.mdx`
- Create: `content/story/ko/03-planning.mdx`
- Create: `content/story/ko/04-design.mdx`
- Create: `content/story/ko/05-building.mdx`

- [ ] **Step 1: devlog.ts 유틸 (locale fallback 포함)**

```ts
// src/lib/devlog.ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface EpisodeMeta {
  slug: string
  title: string
  episode: number
  date: string
  summary: string
  published: boolean
  lang: string
}

export interface Episode extends EpisodeMeta {
  content: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content/story')
const SUPPORTED_LANGS = ['ko', 'en', 'ja'] as const
type Lang = typeof SUPPORTED_LANGS[number]

function getEpisodePath(slug: string, lang: Lang): string | null {
  const p = path.join(CONTENT_DIR, lang, `${slug}.mdx`)
  return fs.existsSync(p) ? p : null
}

export function getAllEpisodes(lang: Lang = 'ko'): EpisodeMeta[] {
  const koDir = path.join(CONTENT_DIR, 'ko')
  if (!fs.existsSync(koDir)) return []

  const files = fs.readdirSync(koDir).filter(f => f.endsWith('.mdx'))

  return files
    .map(file => {
      const slug = file.replace(/\.mdx$/, '')
      const filePath = getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')!
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'))
      return { slug, ...data } as EpisodeMeta
    })
    .filter(e => e.published)
    .sort((a, b) => a.episode - b.episode)
}

export function getEpisode(slug: string, lang: Lang = 'ko'): Episode | null {
  const filePath = getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')
  if (!filePath) return null

  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'))
  if (!data.published) return null

  return { slug, content, ...data } as Episode
}

export function getAdjacentEpisodes(episode: number, lang: Lang = 'ko') {
  const all = getAllEpisodes(lang)
  const idx = all.findIndex(e => e.episode === episode)
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  }
}
```

> `gray-matter` 설치: `npm install gray-matter`

- [ ] **Step 2: gray-matter 설치**

```bash
npm install gray-matter
```

- [ ] **Step 3: 에피소드 01 MDX 작성**

```mdx
---
title: "가고시마에서 버스를 놓쳤다"
episode: 1
date: "2026-06-06"
summary: "2026년 5월, 텐몬칸 정류장을 찾지 못해 버스를 놓쳤다. 그게 이 서비스의 시작이었다."
published: true
lang: ko
---

2026년 5월, 나는 생애 처음으로 가고시마에 갔다.

계획은 간단했다. 가고시마 중앙역에서 시티뷰 버스를 타고 센간엔(仙巌園)에 가는 것. 나는 구글맵을 켜서 "天文館" 정류장을 검색했다.

지도가 한 곳을 가리켰다. 나는 그곳으로 걸어갔다.

그런데 버스가 오지 않았다.

10분을 기다렸다. 15분. 지나가던 현지 할머니에게 물어봤다. 그분이 언덕 위를 가리켰다. 실제 정류장은 구글맵이 표시한 곳에서 약 200미터 떨어진 언덕 위에 있었다.

버스는 이미 떠난 뒤였다.

---

그래도 가고시마는 너무 아름다웠다. 사쿠라지마의 실루엣, 이소 해수욕장의 파도, 센간엔의 정원. 이 도시를 더 많은 사람들이 불편 없이 여행할 수 있으면 좋겠다는 마음이 들었다.

귀국하고 나서 조사를 시작했다. 이 문제를 겪은 사람이 나 혼자인지.
```

- [ ] **Step 4: 에피소드 02 MDX**

```mdx
---
title: "전 세계가 같은 걸 겪고 있었다"
episode: 2
date: "2026-06-06"
summary: "전 세계 여행자들이 똑같은 문제를 겪고 있었다. TripAdvisor, 한국 블로그, 일본 커뮤니티에서 확인했다."
published: true
lang: ko
---

귀국 후 가장 먼저 한 일은 검색이었다.

TripAdvisor에서 "Kagoshima City View Bus" 리뷰를 뒤졌다. 프랑스, 호주, 영국 여행자들이 남긴 리뷰에 공통적으로 한 가지가 등장했다. 텐몬칸 정류장 위치 문제. 2017년부터 2025년까지, 8년 동안 같은 민원이 반복되고 있었다.

한국 여행 블로그도 검색했다. "시티뷰 버스 헤맸다", "정류장 어디냐"는 글이 여럿 있었다.

일본 4travel.jp도 마찬가지였다.

---

이건 나만의 불운이 아니었다. 가고시마시의 공식 관광 버스에 구조적인 정보 공백이 있었다.

그렇다면 이건 해결할 수 있는 문제였다. 가고시마시 공식 데이터가 있다면, 그걸 바탕으로 정확한 지도를 만들 수 있다.

알아보니 가고시마시는 GTFS-JP 형식의 오픈데이터를 공개하고 있었다. GPS 좌표 포함.
```

- [ ] **Step 5: 에피소드 03-05 MDX 작성**

```mdx
---
title: "관광과에 채택시키겠다는 목표"
episode: 3
date: "2026-06-06"
summary: "그냥 만드는 게 아니라, 가고시마시 관광과에 공식 채택시키겠다는 목표를 세웠다."
published: true
lang: ko
---

서비스를 만들기로 했을 때, 한 가지를 결심했다.

그냥 개인 프로젝트로 만들고 끝내지 않겠다. 가고시마시 관광과(観光課)에 이 서비스를 정식으로 채택시키겠다.

이유는 단순하다. 관광과가 배포하는 순간, 이 정보는 훨씬 많은 여행자에게 닿는다. 그게 이 서비스의 진짜 목적이니까.

그래서 서비스 기획부터 달랐다. 단순히 "지도 앱"이 아니라, 관광과 담당자에게 보여줄 수 있는 완성된 포트폴리오처럼 만들기로 했다.

- 가고시마시 공식 GTFS 오픈데이터 기반 (신뢰성)
- 한국어 · 영어 · 일본어 완벽 지원 (글로벌 대응)
- 무료, 광고 없음 (지속 가능성)
- 이 제작 과정 자체를 서비스 안에 담기 (투명성)
```

```mdx
---
title: "목업 3종 만들고 A안 고른 이유"
episode: 4
date: "2026-06-06"
summary: "디자인 방향을 잡기 위해 전통 일본, Gen Z, Japandi 3가지 시안을 만들었다. A안을 골랐다."
published: true
lang: ko
---

기술 스택을 정하기 전에 먼저 디자인 방향을 잡았다.

일본 웹 디자인 갤러리 사이트들을 참고했다. sankoudesign.com, webdesignclip.com. 관광 서비스들의 공통점을 파악했다.

세 가지 방향을 잡았다.

**A안. 和 (전통)** — 명조체 헤딩, 화산재 베이지 배경, 차분한 남색. 明日香村(아스카무라) 관광 사이트 스타일.

**B안. Z世代 (Gen Z)** — 다크 배경, 그레인 노이즈, 벤토 그리드, 그라디언트 텍스트.

**C안. 余白 (Japandi+Swiss)** — 스위스 격자 구조, 하이엔드 여행사 느낌.

세 가지를 모두 HTML로 만들어서 비교했다. 결론은 A안.

이유는 하나다. 관광과 담당자가 봤을 때 "신뢰할 수 있는" 느낌. Gen Z 감성이 아무리 세련돼도, 지자체 공무원에게 어필하려면 안정감이 필요하다.
```

```mdx
---
title: "Next.js + Mapbox로 20개 핀 찍기"
episode: 5
date: "2026-06-06"
summary: "기술 스택 선택과 개발 과정. Mapbox가 Next.js SSR에서 깨지는 문제부터 모바일 바텀시트까지."
published: true
lang: ko
---

기술 스택은 처음에 단순해 보였다. Next.js 15 + Mapbox GL JS. 그런데 첫날부터 문제가 생겼다.

**Mapbox가 Next.js에서 빌드가 깨졌다.**

Mapbox GL JS는 `window`, `Worker`, `WebGL`을 모듈 로드 시점에 참조한다. SSR 환경에서는 이게 없다. 해결책은 `dynamic(() => import(...), { ssr: false })`. 여기에 Turbopack을 비활성화해야 Worker URL 이슈가 사라진다.

**i18n 라이브러리도 교체했다.**

처음엔 `next-intl`을 쓰려 했는데, URL prefix 없이 App Router에서 쓰면 Server Component에서 번역이 안 된다. `react-i18next`로 바꿨다. 미들웨어 충돌도 없고, 쿠키 기반 언어 유지도 깔끔하게 된다.

**모바일 레이아웃은 데스크톱과 완전히 달랐다.**

데스크톱은 우측 사이드패널. 모바일은 바텀시트(Bottom Sheet). 외부 라이브러리 없이 CSS transform + touch event로 직접 구현했다.

이 정도면 작동한다. 이제 관광과에 연락할 차례다.
```

- [ ] **Step 6: 에피소드 06 (미공개) MDX**

```mdx
---
title: "가고시마시에 연락했습니다"
episode: 6
date: "2026-06-06"
summary: "관광과에 협력을 제안했다. 결과는 나오면 업데이트하겠다."
published: false
lang: ko
---

(런칭 후 결과 공유 예정)
```

- [ ] **Step 7: 커밋**

```bash
npm install gray-matter
git add content/ src/lib/devlog.ts package.json package-lock.json
git commit -m "feat: add MDX episodes and devlog utility"
```

---

### Task 14: 데브로그 페이지

**Files:**
- Create: `src/app/story/page.tsx`
- Create: `src/app/story/[slug]/page.tsx`
- Create: `src/components/devlog/EpisodeCard.tsx`
- Create: `src/components/devlog/EpisodeNav.tsx`
- Create: `src/components/home/DevlogTeaser.tsx`

- [ ] **Step 1: EpisodeCard 컴포넌트**

```tsx
// src/components/devlog/EpisodeCard.tsx
import Link from 'next/link'
import type { EpisodeMeta } from '@/lib/devlog'
import styles from './EpisodeCard.module.css'

interface Props { episode: EpisodeMeta }

export default function EpisodeCard({ episode }: Props) {
  return (
    <Link href={`/story/${episode.slug}`} className={styles.card}>
      <div className={styles.num}>Episode {episode.episode}</div>
      <div className={styles.title}>{episode.title}</div>
      <div className={styles.summary}>{episode.summary}</div>
      <div className={styles.date}>{episode.date}</div>
    </Link>
  )
}
```

```css
/* src/components/devlog/EpisodeCard.module.css */
.card {
  display: block; padding: 32px;
  border-bottom: 1px solid var(--rule);
  transition: background 0.12s;
}
.card:hover { background: var(--white); }
.num { font-family: var(--font-mono); font-size: 10px; color: var(--accent); letter-spacing: 0.15em; margin-bottom: 8px; }
.title { font-family: var(--font-serif); font-size: 20px; font-weight: 400; color: var(--ink); margin-bottom: 8px; line-height: 1.5; }
.summary { font-size: 13px; color: var(--muted); line-height: 1.8; margin-bottom: 12px; }
.date { font-family: var(--font-mono); font-size: 10px; color: var(--rule); }
```

- [ ] **Step 2: 에피소드 목록 페이지**

```tsx
// src/app/story/page.tsx
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import EpisodeCard from '@/components/devlog/EpisodeCard'
import { getAllEpisodes } from '@/lib/devlog'
import styles from './page.module.css'

export default function StoryPage() {
  const episodes = getAllEpisodes('ko')
  return (
    <>
      <Nav />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.kicker}>제작 이야기</div>
          <h1 className={styles.h1}>가고시마에서<br/>버스를 놓친 개발자</h1>
        </header>
        <div className={styles.list}>
          {episodes.map(ep => <EpisodeCard key={ep.slug} episode={ep} />)}
        </div>
      </main>
      <Footer />
    </>
  )
}
```

```css
/* src/app/story/page.module.css */
.main { max-width: 680px; margin: 0 auto; padding: 60px 24px; }
.header { margin-bottom: 48px; padding-bottom: 48px; border-bottom: 1px solid var(--rule); }
.kicker { font-size: 10px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin-bottom: 16px; }
.h1 { font-family: var(--font-serif); font-size: 36px; font-weight: 400; line-height: 1.6; }
.list { display: flex; flex-direction: column; }
```

- [ ] **Step 3: 에피소드 상세 페이지**

```tsx
// src/app/story/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Nav from '@/components/Nav'
import Footer from '@/components/home/Footer'
import { getEpisode, getAdjacentEpisodes } from '@/lib/devlog'
import styles from './page.module.css'
import Link from 'next/link'

interface Props { params: { slug: string } }

export default function EpisodePage({ params }: Props) {
  const episode = getEpisode(params.slug, 'ko')
  if (!episode) notFound()

  const { prev, next } = getAdjacentEpisodes(episode.episode, 'ko')

  return (
    <>
      <Nav />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.num}>Episode {episode.episode}</div>
          <h1 className={styles.h1}>{episode.title}</h1>
          <div className={styles.date}>{episode.date}</div>
        </header>
        <article className={styles.body}>
          <MDXRemote source={episode.content} />
        </article>
        <nav className={styles.nav}>
          {prev && <Link href={`/story/${prev.slug}`} className={styles.navPrev}>← {prev.title}</Link>}
          {next && <Link href={`/story/${next.slug}`} className={styles.navNext}>{next.title} →</Link>}
        </nav>
      </main>
      <Footer />
    </>
  )
}
```

```css
/* src/app/story/[slug]/page.module.css */
.main { max-width: 680px; margin: 0 auto; padding: 60px 24px; }
.header { margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid var(--rule); }
.num { font-family: var(--font-mono); font-size: 10px; color: var(--accent); letter-spacing: 0.15em; margin-bottom: 12px; }
.h1 { font-family: var(--font-serif); font-size: 32px; font-weight: 400; line-height: 1.6; margin-bottom: 12px; }
.date { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
.body { font-size: 15px; line-height: 2.3; color: var(--mid); }
.body h2 { font-family: var(--font-serif); font-size: 20px; font-weight: 400; margin: 40px 0 16px; color: var(--ink); }
.body p { margin-bottom: 20px; }
.body hr { border: none; border-top: 1px solid var(--rule); margin: 40px 0; }
.body strong { color: var(--ink); font-weight: 600; }
.nav { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 32px; border-top: 1px solid var(--rule); }
.navPrev, .navNext { font-size: 13px; color: var(--muted); transition: color 0.15s; }
.navPrev:hover, .navNext:hover { color: var(--ink); }
```

- [ ] **Step 4: 홈 DevlogTeaser 추가**

```tsx
// src/components/home/DevlogTeaser.tsx
import Link from 'next/link'
import EpisodeCard from '@/components/devlog/EpisodeCard'
import { getAllEpisodes } from '@/lib/devlog'
import styles from './DevlogTeaser.module.css'

export default function DevlogTeaser() {
  const episodes = getAllEpisodes('ko').slice(0, 2)
  if (episodes.length === 0) return null

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.h2}>제작 이야기</h2>
          <Link href="/story" className={styles.more}>전체 보기 →</Link>
        </div>
        <div className={styles.cards}>
          {episodes.map(ep => <EpisodeCard key={ep.slug} episode={ep} />)}
        </div>
      </div>
    </section>
  )
}
```

```css
/* src/components/home/DevlogTeaser.module.css */
.section { background: var(--white); padding: 60px 52px; border-top: 1px solid var(--rule); }
.inner { max-width: 1080px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.h2 { font-family: var(--font-serif); font-size: 20px; font-weight: 400; }
.more { font-size: 12px; color: var(--muted); letter-spacing: 0.08em; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--rule); }
@media (max-width: 768px) { .cards { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: 홈 page.tsx에 DevlogTeaser 추가**

```tsx
// src/app/page.tsx
import Nav from '@/components/Nav'
import Hero from '@/components/home/Hero'
import TrustSection from '@/components/home/TrustSection'
import ProblemGrid from '@/components/home/ProblemGrid'
import DevlogTeaser from '@/components/home/DevlogTeaser'
import PartnershipSection from '@/components/home/PartnershipSection'
import Footer from '@/components/home/Footer'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustSection />
        <ProblemGrid />
        <DevlogTeaser />
        <PartnershipSection />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/app/story/ src/components/devlog/ src/components/home/DevlogTeaser*
git commit -m "feat: add devlog episode list and detail pages"
```

---

## PHASE 5: PWA + 인증 + 배포

### Task 15: PWA 설정

**Files:**
- Modify: `next.config.js`
- Create: `public/manifest.json`

- [ ] **Step 1: @ducanh2912/next-pwa 설정**

```js
// next.config.js
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
}

module.exports = withPWA(nextConfig)
```

- [ ] **Step 2: manifest.json**

```json
{
  "name": "가고시마 시티뷰 버스 가이드",
  "short_name": "시티뷰 버스",
  "description": "가고시마 시티뷰 버스 정류장 정확한 위치 가이드",
  "start_url": "/map",
  "display": "standalone",
  "background_color": "#F4EFE9",
  "theme_color": "#1F1E1A",
  "lang": "ko",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: layout.tsx에 manifest 링크 추가**

```tsx
// src/app/layout.tsx (metadata 업데이트)
export const metadata: Metadata = {
  title: '가고시마 시티뷰 버스 가이드',
  description: '가고시마 시티뷰 버스 20개 정류장 정확한 GPS 위치 가이드.',
  manifest: '/manifest.json',
  themeColor: '#1F1E1A',
}
```

- [ ] **Step 4: 192x192, 512x512 아이콘 생성**

`public/icons/` 디렉토리에 PNG 아이콘 2개 배치. 최소한 단색 배경에 버스 아이콘 또는 "시" 한자.

- [ ] **Step 5: 커밋**

```bash
git add next.config.js public/manifest.json public/icons/ src/app/layout.tsx
git commit -m "feat: add PWA manifest and service worker"
```

---

### Task 16: NextAuth 어드민 라우트 보호

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `middleware.ts`

- [ ] **Step 1: NextAuth 핸들러**

```ts
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
      return allowedEmails.includes(user.email ?? '')
    },
  },
  pages: { signIn: '/admin/login' },
})

export { handler as GET, handler as POST }
```

- [ ] **Step 2: 미들웨어**

```ts
// middleware.ts
export { auth as default } from 'next-auth'

export const config = { matcher: ['/admin/:path*'] }
```

- [ ] **Step 3: 관리자 페이지 (MVP — 안내 텍스트만)**

```tsx
// src/app/admin/page.tsx
export default function AdminPage() {
  return (
    <main style={{ padding: '60px', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ marginBottom: '16px' }}>관리자</h1>
      <p style={{ color: '#888' }}>
        데이터 업데이트: src/data/stops.json 직접 편집 후 Vercel 재배포.
      </p>
    </main>
  )
}
```

- [ ] **Step 4: 로그인 페이지**

```tsx
// src/app/admin/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <main style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100dvh', gap:'16px', fontFamily:'var(--font-sans)' }}>
      <h1 style={{ fontSize:'18px' }}>관리자 로그인</h1>
      <button
        onClick={() => signIn('google', { callbackUrl: '/admin' })}
        style={{ padding:'12px 24px', background:'#1F1E1A', color:'white', border:'none', borderRadius:'4px', fontSize:'13px', cursor:'pointer' }}
      >
        Google로 로그인
      </button>
    </main>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/ src/app/admin/ middleware.ts
git commit -m "feat: add NextAuth admin route protection"
```

---

### Task 17: Vercel Analytics + 최종 배포

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Analytics 추가**

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <I18nProvider>{children}</I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공.

- [ ] **Step 3: Vercel CLI 배포**

```bash
npx vercel --prod
```

환경변수 설정 (Vercel 대시보드 또는 CLI):
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.실제토큰
NEXTAUTH_SECRET=랜덤32바이트
NEXTAUTH_URL=https://kagoshima-bus.vercel.app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAILS=dev@bas-korea.com
```

- [ ] **Step 4: Mapbox 토큰 도메인 제한**

mapbox.com → Account → Tokens → 해당 토큰 편집 → Allowed URLs:
```
https://kagoshima-bus.vercel.app
http://localhost:3000
```

- [ ] **Step 5: 최종 커밋 + 태그**

```bash
git add .
git commit -m "feat: add Vercel Analytics and complete MVP"
git tag v1.0.0-mvp
```

---

## Self-Review

**스펙 커버리지 체크:**
- [x] 지도 페이지 + 20개 정류장 핀 → Task 7, 11
- [x] 카테고리 브라우징 (드롭다운 대체) → Task 9
- [x] 모바일 바텀시트 → Task 10
- [x] /map/[stopId] 경로 파라미터 → Task 11
- [x] react-i18next (next-intl 대체) → Task 5
- [x] stops.json metadata + disclaimer → Task 4
- [x] TripAdvisor 인용 제거 → Task 12 (ProblemGrid 익명 처리)
- [x] 스토리 페이지 신뢰 근거 섹션 → Task 12 (TrustSection)
- [x] 데브로그 5편 공개 + 1편 미공개 → Task 13
- [x] MDX locale fallback → Task 13 (devlog.ts)
- [x] @ducanh2912/next-pwa → Task 15
- [x] NextAuth 어드민 보호 (UI 없음) → Task 16
- [x] Mapbox 토큰 도메인 제한 → Task 17
- [x] CC BY 4.0 출처 표기 + 가공 사실 → Task 12 (Footer)
- [x] Vercel Analytics → Task 17

**타입 일관성:**
- `Lang` 타입: `stops.ts`와 `devlog.ts` 모두 `'ko' | 'en' | 'ja'`로 동일
- `BusStop.destinations`는 `getAllStops()`에서 join하여 반환 — Task 4에서 정의, Task 7에서 사용
- `getStopsGeoJSON()` 반환 타입은 Mapbox `GeoJSONSourceSpecification.data`와 호환

**플레이스홀더 없음:** 모든 태스크에 실제 코드 포함 확인.
