# 노선 데이터 정기 업데이트 가이드

가고시마 시 교통국 공식 웹사이트에서 좌표·시간표 데이터를 추출해 각 노선 JSON 파일을 갱신하는 절차.

**업데이트 주기 권장:** 연 1회 (매년 4월 다이어 개정 직후) + 공식 발표 시 수시

---

## 데이터 파일 구조 (2026-06-07 기준)

| 노선 | 파일 | 좌표 | 시간표 |
|---|---|---|---|
| 시티뷰 (City View) | `src/data/routes/cityview.json` | GPS 확인 완료 | 완료 (19편) |
| 야경 코스 (Night View) | `src/data/routes/cityview-night.json` | 대략 위치 (6/7 stops) | 미확인 (`departures: []`) |
| 아일랜드뷰 (Island View) | `src/data/routes/islandview.json` | 대략 위치 (전 정류장) | 완료 (15편) |

> **중요 (ISS-001):** 정류장 좌표는 각 노선 JSON 파일이 유일한 진실의 원천. TypeScript 파일에 좌표를 하드코딩하지 않는다.

---

## 1. 시티뷰 — 좌표 업데이트

**소스 URL:**
```
https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1680
```

### 추출 방법 (브라우저 콘솔)

1. 위 URL을 Chrome/Firefox에서 열기
2. 개발자도구 열기 (`F12` → Console 탭)
3. 아래 명령 실행:

```js
const stops = JSON.parse(bus_json)['1680']
console.table(stops.map(s => ({
  num: s.num,
  id: s.id,
  name: s.bus,
  lat: s.ido,
  lng: s.keido
})))
```

### 반환 필드 매핑

| bus_json 필드 | cityview.json 필드 | 설명 |
|---|---|---|
| `num` | `number` | 정류장 순번 (1~20) |
| `id` | (참고용) | 교통국 내부 ID |
| `bus` | `name.ja` | 공식 일본어 정류장명 |
| `ido` | `lat` | 위도 |
| `keido` | `lng` | 경도 |

> stop_20(순환 종점)은 stop_01과 동일 좌표 (`id: 531` 중복 확인).

업데이트 후 `coordinatesApproximate` 필드를 제거하고 `metadata.lastValidatedAt` 을 갱신한다.

---

## 2. 야경 코스 — 좌표 업데이트

**현황:** `cn_stop_04` (市役所前) 외 6개 정류장이 시티뷰 인접 정류장 좌표를 사용 중 (`coordinatesApproximate: true`).

**공식 소스:** rosenId=**1660** (확인 완료 2026-06-07)

```
https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1660
```

**추출 방법 (브라우저 콘솔):**

```js
const stops = JSON.parse(bus_json)['1660']
console.table(stops.map(s => ({
  num: s.num,
  id: s.id,
  name: s.bus,
  lat: s.ido,
  lng: s.keido
})))
```

업데이트 시:
1. 각 정류장 `lat`, `lng` 수정
2. `coordinatesApproximate: true` 필드 제거
3. `metadata.coordinatesApproximate: false` (또는 필드 제거)
4. `metadata.lastValidatedAt` 갱신

---

## 3. 아일랜드뷰 — 좌표 업데이트

**현황:** 전 정류장 `coordinatesApproximate: true`. 시간표·요금·메타데이터는 공식 PDF와 일치 확인 완료.

**rosenId 현황 (2026-06-07 조사):** 교통국 표준 버스 노선 목록(syubetuId=0)에 아일랜드뷰가 없음.
사쿠라지마 섬 내 순환 운행이라 별도 시스템일 가능성 있음.

rosenId 확인 방법 (브라우저에서 직접):
1. `https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1680` 열기
2. DevTools Console에서 `Object.keys(JSON.parse(bus_json))` 실행
3. 반환된 ID 목록에서 1660·1680 외 미지의 ID 중 아일랜드뷰 해당 ID 찾기

```js
// rosenId 전체 목록 확인
Object.keys(JSON.parse(bus_json))
// 예시 결과: ["1660", "1680", "XXXX", ...]  ← XXXX가 아일랜드뷰 rosenId
```

업데이트 시 `src/data/routes/islandview.json`:
- 각 정류장 `lat`, `lng` 수정
- `coordinatesApproximate: true` 필드 제거
- `metadata.coordinatesApproximate: false` (또는 필드 제거)
- `metadata.coordinateSource` 갱신

---

## 4. 시티뷰 — 시간표 업데이트

**소스 URL:**
```
https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php?rosenId=1680&syubetuId=0
```

### 추출 방법 (브라우저 콘솔)

```js
// 시간표 변수명 확인
Object.getOwnPropertyNames(window).filter(k =>
  typeof window[k] === 'string' && window[k].length > 200
)

// 변수명이 jikoku_json인 경우
const timetable = JSON.parse(jikoku_json)
console.log(JSON.stringify(timetable, null, 2))
```

### 현재 시간표 요약 (2026년 6월 기준)

- 총 19편 운행
- 첫차: 가고시마 중앙역 **08:30**
- 막차: 가고시마 중앙역 **17:30**
- 배차 간격: **30분**

---

## 5. 야경 코스 — 시간표 업데이트

**현황:** `departures: []` (출발 시각 미확인)

공식 소스에서 시간표 확인 후 각 정류장 `schedule.departures` 배열에 `"HH:MM"` 형식으로 추가.

---

## 6. 업데이트 절차 (전 노선 공통)

```
1. 해당 노선 JSON 파일 편집 (src/data/routes/<routeId>.json)
   - metadata.lastUpdatedAt 갱신 (YYYY-MM-DD)
   - metadata.sourceVersion 갱신 (YYYY-MM)
   - 변경된 정류장 lat/lng/name 수정
   - coordinatesApproximate 필드 업데이트
2. npm run dev 로컬 확인
3. git commit -m "fix: update <routeId> data YYYY-MM"
4. Vercel 배포 (push)
```

---

## 7. 확인 체크리스트

업데이트 후 로컬(`npm run dev`)에서 반드시 확인:

**시티뷰:**
- [ ] 20개 마커가 실제 도로 위에 찍히는지
- [ ] stop_01 / stop_20이 동일 위치(가고시마 중앙역)인지
- [ ] stop_03(텐몬칸 센간엔방면) / stop_19(텐몬칸 중앙역방면)이 약 20m 간격 분리
- [ ] 시간표 첫/막 편이 공식 PDF와 일치

**야경 코스:**
- [ ] 7개 마커 위치가 실제 야경 코스 정류장과 일치
- [ ] `coordinatesApproximate` 표시가 UI에 반영되는지

**아일랜드뷰:**
- [ ] 12개 마커가 사쿠라지마 실제 위치에 찍히는지
- [ ] A/B 코스 분기 정류장(iv_stop_07~09)이 올바른 위치에 찍히는지

---

## 8. 이력

| 날짜 | 내용 | 담당 |
|---|---|---|
| 2026-06-07 | 최초 공식 데이터 반영. bus_json 콘솔 추출로 시티뷰 좌표 전면 교체, PDF 시간표(19편) 반영 | 손동규 |
| 2026-06-07 | 다중 노선 아키텍처 도입. stops.json → routes/cityview.json 마이그레이션. cityview-night.json, islandview.json 초안 생성 | Claude |
