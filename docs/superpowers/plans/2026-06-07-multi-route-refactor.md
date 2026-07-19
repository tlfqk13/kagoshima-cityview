# Multi-Route Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-route (City View only) architecture to support three routes — City View, Night View Course, and Sakurajima Island View — with a tab-based route selector UI, without breaking any existing functionality.

**Architecture:** Each route lives in its own `src/data/routes/{routeId}.json` file. A new `src/lib/routes.ts` provides typed multi-route functions. `MapCanvas` and `MapPage` receive a `routeId` state/prop and re-render accordingly. `src/lib/stops.ts` becomes a thin compatibility shim so unmigrated consumers keep working unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Mapbox GL JS, react-i18next

---

## File Structure

### Created
- `src/data/routes/cityview.json` — City View stops (migrated from stops.json)
- `src/data/routes/cityview-night.json` — Night View Course (7 stops, Saturday only)
- `src/data/routes/islandview.json` — Sakurajima Island View (12 stops, approximate coords)
- `src/lib/routes.ts` — Multi-route types + functions
- `src/components/map/RouteTab.tsx` — Route selector tab bar
- `src/components/map/RouteTab.module.css` — RouteTab styles

### Modified
- `src/lib/stops.ts` — Becomes backward-compat shim
- `src/app/map/MapPage.tsx` — Adds `routeId` state, `RouteTab`
- `src/app/map/page.tsx` — Parses `?route=` URL param
- `src/components/map/MapCanvas.tsx` — Adds `routeId` prop, route-aware layers
- `src/components/map/QRModal.tsx` — URL includes `route` param
- `src/components/map/StopDetail.tsx` — Passes `routeId` to QRModal
- `src/components/map/SidePanel.tsx` — Passes `routeId` to StopDetail
- `src/components/map/BottomSheet.tsx` — Passes `routeId` to StopDetail
- `src/messages/ko.json`, `en.json`, `ja.json` — Route names and tab labels

### Deleted
- `src/data/stops.json` — Replaced by `src/data/routes/cityview.json` (deleted in Task 10)

---

## Task 1: Migrate stops.json → src/data/routes/cityview.json

**Files:**
- Create: `src/data/routes/cityview.json`

Add `routeId`, `name`, `color`, `fare`, `dayPass`, `operatingDays`, `loopDurationMin`, `center`, `zoom` to the metadata. Add `connections: []` to every stop. Add the ferry connection to stop_16.

- [ ] **Step 1: Create the directory**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview
mkdir -p src/data/routes
```

- [ ] **Step 2: Create `src/data/routes/cityview.json`**

Copy all content from `src/data/stops.json`. Replace the `metadata` object with the following (keep all 20 `stops` entries exactly as-is, but add `"connections": []` to each stop):

```json
{
  "metadata": {
    "routeId": "cityview",
    "name": {
      "ko": "카고시마 시티뷰",
      "en": "Kagoshima City View",
      "ja": "カゴシマシティビュー"
    },
    "color": "#8B4513",
    "fare": { "adult": 230, "child": 120 },
    "dayPass": { "adult": 600, "child": 300 },
    "operatingDays": "daily",
    "loopDurationMin": 80,
    "center": [130.5581, 31.5897],
    "zoom": 13,
    "frequencyMin": 30,
    "totalRuns": 19,
    "firstDeparture": "08:30",
    "lastDeparture": "17:30",
    "sourceVersion": "2026-06",
    "lastUpdatedAt": "2026-06-07",
    "lastValidatedAt": "2026-06-07",
    "coordinateSource": "https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1680",
    "scheduleSource": "https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php?rosenId=1680&syubetuId=0",
    "disclaimer": {
      "ko": "이 서비스는 GPS 정류장 위치 정보를 제공합니다. 실제 운행 시간 및 노선은 가고시마시 공식 앱 또는 정류장 안내판을 반드시 확인하세요.",
      "en": "This service provides GPS stop location data. Always verify actual bus schedules via the official Kagoshima City app or stop signs.",
      "ja": "本サービスはGPS停留所位置情報を提供します。実際の運行時刻・路線は鹿児島市公式アプリまたは停留所の案内板でご確認ください。"
    }
  },
  "stops": [ ... ]
}
```

For each of the 20 stops, add `"connections": []` as a new field (after `"destinations"`). **Exception: stop_16** gets this instead:

```json
{
  "id": "stop_16",
  "number": 16,
  "lat": 31.59618566,
  "lng": 130.562776,
  "name": { "ko": "수족관 앞 (사쿠라지마 페리)", "en": "Aquarium Mae (Sakurajima Ferry)", "ja": "水族館前（桜島桟橋）" },
  "googleMapsError": false,
  "googleMapsErrorNote": "",
  "connections": [{
    "type": "ferry",
    "to": "islandview",
    "note": {
      "ko": "사쿠라지마 페리 선착장 (약 15분)",
      "en": "Sakurajima Ferry Terminal (~15 min to island)",
      "ja": "桜島フェリー乗り場（約15分）"
    }
  }],
  "destinations": [],
  "schedule": { ... }
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "const d = require('./src/data/routes/cityview.json'); console.log('stops:', d.stops.length, '| routeId:', d.metadata.routeId)"
```

Expected output: `stops: 20 | routeId: cityview`

- [ ] **Step 4: Commit**

```bash
git add src/data/routes/cityview.json
git commit -m "feat: migrate stops.json to routes/cityview.json with route metadata and ferry connection on stop_16"
```

---

## Task 2: Create src/data/routes/cityview-night.json

**Files:**
- Create: `src/data/routes/cityview-night.json`

Night View Course: 7 stops, Saturday-only (+ Friday in Aug/Dec/Jan). Coordinates are derived from known City View stop locations. `市役所前` uses an approximate coordinate.

- [ ] **Step 1: Create `src/data/routes/cityview-night.json`**

```json
{
  "metadata": {
    "routeId": "cityview-night",
    "name": {
      "ko": "야경 코스",
      "en": "Night View Course",
      "ja": "夜景コース"
    },
    "color": "#2C3E7A",
    "fare": { "adult": 250, "child": 130 },
    "dayPass": null,
    "operatingDays": "saturday",
    "seasonalExtra": ["august", "december", "january"],
    "loopDurationMin": 60,
    "center": [130.5530, 31.5930],
    "zoom": 14,
    "frequencyMin": null,
    "totalRuns": null,
    "firstDeparture": null,
    "lastDeparture": null,
    "sourceVersion": "2026-06",
    "lastUpdatedAt": "2026-06-07",
    "lastValidatedAt": "2026-06-07",
    "coordinateSource": "cityview.json (derived) + 市役所前 approximate",
    "scheduleSource": "https://www.kotsu-city-kagoshima.jp/sakurajima-tabi/",
    "scheduleNote": {
      "ko": "매주 토요일 운행 (8·12·1월은 금·토 양일). 정확한 출발 시각은 공식 사이트 확인.",
      "en": "Runs every Saturday (also Friday in Aug/Dec/Jan). Check official site for exact times.",
      "ja": "毎週土曜日運行（8・12・1月は金土両日）。正確な時刻は公式サイトをご確認ください。"
    },
    "disclaimer": {
      "ko": "야경 코스는 토요일만 운행합니다 (8·12·1월 금요일 추가).",
      "en": "Night View Course runs Saturdays only (also Fridays in Aug/Dec/Jan).",
      "ja": "夜景コースは毎週土曜日のみ運行（8・12・1月は金曜日も運行）。"
    }
  },
  "stops": [
    {
      "id": "cn_stop_01",
      "number": 1,
      "lat": 31.58508327,
      "lng": 130.5436063,
      "name": { "ko": "가고시마 중앙역", "en": "Kagoshima-Chuo Station", "ja": "鹿児島中央駅" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "출발지 — 공식 사이트에서 시각 확인", "en": "Departure — check official site for times", "ja": "出発地 — 公式サイトで時刻確認" } }
    },
    {
      "id": "cn_stop_02",
      "number": 2,
      "lat": 31.59034199,
      "lng": 130.5541581,
      "name": { "ko": "텐몬칸", "en": "Tenmonkan", "ja": "天文館" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "공식 사이트에서 시각 확인", "en": "Check official site for times", "ja": "公式サイトで時刻確認" } }
    },
    {
      "id": "cn_stop_03",
      "number": 3,
      "lat": 31.59482962,
      "lng": 130.5627573,
      "name": { "ko": "워터프론트파크 앞", "en": "Waterfront Park Mae", "ja": "ウォーターフロントパーク前" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "공식 사이트에서 시각 확인", "en": "Check official site for times", "ja": "公式サイトで時刻確認" } }
    },
    {
      "id": "cn_stop_04",
      "number": 4,
      "lat": 31.58870,
      "lng": 130.55010,
      "coordinatesApproximate": true,
      "name": { "ko": "시청 앞", "en": "City Hall Mae", "ja": "市役所前" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "공식 사이트에서 시각 확인", "en": "Check official site for times", "ja": "公式サイトで時刻確認" } }
    },
    {
      "id": "cn_stop_05",
      "number": 5,
      "lat": 31.59658192,
      "lng": 130.5491745,
      "name": { "ko": "시로야마 (15분 정차)", "en": "Shiroyama (15 min stop)", "ja": "城山（15分停車）" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "야경 감상 15분 정차 후 출발", "en": "15 min night view stop then departs", "ja": "15分停車後出発" } }
    },
    {
      "id": "cn_stop_06",
      "number": 6,
      "lat": 31.59472224,
      "lng": 130.5542251,
      "name": { "ko": "사이고 동상 앞", "en": "Saigo Statue Mae", "ja": "西郷銅像前" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "공식 사이트에서 시각 확인", "en": "Check official site for times", "ja": "公式サイトで時刻確認" } }
    },
    {
      "id": "cn_stop_07",
      "number": 7,
      "lat": 31.59021226,
      "lng": 130.5543941,
      "name": { "ko": "텐몬칸 (중앙역 방면)", "en": "Tenmonkan (toward Kagoshima-Chuo)", "ja": "天文館（鹿児島中央駅向け）" },
      "connections": [],
      "destinations": [],
      "schedule": { "departures": [], "operatingNote": { "ko": "공식 사이트에서 시각 확인", "en": "Check official site for times", "ja": "公式サイトで時刻確認" } }
    }
  ]
}
```

- [ ] **Step 2: Verify JSON**

```bash
node -e "const d = require('./src/data/routes/cityview-night.json'); console.log('stops:', d.stops.length, '| routeId:', d.metadata.routeId)"
```

Expected: `stops: 7 | routeId: cityview-night`

- [ ] **Step 3: Commit**

```bash
git add src/data/routes/cityview-night.json
git commit -m "feat: add cityview-night.json (Saturday Night View Course, 7 stops)"
```

---

## Task 3: Create src/data/routes/islandview.json

**Files:**
- Create: `src/data/routes/islandview.json`

12 stops, A/B course alternation. Coordinates are approximate (`"coordinatesApproximate": true` on each stop). Stops 7, 8, 9 are B-course-only. Stop iv_stop_01 has a reverse ferry connection back to City View.

- [ ] **Step 1: Create `src/data/routes/islandview.json`**

```json
{
  "metadata": {
    "routeId": "islandview",
    "name": {
      "ko": "사쿠라지마 아일랜드뷰",
      "en": "Sakurajima Island View",
      "ja": "サクラジマアイランドビュー"
    },
    "color": "#1A6B3A",
    "fare": { "adult": 230, "child": 120 },
    "dayPass": { "adult": 500, "child": 250 },
    "operatingDays": "daily",
    "loopDurationMin": 55,
    "center": [130.6100, 31.6600],
    "zoom": 12,
    "frequencyMin": 30,
    "totalRuns": 15,
    "firstDeparture": "09:30",
    "lastDeparture": "16:30",
    "courses": {
      "A": { "description": { "ko": "A코스 (사방센터 미경유)", "en": "Course A (skips Sabo Center)", "ja": "Aコース（砂防センター経由なし）" } },
      "B": { "description": { "ko": "B코스 (전 정류장 경유)", "en": "Course B (all stops)", "ja": "Bコース（全停留所経由）" } }
    },
    "coordinatesApproximate": true,
    "sourceVersion": "2026-06",
    "lastUpdatedAt": "2026-06-07",
    "lastValidatedAt": "2026-06-07",
    "coordinateSource": "approximate — needs extraction from kotsu-city-kagoshima.jp (Island View rosenId). See docs/data-update-guide.md.",
    "scheduleSource": "https://www.kotsu-city-kagoshima.jp/wp/wp-content/uploads/2024/08/78f5e11c28ce68319147a117a1a5cf00.pdf",
    "disclaimer": {
      "ko": "사쿠라지마 아일랜드뷰. A/B 2코스 교대 운행, 30분 간격. 좌표는 근사치입니다.",
      "en": "Sakurajima Island View. Courses A and B alternate every 30 min. Coordinates are approximate.",
      "ja": "サクラジマアイランドビュー。A・Bコース交互運行、30分間隔。座標は概算値です。"
    }
  },
  "stops": [
    {
      "id": "iv_stop_01", "number": 1,
      "lat": 31.6603, "lng": 130.6035,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "사쿠라지마항", "en": "Sakurajima Port", "ja": "桜島港" },
      "connections": [{
        "type": "ferry",
        "to": "cityview",
        "note": { "ko": "가고시마 시내 페리 (약 15분)", "en": "Ferry to Kagoshima city (~15 min)", "ja": "鹿児島市内へフェリー（約15分）" }
      }],
      "destinations": [],
      "schedule": {
        "departures": ["09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30"],
        "operatingNote": { "ko": "하루 15편 (09:30~16:30). 30분 간격.", "en": "15 daily runs (09:30–16:30). Every 30 min.", "ja": "1日15便（09:30〜16:30）。30分間隔。" }
      }
    },
    {
      "id": "iv_stop_02", "number": 2,
      "lat": 31.6627, "lng": 130.5967,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "히노시마 메구미칸", "en": "Hinoshima Megumikan", "ja": "火の島めぐみ館" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:31","10:01","10:31","11:01","11:31","12:01","12:31","13:01","13:31","14:01","14:31","15:01","15:31","16:01","16:31"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_03", "number": 3,
      "lat": 31.6673, "lng": 130.5895,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "레인보우 사쿠라지마", "en": "Rainbow Sakurajima", "ja": "レインボー桜島" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:33","10:03","10:33","11:03","11:33","12:03","12:33","13:03","13:33","14:03","14:33","15:03","15:33","16:03","16:33"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_04", "number": 4,
      "lat": 31.6714, "lng": 130.5839,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "비지터센터", "en": "Sakurajima Visitor Center", "ja": "ビジターセンター" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:36","10:06","10:36","11:06","11:36","12:06","12:36","13:06","13:36","14:06","14:36","15:06","15:36","16:06","16:36"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_05", "number": 5,
      "lat": 31.6771, "lng": 130.5778,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "카라스지마 전망소", "en": "Karasujima Observatory", "ja": "烏島展望所" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:39","10:09","10:39","11:09","11:39","12:09","12:39","13:09","13:39","14:09","14:39","15:09","15:39","16:09","16:39"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_06", "number": 6,
      "lat": 31.6687, "lng": 130.5716,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "아카미즈 전망광장", "en": "Akamizu Observatory Square", "ja": "赤水展望広場" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:41","10:11","10:41","11:11","11:41","12:11","12:41","13:11","13:41","14:11","14:41","15:11","15:41","16:11","16:41"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_07", "number": 7,
      "lat": 31.6618, "lng": 130.5693,
      "coordinatesApproximate": true,
      "courses": ["B"],
      "name": { "ko": "아카미즈 후모토 (B코스)", "en": "Akamizu Fumoto (Course B)", "ja": "赤水麓（Bコース）" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:44","10:44","11:44","12:44","13:44","14:44","15:44","16:44"], "operatingNote": { "ko": "B코스만 정차 (홀수 편)", "en": "B course only (odd runs)", "ja": "Bコースのみ停車" } }
    },
    {
      "id": "iv_stop_08", "number": 8,
      "lat": 31.6553, "lng": 130.5673,
      "coordinatesApproximate": true,
      "courses": ["B"],
      "name": { "ko": "국제화산사방센터", "en": "Int'l Volcanic Sabo Center", "ja": "国際火山砂防センター" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:47","10:47","11:47","12:47","13:47","14:47","15:47","16:47"], "operatingNote": { "ko": "B코스만 정차", "en": "B course only", "ja": "Bコースのみ停車" } }
    },
    {
      "id": "iv_stop_09", "number": 9,
      "lat": 31.6618, "lng": 130.5693,
      "coordinatesApproximate": true,
      "courses": ["B"],
      "name": { "ko": "아카미즈 후모토 (B코스, 귀환)", "en": "Akamizu Fumoto (Course B, return)", "ja": "赤水麓（Bコース帰路）" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:50","10:50","11:50","12:50","13:50","14:50","15:50","16:50"], "operatingNote": { "ko": "B코스만 정차", "en": "B course only", "ja": "Bコースのみ停車" } }
    },
    {
      "id": "iv_stop_10", "number": 10,
      "lat": 31.6638, "lng": 130.5750,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "아카미즈 유노히라구치", "en": "Akamizu Yunohira Guchi", "ja": "赤水湯之平口" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["09:51","10:14","10:51","11:14","11:51","12:14","12:51","13:14","13:51","14:14","14:51","15:14","15:51","16:14","16:51"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_11", "number": 11,
      "lat": 31.6486, "lng": 130.6410,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "유노히라 전망소", "en": "Yunohira Observatory", "ja": "湯之平展望所" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["10:10","10:40","11:10","11:40","12:10","12:40","13:10","13:40","14:10","14:40","15:10","15:40","16:10","16:40","17:10"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    },
    {
      "id": "iv_stop_12", "number": 12,
      "lat": 31.6543, "lng": 130.6218,
      "coordinatesApproximate": true,
      "courses": ["A", "B"],
      "name": { "ko": "오우 초등학교 앞", "en": "Ohu Elementary School Mae", "ja": "桜洲小学校前" },
      "connections": [], "destinations": [],
      "schedule": { "departures": ["10:20","10:50","11:20","11:50","12:20","12:50","13:20","13:50","14:20","14:50","15:20","15:50","16:20","16:50","17:20"], "operatingNote": { "ko": "하루 15편", "en": "15 daily runs", "ja": "1日15便" } }
    }
  ]
}
```

- [ ] **Step 2: Verify JSON**

```bash
node -e "const d = require('./src/data/routes/islandview.json'); console.log('stops:', d.stops.length, '| approx:', d.metadata.coordinatesApproximate)"
```

Expected: `stops: 12 | approx: true`

- [ ] **Step 3: Commit**

```bash
git add src/data/routes/islandview.json
git commit -m "feat: add islandview.json (Sakurajima Island View, 12 stops, approximate coordinates)"
```

---

## Task 4: Create src/lib/routes.ts

**Files:**
- Create: `src/lib/routes.ts`

New multi-route library. All functions keyed by `RouteId`. This is the canonical import for all new code.

- [ ] **Step 1: Create `src/lib/routes.ts`**

```typescript
import cityviewRaw from '@/data/routes/cityview.json'
import cityviewNightRaw from '@/data/routes/cityview-night.json'
import islandviewRaw from '@/data/routes/islandview.json'
import destinationsRaw from '@/data/destinations.json'

export type Lang = 'ko' | 'en' | 'ja'
export type Category = 'sightseeing' | 'food' | 'nature' | 'shopping'
export type RouteId = 'cityview' | 'cityview-night' | 'islandview'

export interface Destination {
  id: string
  stopId: string
  name: Record<Lang, string>
  walkMinutes: number
  category: Category
}

export interface Connection {
  type: 'ferry' | 'tram' | 'bus'
  to: string
  note: Record<Lang, string>
}

export interface RouteStop {
  id: string
  number: number
  lat: number
  lng: number
  coordinatesApproximate?: boolean
  courses?: string[]
  name: Record<Lang, string>
  googleMapsError?: boolean
  googleMapsErrorNote?: string
  connections: Connection[]
  destinations: Destination[]
  schedule?: {
    departures: string[]
    operatingNote: Record<Lang, string>
  }
}

export interface RouteMetadata {
  routeId: RouteId
  name: Record<Lang, string>
  color: string
  fare: { adult: number; child: number }
  dayPass: { adult: number; child: number } | null
  operatingDays: 'daily' | 'saturday'
  seasonalExtra?: string[]
  loopDurationMin: number
  center: [number, number]
  zoom: number
  frequencyMin: number | null
  totalRuns: number | null
  firstDeparture: string | null
  lastDeparture: string | null
  coordinatesApproximate?: boolean
  sourceVersion: string
  lastUpdatedAt: string
  lastValidatedAt: string
  coordinateSource: string
  scheduleSource: string
  scheduleNote?: Record<Lang, string>
  disclaimer: Record<Lang, string>
}

interface RawRouteData {
  metadata: RouteMetadata
  stops: Omit<RouteStop, 'destinations'>[]
}

const allDestinations = destinationsRaw as Destination[]

const rawRoutes: Record<RouteId, RawRouteData> = {
  cityview: cityviewRaw as RawRouteData,
  'cityview-night': cityviewNightRaw as RawRouteData,
  islandview: islandviewRaw as RawRouteData,
}

function attachDestinations(stop: Omit<RouteStop, 'destinations'>): RouteStop {
  return {
    ...stop,
    connections: stop.connections ?? [],
    destinations: allDestinations.filter(d => d.stopId === stop.id),
  }
}

export const ROUTE_ORDER: RouteId[] = ['cityview', 'cityview-night', 'islandview']

export function getRoute(id: RouteId): RouteMetadata {
  return rawRoutes[id].metadata
}

export function getAllRoutes(): RouteMetadata[] {
  return ROUTE_ORDER.map(id => rawRoutes[id].metadata)
}

export function getStopsForRoute(routeId: RouteId): RouteStop[] {
  return rawRoutes[routeId].stops.map(attachDestinations)
}

export function getStopById(routeId: RouteId, stopId: string): RouteStop | undefined {
  const raw = rawRoutes[routeId].stops.find(s => s.id === stopId)
  return raw ? attachDestinations(raw) : undefined
}

export function getRouteCoordinates(routeId: RouteId): [number, number][] {
  return rawRoutes[routeId].stops
    .slice()
    .sort((a, b) => a.number - b.number)
    .map(s => [s.lng, s.lat])
}

export function getStopsGeoJSON(stops: RouteStop[]) {
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
        googleMapsError: stop.googleMapsError ?? false,
        coordinatesApproximate: stop.coordinatesApproximate ?? false,
        hasConnection: (stop.connections ?? []).length > 0,
      },
    })),
  }
}

export function getNearestStop(routeId: RouteId, lat: number, lng: number): RouteStop | null {
  const stops = getStopsForRoute(routeId)
  if (!stops.length) return null
  let nearest: RouteStop | null = null
  let minDist = Infinity
  for (const stop of stops) {
    const R = 6371000
    const dLat = ((stop.lat - lat) * Math.PI) / 180
    const dLng = ((stop.lng - lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) * Math.cos((stop.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (dist < minDist) { minDist = dist; nearest = stop }
  }
  return nearest
}

export function getStopsByCategory(routeId: RouteId, category: Category): RouteStop[] {
  const stopIds = new Set(allDestinations.filter(d => d.category === category).map(d => d.stopId))
  return getStopsForRoute(routeId).filter(s => stopIds.has(s.id))
}

export function searchStops(routeId: RouteId, query: string): RouteStop[] {
  if (!query.trim()) return getStopsForRoute(routeId)
  const q = query.toLowerCase().trim()
  return getStopsForRoute(routeId).filter(stop =>
    stop.name.ko.toLowerCase().includes(q) ||
    stop.name.en.toLowerCase().includes(q) ||
    stop.name.ja.toLowerCase().includes(q) ||
    stop.destinations.some(d =>
      d.name.ko.toLowerCase().includes(q) ||
      d.name.en.toLowerCase().includes(q) ||
      d.name.ja.toLowerCase().includes(q)
    )
  )
}

export function isRouteAvailableToday(routeId: RouteId): boolean {
  if (routeId === 'cityview' || routeId === 'islandview') return true
  const day = new Date().getDay()
  const month = new Date().getMonth() + 1
  return day === 6 || (day === 5 && [8, 12, 1].includes(month))
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep -v "^$" | head -20
```

Expected: 0 errors from `src/lib/routes.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/routes.ts
git commit -m "feat: add lib/routes.ts — multi-route types and functions"
```

---

## Task 5: Update src/lib/stops.ts as backward-compat shim

**Files:**
- Modify: `src/lib/stops.ts`

Replace the entire file. All existing exports kept via delegation to `routes.ts`. Consumers of `stops.ts` don't need to change yet.

- [ ] **Step 1: Replace the full content of `src/lib/stops.ts`**

```typescript
// Backward-compatibility shim — delegates to lib/routes.ts for 'cityview'.
// New code should import from '@/lib/routes' directly.
export type { Lang, Category, Destination, RouteStop as BusStop } from './routes'
export type { RouteMetadata as StopsData } from './routes'

import {
  getStopsForRoute,
  getStopById as routesGetById,
  getStopsGeoJSON as routesGeoJSON,
  getNearestStop as routesNearest,
  getStopsByCategory as routesByCategory,
  getRouteCoordinates,
  type RouteStop,
  type Category,
} from './routes'
import cityviewRaw from '@/data/routes/cityview.json'

export function getAllStops() { return getStopsForRoute('cityview') }
export function getStopById(id: string) { return routesGetById('cityview', id) }
export function getStopsGeoJSON(stops: RouteStop[]) { return routesGeoJSON(stops) }
export function getNearestStop(lat: number, lng: number) { return routesNearest('cityview', lat, lng) }
export function getStopsByCategory(category: Category) { return routesByCategory('cityview', category) }
export function getMetadata() { return (cityviewRaw as { metadata: Record<string, unknown> }).metadata }

// Single source of truth — derived from cityview.json via routes.ts
export const ROUTE_COORDINATES: [number, number][] = getRouteCoordinates('cityview')
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep -v "^$" | head -30
```

Expected: 0 errors from the shim or any consumer of it

- [ ] **Step 3: Commit**

```bash
git add src/lib/stops.ts
git commit -m "refactor: stops.ts becomes backward-compat shim delegating to routes.ts"
```

---

## Task 6: Create RouteTab component and add i18n route names

**Files:**
- Create: `src/components/map/RouteTab.tsx`
- Create: `src/components/map/RouteTab.module.css`
- Modify: `src/messages/ko.json`, `src/messages/en.json`, `src/messages/ja.json`

- [ ] **Step 1: Add route keys to i18n files**

In `src/messages/ko.json`, add at the root level (after `"offline": {...}`):
```json
"routes": {
  "cityview": { "name": "시티뷰" },
  "cityview-night": { "name": "야경 코스" },
  "islandview": { "name": "아일랜드뷰" },
  "saturdayOnly": "토요일",
  "coordsApproximate": "좌표 근사치"
}
```

In `src/messages/en.json`:
```json
"routes": {
  "cityview": { "name": "City View" },
  "cityview-night": { "name": "Night View" },
  "islandview": { "name": "Island View" },
  "saturdayOnly": "Sat only",
  "coordsApproximate": "Approx. coords"
}
```

In `src/messages/ja.json`:
```json
"routes": {
  "cityview": { "name": "シティビュー" },
  "cityview-night": { "name": "夜景コース" },
  "islandview": { "name": "アイランドビュー" },
  "saturdayOnly": "土曜のみ",
  "coordsApproximate": "座標は概算"
}
```

- [ ] **Step 2: Create `src/components/map/RouteTab.tsx`**

```tsx
'use client'
import { useTranslation } from 'react-i18next'
import { isRouteAvailableToday, ROUTE_ORDER, type RouteId } from '@/lib/routes'
import styles from './RouteTab.module.css'

const ROUTE_ICONS: Record<RouteId, string> = {
  cityview: '🚌',
  'cityview-night': '🌙',
  islandview: '🌋',
}

interface Props {
  activeRoute: RouteId
  onChange: (route: RouteId) => void
}

export default function RouteTab({ activeRoute, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div className={styles.tabBar} role="tablist" aria-label="Route selector">
      {ROUTE_ORDER.map(routeId => {
        const isNight = routeId === 'cityview-night'
        const availableToday = isNight ? isRouteAvailableToday(routeId) : true
        return (
          <button
            key={routeId}
            role="tab"
            aria-selected={activeRoute === routeId}
            className={[
              styles.tab,
              activeRoute === routeId ? styles.active : '',
              isNight && !availableToday ? styles.dimmed : '',
            ].join(' ')}
            onClick={() => onChange(routeId)}
          >
            <span className={styles.icon}>{ROUTE_ICONS[routeId]}</span>
            <span className={styles.label}>{t(`routes.${routeId}.name`)}</span>
            {isNight && availableToday && <span className={styles.badge}>{t('routes.todayBadge') || 'TODAY'}</span>}
            {isNight && !availableToday && <span className={styles.badgeMuted}>{t('routes.saturdayOnly')}</span>}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/map/RouteTab.module.css`**

```css
.tabBar {
  display: flex;
  background: var(--white);
  border-bottom: 1px solid var(--rule);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.tabBar::-webkit-scrollbar { display: none; }

.tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 18px;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.tab:hover { color: var(--ink); }

.active {
  color: var(--ink);
  border-bottom-color: #8B4513;
}

.dimmed { opacity: 0.5; }

.icon { font-size: 14px; }

.label { font-size: 12px; font-weight: 600; }

.badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  background: #2C7A3A;
  color: #fff;
  border-radius: 8px;
  line-height: 1.6;
}

.badgeMuted {
  font-size: 9px;
  padding: 1px 5px;
  background: var(--rule);
  color: var(--muted);
  border-radius: 8px;
  line-height: 1.6;
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep "RouteTab\|routes\." | head -10
```

Expected: no errors related to RouteTab

- [ ] **Step 5: Commit**

```bash
git add src/components/map/RouteTab.tsx src/components/map/RouteTab.module.css src/messages/ko.json src/messages/en.json src/messages/ja.json
git commit -m "feat: add RouteTab component and route i18n keys"
```

---

## Task 7: Update MapPage.tsx to add routeId state and RouteTab

**Files:**
- Modify: `src/app/map/MapPage.tsx`
- Modify: `src/app/map/page.tsx`

- [ ] **Step 1: Replace the imports in `src/app/map/MapPage.tsx`**

Change:
```typescript
import { getAllStops, getStopsByCategory, getMetadata, type BusStop, type Category } from '@/lib/stops'
```

To:
```typescript
import {
  getStopsForRoute, getStopsByCategory, getRoute,
  type RouteStop, type RouteId, type Category,
} from '@/lib/routes'
import RouteTab from '@/components/map/RouteTab'
```

- [ ] **Step 2: Update the `Props` interface**

```typescript
interface Props {
  initialStopId?: string
  initialRouteId?: RouteId
}
```

- [ ] **Step 3: Add `activeRoute` state and update `selectedStop` init**

Replace the `useState` for `selectedStop` and add `activeRoute`:

```typescript
export default function MapPage({ initialStopId, initialRouteId = 'cityview' }: Props) {
  const [activeRoute, setActiveRoute] = useState<RouteId>(initialRouteId)
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(() => {
    if (!initialStopId) return null
    return getStopsForRoute(initialRouteId).find(s => s.id === initialStopId) ?? null
  })
```

- [ ] **Step 4: Add `handleRouteChange` function (after `handleToggleFavorite`)**

```typescript
function handleRouteChange(routeId: RouteId) {
  setActiveRoute(routeId)
  setSelectedStop(null)
  setActiveCategory('all')
  setSearchQuery('')
}
```

- [ ] **Step 5: Update `filteredStops` memo**

Replace `getAllStops()` with `getStopsForRoute(activeRoute)` and add `activeRoute` to the dependency array:

```typescript
const filteredStops = useMemo(() => {
  let stops =
    activeCategory === 'all'
      ? getStopsForRoute(activeRoute)
      : getStopsByCategory(activeRoute, activeCategory as Category)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim()
    stops = stops.filter(stop => {
      const nameMatch =
        stop.name.ko.toLowerCase().includes(q) ||
        stop.name.en.toLowerCase().includes(q) ||
        stop.name.ja.toLowerCase().includes(q)
      const destMatch = stop.destinations.some(d =>
        d.name.ko.toLowerCase().includes(q) ||
        d.name.en.toLowerCase().includes(q) ||
        d.name.ja.toLowerCase().includes(q)
      )
      return nameMatch || destMatch
    })
  }
  return [...stops].sort((a, b) => {
    const aFav = favorites.includes(a.id) ? -1 : 0
    const bFav = favorites.includes(b.id) ? -1 : 0
    return aFav - bFav
  })
}, [activeRoute, activeCategory, searchQuery, favorites])
```

- [ ] **Step 6: Update `sourceNote` to use `getRoute(activeRoute)`**

Replace any `getMetadata()` call:
```typescript
const routeMeta = getRoute(activeRoute)
const sourceNote = `データ提供：鹿児島市 · ${routeMeta.lastValidatedAt} 검증`
```

- [ ] **Step 7: Add `RouteTab` to the JSX**

In the JSX, add `<RouteTab>` between `<Nav />` and the main body div, and add `routeId={activeRoute}` to `MapCanvas`, `SidePanel`, and `BottomSheet`:

```tsx
return (
  <div className={styles.wrap}>
    <Nav />
    <RouteTab activeRoute={activeRoute} onChange={handleRouteChange} />
    <div className={styles.body}>
      <div className={styles.mapWrap}>
        <div className={styles.chips}>
          <CategoryChips active={activeCategory} onChange={cat => setActiveCategory(cat ?? 'all')} />
        </div>
        <MapCanvas
          routeId={activeRoute}
          selectedStopId={selectedStop?.id ?? null}
          onStopSelect={setSelectedStop}
          onUserLocation={setUserLocation}
          userLocation={userLocation}
        />
      </div>
      <div className={styles.side}>
        <SidePanel
          routeId={activeRoute}
          stops={filteredStops}
          selectedStop={selectedStop}
          onSelect={setSelectedStop}
          sourceNote={sourceNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          userLocation={userLocation}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
      <div className={styles.mobile}>
        <BottomSheet
          routeId={activeRoute}
          stops={filteredStops}
          selectedStop={selectedStop}
          activeCategory={activeCategory}
          onStopSelect={setSelectedStop}
          onCategoryChange={cat => setActiveCategory(cat ?? 'all')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          userLocation={userLocation}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </div>
  </div>
)
```

- [ ] **Step 8: Update `src/app/map/page.tsx` to parse `?route=` URL param**

Read the current content of `src/app/map/page.tsx` first. Then update it to:

```tsx
import MapPage from './MapPage'
import type { RouteId } from '@/lib/routes'

const VALID_ROUTES: RouteId[] = ['cityview', 'cityview-night', 'islandview']

export default function MapRoute({
  searchParams,
}: {
  searchParams: { route?: string; stop?: string }
}) {
  const routeId: RouteId = VALID_ROUTES.includes(searchParams.route as RouteId)
    ? (searchParams.route as RouteId)
    : 'cityview'
  return <MapPage initialRouteId={routeId} initialStopId={searchParams.stop} />
}
```

- [ ] **Step 9: Type-check**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep "MapPage\|page.tsx" | head -20
```

- [ ] **Step 10: Commit**

```bash
git add src/app/map/MapPage.tsx src/app/map/page.tsx
git commit -m "feat: MapPage — routeId state, RouteTab, route-aware filteredStops"
```

---

## Task 8: Update MapCanvas.tsx to be route-aware

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

`addMapLayers` needs `routeId` + `routeColor` params. A new `clearMapLayers` function removes sources/layers before re-adding for a different route. When `routeId` changes, the map re-layers and flies to the route's center.

- [ ] **Step 1: Update imports**

Replace:
```typescript
import { getAllStops, getStopsGeoJSON, getNearestStop, ROUTE_COORDINATES, type BusStop } from '@/lib/stops'
```

With:
```typescript
import {
  getStopsForRoute, getStopsGeoJSON, getRouteCoordinates, getRoute,
  getNearestStop, type RouteStop, type RouteId,
} from '@/lib/routes'
```

- [ ] **Step 2: Update `MapCanvasProps`**

```typescript
export interface MapCanvasProps {
  routeId: RouteId
  selectedStopId: string | null
  onStopSelect: (stop: RouteStop) => void
  onUserLocation?: (coords: [number, number]) => void
  userLocation?: [number, number] | null
}
```

- [ ] **Step 3: Update `addMapLayers` signature and body**

```typescript
function addMapLayers(map: mapboxgl.Map, selectedId: string | null, routeId: RouteId) {
  const stops = getStopsForRoute(routeId)
  const geojson = getStopsGeoJSON(stops)
  const routeCoords = getRouteCoordinates(routeId)
  const routeColor = getRoute(routeId).color

  if (!map.getSource('route')) {
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: routeCoords },
        properties: {},
      },
    })
  }
  if (!map.getLayer('route-line')) {
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': routeColor,
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.7,
      },
    })
  }

  if (!map.getSource('stops')) {
    map.addSource('stops', { type: 'geojson', data: geojson })
  }

  if (!map.getLayer('stops-circle')) {
    map.addLayer({
      id: 'stops-circle',
      type: 'circle',
      source: 'stops',
      paint: {
        'circle-radius': ['case', ['get', 'googleMapsError'], 10, 8] as unknown as number,
        'circle-color': [
          'case',
          ['==', ['get', 'id'], selectedId ?? ''], routeColor,
          ['get', 'googleMapsError'], '#C87A3A',
          '#1E3A4F',
        ] as unknown as string,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    })
  }

  if (!map.getLayer('stops-label')) {
    map.addLayer({
      id: 'stops-label',
      type: 'symbol',
      source: 'stops',
      layout: {
        'text-field': ['to-string', ['get', 'number']] as unknown as string,
        'text-size': 10,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#ffffff' },
    })
  }
}
```

- [ ] **Step 4: Add `clearMapLayers` function (add before `addMapLayers`)**

```typescript
function clearMapLayers(map: mapboxgl.Map) {
  if (map.getLayer('stops-label')) map.removeLayer('stops-label')
  if (map.getLayer('stops-circle')) map.removeLayer('stops-circle')
  if (map.getLayer('route-line')) map.removeLayer('route-line')
  if (map.getSource('stops')) map.removeSource('stops')
  if (map.getSource('route')) map.removeSource('route')
}
```

- [ ] **Step 5: Update the component function signature and add routeId ref**

```typescript
export default function MapCanvas({ routeId, selectedStopId, onStopSelect, onUserLocation, userLocation }: MapCanvasProps) {
  // ... existing refs ...
  const routeIdRef = useRef<RouteId>(routeId)

  useEffect(() => { routeIdRef.current = routeId }, [routeId])
```

- [ ] **Step 6: Update existing `useEffect` for map init**

In the `geolocate.on('geolocate', ...)` callback, change:
```typescript
// OLD
const nearest = getNearestStop(latitude, longitude)
// NEW
const nearest = getNearestStop(routeIdRef.current, latitude, longitude)
```

In `map.on('load', ...)`, change `addMapLayers(map, selectedStopIdRef.current)` to `addMapLayers(map, selectedStopIdRef.current, routeIdRef.current)`.

In `map.on('style.load', ...)`, change to `addMapLayers(map, selectedStopIdRef.current, routeIdRef.current)`.

- [ ] **Step 7: Add `useEffect` for routeId changes (add after the map init `useEffect`)**

```typescript
useEffect(() => {
  const map = mapRef.current
  if (!map || !map.isStyleLoaded()) return
  clearMapLayers(map)
  addMapLayers(map, selectedStopIdRef.current, routeId)
  const meta = getRoute(routeId)
  map.flyTo({ center: meta.center, zoom: meta.zoom, duration: 800 })
}, [routeId])
```

- [ ] **Step 8: Update `handleStopClick`**

```typescript
const handleStopClick = useCallback((stopId: string) => {
  const stop = getStopsForRoute(routeIdRef.current).find(s => s.id === stopId)
  if (stop) onStopSelect(stop)
}, [onStopSelect])
```

- [ ] **Step 9: Update the `selectedStopId` change `useEffect` (circle color update)**

Find the `useEffect` that updates the stops-circle color when `selectedStopId` changes. It likely calls `map.setPaintProperty`. Keep it as-is — it already uses `selectedStopId`.

- [ ] **Step 10: Type-check**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep "MapCanvas" | head -20
```

Expected: 0 errors from MapCanvas

- [ ] **Step 11: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: MapCanvas — routeId prop, route-aware layers, clearMapLayers, flyTo on route change"
```

---

## Task 9: Thread routeId through SidePanel → StopDetail → QRModal and BottomSheet

**Files:**
- Modify: `src/components/map/SidePanel.tsx`
- Modify: `src/components/map/BottomSheet.tsx`
- Modify: `src/components/map/StopDetail.tsx`
- Modify: `src/components/map/QRModal.tsx`

- [ ] **Step 1: Read the current `SidePanel.tsx` to find the Props interface**

Look for `interface Props` or `interface SidePanelProps`. Add `routeId: RouteId` to it.

Change import from `@/lib/stops` to include `RouteId`:
```typescript
import type { RouteId } from '@/lib/routes'
```

Pass `routeId` through to `StopDetail` wherever it's rendered:
```tsx
<StopDetail stop={selectedStop} routeId={routeId} ... />
```

- [ ] **Step 2: Read the current `BottomSheet.tsx` to find its Props interface**

Same pattern as SidePanel — add `routeId: RouteId` to Props and pass to StopDetail.

- [ ] **Step 3: Read the current `StopDetail.tsx` to find its Props interface**

Add `routeId: RouteId` to Props. Pass `routeId` to `QRModal` wherever it's rendered:
```tsx
<QRModal stop={stop} routeId={routeId} onClose={...} />
```

Change the import to include `RouteId`:
```typescript
import type { RouteId } from '@/lib/routes'
```

Replace `type { BusStop }` import from stops with `type { RouteStop as BusStop }` — OR, since stops.ts shim re-exports BusStop, keep the stops import for BusStop.

- [ ] **Step 4: Update `QRModal.tsx`**

Add `routeId: RouteId` to the Props interface:
```typescript
import type { RouteId } from '@/lib/routes'

interface Props {
  stop: BusStop
  routeId: RouteId
  onClose: () => void
}
```

Update the URL:
```typescript
// OLD
const url = `${BASE_URL}/map?stop=${stop.id}`
// NEW
const url = `${BASE_URL}/map?route=${routeId}&stop=${stop.id}`
```

- [ ] **Step 5: Type-check and fix all remaining errors**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep -v "^$"
```

Fix any remaining errors. Common issues:
- `stop` type might be `BusStop` in some places and `RouteStop` in others — they're the same type (shim re-exports RouteStop as BusStop), so either import works
- If SidePanel or BottomSheet use `type BusStop` from stops, that's fine — the shim re-exports it

- [ ] **Step 6: Commit**

```bash
git add src/components/map/SidePanel.tsx src/components/map/BottomSheet.tsx src/components/map/StopDetail.tsx src/components/map/QRModal.tsx
git commit -m "feat: thread routeId through SidePanel/BottomSheet → StopDetail → QRModal; update QR URL to include route param"
```

---

## Task 10: Delete src/data/stops.json

**Files:**
- Delete: `src/data/stops.json`

Now that `stops.ts` imports from `routes/cityview.json`, the original `stops.json` is unused.

- [ ] **Step 1: Verify nothing imports stops.json directly**

```bash
grep -r "from.*data/stops" /Users/sondong-gyu/IdeaProjects/kagoshima-cityview/src --include="*.ts" --include="*.tsx"
grep -r "require.*data/stops" /Users/sondong-gyu/IdeaProjects/kagoshima-cityview/src --include="*.ts" --include="*.tsx"
```

Expected: no results (only `routes/cityview.json` is referenced)

- [ ] **Step 2: Delete the file**

```bash
git rm src/data/stops.json
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npx tsc --noEmit 2>&1 | grep -v "^$"
```

Expected: 0 errors

- [ ] **Step 4: Start dev server and verify**

```bash
cd /Users/sondong-gyu/IdeaProjects/kagoshima-cityview && npm run dev
```

Open http://localhost:3000/map — verify:
- All 20 City View stops appear on map
- Route polyline follows the correct path
- Route tabs show: 🚌 시티뷰 | 🌙 야경 코스 | 🌋 아일랜드뷰
- Clicking 아일랜드뷰 tab re-centers map on Sakurajima and shows 12 stops
- Clicking a stop opens StopDetail; QR modal URL is `?route=cityview&stop=stop_01`
- `/map?stop=stop_01` (no route param) still works → defaults to cityview

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: delete stops.json — routes/cityview.json is now the only source"
```

---

## Task 11: Update docs

**Files:**
- Modify: `docs/data-update-guide.md`
- Modify: `docs/issues.md`

- [ ] **Step 1: Add multi-route data structure section to `docs/data-update-guide.md`**

Add this section at the top, before the existing "City View 좌표 업데이트" section:

```markdown
## 파일 구조 (2026-06 리팩터 이후)

좌표·시간표 데이터는 `src/data/routes/` 에 노선별로 분리됩니다.

| 파일 | 노선 | 좌표 출처 | 시간표 출처 |
|---|---|---|---|
| `routes/cityview.json` | 카고시마 시티뷰 | kotsu-city-kagoshima.jp rosenId=1680 | bus_list.php?rosenId=1680 |
| `routes/cityview-night.json` | 야경 코스 | cityview.json 파생 | 공식 사이트 (미확보) |
| `routes/islandview.json` | 사쿠라지마 아일랜드뷰 | **근사치** — 별도 rosenId 추출 필요 | PDF 기반 |

좌표 업데이트 시 `src/data/routes/{routeId}.json` 수정 → `lib/routes.ts`의 `getRouteCoordinates()`에 자동 반영 (ISS-001 패턴 준수).

### Island View 좌표 추출 방법

1. `https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php` 접속
2. サクラジマアイランドビュー 선택 → URL의 `rosenId=XXXX` 기록
3. `https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=XXXX` 접속
4. 브라우저 콘솔에서:
   ```js
   const data = JSON.parse(bus_json)
   const rosenId = Object.keys(data)[0]
   console.log(JSON.stringify(data[rosenId].map(s => ({
     number: s.num, name: s.bus, lat: s.ido, lng: s.keido
   })), null, 2))
   ```
5. 출력된 좌표로 `islandview.json` 각 정류장의 `lat`/`lng` 업데이트, `"coordinatesApproximate": true` → `false` 변경
```

- [ ] **Step 2: Add ISS-002 preventive note to `docs/issues.md`**

Add after ISS-001:

```markdown
## ISS-002 · 예방적 기록 — 다중 노선 도입 시 주의사항

**상태:** 예방 (2026-06-07 리팩터에서 발생 방지)
**기록일:** 2026-06-07

### 규칙

1. **신규 노선 추가 시:** `src/data/routes/{routeId}.json` 생성 **+** `src/lib/routes.ts`의 `rawRoutes` 및 `RouteId` 유니온 타입에 동시 등록. 한 곳만 업데이트하면 런타임 에러.
2. **islandview.json 좌표:** `"coordinatesApproximate": true` 정류장은 현장 검증 전. 지도에 시각적 경고 표시를 추가할 것.
3. **정류장 ID 충돌 방지:** 노선별 prefix 사용 — City View: `stop_`, Night View: `cn_`, Island View: `iv_`. prefix 없이 추가하면 favorites 및 QR 링크 충돌.
4. **URL backward compat:** `/map?stop=X` (route 없음) → cityview 기본값. QR 코드를 재인쇄하기 전까지 기존 코드 유효.

### 체크리스트 (신규 노선 추가 시)

- [ ] `src/data/routes/{routeId}.json` 생성
- [ ] `RouteId` 타입 유니온에 추가
- [ ] `rawRoutes` 맵에 import + 등록
- [ ] `ROUTE_ORDER` 배열에 추가
- [ ] `RouteTab` 아이콘 등록 (`ROUTE_ICONS`)
- [ ] i18n 3개 파일에 `routes.{routeId}.name` 추가
- [ ] `npx tsc --noEmit` 확인
```

- [ ] **Step 3: Commit**

```bash
git add docs/data-update-guide.md docs/issues.md
git commit -m "docs: update data-update-guide and issues.md for multi-route architecture"
```

---

## 자가 검토 (Self-Review)

**스펙 커버리지:**

| 요구사항 | 구현 위치 |
|---|---|
| stops.json → routes/cityview.json 마이그레이션 | Task 1 |
| islandview.json 12개 정류장 구조 | Task 3 |
| cityview-night.json 7개 정류장 | Task 2 |
| lib/routes.ts 다중 노선 타입/함수 | Task 4 |
| stops.ts 하위 호환 shim | Task 5 |
| RouteTab 컴포넌트 | Task 6 |
| MapPage routeId 상태 | Task 7 |
| MapCanvas routeId prop + route-aware 레이어 | Task 8 |
| URL ?route= 파라미터 (backward compat) | Task 7, Step 8 |
| QRModal URL route param 포함 | Task 9 |
| i18n 노선명 | Task 6 |
| stop_16 ferry connection | Task 1 |
| iv_stop_01 reverse ferry connection | Task 3 |
| coordinatesApproximate 필드 | Tasks 2, 3 |
| isRouteAvailableToday (야경 토요일 판단) | Task 4 |
| flyTo on route change | Task 8, Step 7 |
| docs 업데이트 | Task 11 |

**플레이스홀더 없음:**
- `islandview.json` 좌표: 근사치이며 `"coordinatesApproximate": true` 명시 ✓ (data entry 방법도 포함)
- `cityview-night.json` 출발 시각: 빈 배열 + `scheduleNote` 명시 ✓ (공식 사이트 안내)
- 모든 코드 블록: 실제 구현 가능한 완성 코드 ✓

**타입 일관성:**
- `RouteId = 'cityview' | 'cityview-night' | 'islandview'` — Tasks 4~9 전체에서 동일 ✓
- `RouteStop` (routes.ts) = `BusStop` (stops.ts shim re-export) — Task 9에서 혼용 허용 ✓
- `MapCanvasProps.onStopSelect: (stop: RouteStop) => void` — MapPage의 `setSelectedStop: (stop: RouteStop | null) => void`와 일치 ✓
- `addMapLayers(map, selectedId, routeId)` — Task 8 Step 3 정의, Steps 6·7에서 사용 ✓
