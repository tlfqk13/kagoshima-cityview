# 노선 데이터 정기 업데이트 가이드

가고시마 시 교통국 공식 웹사이트에서 좌표·시간표 데이터를 추출해 각 노선 JSON 파일을 갱신하는 절차.

**업데이트 주기 권장:** 연 1회 (매년 4월 다이어 개정 직후) + 공식 발표 시 수시

---

## 데이터 파일 구조 (2026-06-07 기준)

| 노선 | 파일 | 좌표 | 시간표 |
|---|---|---|---|
| 시티뷰 (City View) | `src/data/routes/cityview.json` | GPS 확인 완료 (20/20) | 완료 (19편) |
| 야경 코스 (Night View) | `src/data/routes/cityview-night.json` | GPS 확인 완료 (7/7) | 미확인 (`departures: []`) |
| 아일랜드뷰 (Island View) | `src/data/routes/islandview.json` | 7확인 / 5근사치 | 완료 (15편) |

> **중요 (ISS-001):** 정류장 좌표는 각 노선 JSON 파일이 유일한 진실의 원천. TypeScript 파일에 좌표를 하드코딩하지 않는다.

---

## 배경: 두 가지 데이터 소스

교통국 웹사이트에는 **두 종류의 API**가 있다. 노선마다 작동하는 방식이 다르므로 반드시 구분해서 사용한다.

| 소스 | URL | 데이터 형태 | 작동 노선 |
|---|---|---|---|
| `bus_json` 변수 | `line_rosen_map.php?rosenId=XXXX` | 페이지 내 전역변수 | 시티뷰(1680) |
| `strEnd.php` API | `/wp/timesearch/strEnd.php?rosen_id=XXXX&...` | JSON REST 응답 | 시티뷰(1680), 야경(1660) |

> `bus_json` 변수는 `line_rosen_map.php`에서만 존재한다. 야경코스 URL에서 `bus_json`을 참조하면 `ReferenceError: bus_json is not defined`가 발생한다. **야경코스는 반드시 strEnd.php 방식을 사용할 것.**

---

## 1. 시티뷰 — 좌표 업데이트

### 소스

```
https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1680
```

### 추출 방법 A: bus_json 변수 (이 페이지에서만 작동)

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

### 추출 방법 B: strEnd.php API (어느 페이지에서도 작동)

```js
fetch('/wp/timesearch/strEnd.php?rosen_id=1680&str_id=&end_id=&kubun=&color=')
  .then(r => r.json())
  .then(data => {
    console.table(data.map(s => ({
      num: s.num,
      id: s.id,
      name: s.bus,
      lat: s.ido,
      lng: s.keido
    })))
  })
```

> **주의:** strEnd.php는 반드시 교통국 사이트 도메인에서 실행해야 한다 (CORS). `line_rosen_map.php` 페이지를 열고 콘솔에서 실행할 것.

### 반환 필드 매핑

| 응답 필드 | cityview.json 필드 | 설명 |
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

### 중요: bus_json 방식은 야경코스에서 작동하지 않는다

야경코스 전용 시간표 페이지(`timesearch` 계열)에서는 `bus_json` 전역변수가 존재하지 않는다.
콘솔에서 `bus_json`을 참조하면 `ReferenceError: bus_json is not defined`가 발생한다.

**반드시 strEnd.php API를 사용할 것.**

### rosenId 확인

야경코스 rosenId = **1660** (2026-06-07 확인 완료)

확인 방법: strEnd.php에 rosenId를 1씩 넣어서 응답 확인. 1660에서 야경코스 7개 정류장 데이터 반환.

```js
// rosenId 탐색 예시 (교통국 사이트 콘솔에서 실행)
for (let id = 1650; id <= 1670; id++) {
  fetch(`/wp/timesearch/strEnd.php?rosen_id=${id}&str_id=&end_id=&kubun=&color=`)
    .then(r => r.json())
    .then(data => { if (data.length > 0) console.log(id, data) })
}
```

### 추출 방법: strEnd.php API

1. `https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1680` 열기
2. 개발자도구 → Console 탭
3. 아래 명령 실행:

```js
fetch('/wp/timesearch/strEnd.php?rosen_id=1660&str_id=&end_id=&kubun=&color=')
  .then(r => r.json())
  .then(data => {
    console.table(data.map(s => ({
      num: s.num,
      id: s.id,
      name: s.bus,
      lat: s.ido,
      lng: s.keido
    })))
  })
```

### 실제 응답 예시 (2026-06-07 추출)

```
num  id   name                           lat              lng
1    557  鹿児島中央駅                    31.585083270     130.543606300
2    558  天文館（城山方面向け）           31.590341990     130.554158100
3    559  ウォーターフロントパーク         31.592684320     130.562947700
4    560  市役所前                        31.596095680     130.558143900
5    561  城山                            31.596581920     130.549174500
6    562  西郷銅像前（宝山ホール側）       31.594841050     130.554276100
7    563  天文館（鹿児島中央駅向け）       31.590136370     130.554313700
```

업데이트 시:
1. 각 정류장 `lat`, `lng` 수정
2. `coordinatesApproximate: true` 필드 제거
3. `metadata.coordinateSource` 갱신 (예: `"kotsu-city-kagoshima.jp strEnd.php API (rosenId=1660) — extracted YYYY-MM-DD"`)
4. `metadata.lastValidatedAt` 갱신

---

## 3. 아일랜드뷰 — 좌표 업데이트

### 현황 (2026-06-07)

strEnd.php API가 아일랜드뷰를 지원하지 않는다. rosenId 1~5000 전수 스캔 결과:

| rosenId | 노선명 | 비고 |
|---|---|---|
| 1400 | 東白浜 | 사쿠라지마 정기 버스 |
| 1660 | 야경코스 | ✅ |
| 1680 | 시티뷰 | ✅ |
| 1820, 1840, 1860 | 시내 트램 | — |

아일랜드뷰는 섬 내 순환 운행이라 별도 시스템으로 추정.

### 대체 방법: OpenStreetMap

아일랜드뷰 정류장은 OpenStreetMap Nominatim/Overpass API로 좌표 확인.

**Nominatim 검색:**
```
https://nominatim.openstreetmap.org/search?q=レインボー桜島&countrycodes=jp&format=json&limit=3
```

**Overpass API (버스 정류장 검색):**
```js
// 사쿠라지마 섬 범위 내 bus_stop 검색
// bounding box: 31.55,130.57,31.68,130.65
fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(`
[out:json];
node["highway"="bus_stop"](31.55,130.57,31.68,130.65);
out body;
`))
  .then(r => r.json())
  .then(d => d.elements.forEach(e => console.log(e.tags?.name, e.lat, e.lon)))
```

### 확인된 OSM 좌표 (2026-06-07)

| 정류장 | lat | lng | 상태 |
|---|---|---|---|
| iv_stop_01 桜島港 | 31.594100 | 130.598200 | ✅ Nominatim |
| iv_stop_03 レインボー桜島 | 31.591168 | 130.595872 | ✅ Overpass |
| iv_stop_04 ビジターセンター | 31.590824 | 130.594186 | ✅ Nominatim |
| iv_stop_05 烏島展望所 | 31.581775 | 130.601150 | ✅ Nominatim |
| iv_stop_06 赤水展望広場 | 31.576852 | 130.603097 | ✅ Nominatim |
| iv_stop_08 国際火山砂防センター | 31.566601 | 130.617464 | ✅ Overpass |
| iv_stop_11 湯之平展望所 | 31.591489 | 130.629977 | ✅ Nominatim |
| iv_stop_02 火の島めぐみ館 | 31.593500 | 130.597300 | ⚠ 추정치 |
| iv_stop_07 赤水麓 (B) | 31.572600 | 130.610000 | ⚠ 추정치 |
| iv_stop_09 赤水麓 return (B) | 31.572600 | 130.610000 | ⚠ 추정치 |
| iv_stop_10 赤水湯之平口 | 31.575600 | 130.615000 | ⚠ 추정치 |
| iv_stop_12 桜洲小学校前 | 31.617000 | 130.621000 | ⚠ 추정치 |

추정치 5개는 현장 방문 또는 가고시마 관광안내소 공식 PDF 확인 후 갱신 필요.

---

## 4. 시티뷰 — 시간표 업데이트

### 소스 URL

```
https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php?rosenId=1680&syubetuId=0
```

### 추출 방법

1. 위 URL을 열기
2. 개발자도구 → Console 탭
3. 시간표 변수명 확인:

```js
// 큰 문자열 전역변수 목록 확인
Object.getOwnPropertyNames(window).filter(k =>
  typeof window[k] === 'string' && window[k].length > 200
)
// 결과 예: ["jikoku_json"] 또는 다른 변수명
```

4. 변수명이 `jikoku_json`인 경우:

```js
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

### 현황

`departures: []` 상태. 야경코스는 토요일만 운행하며 시간표가 계절별로 변동 가능성 있음.

현재 StopDetail에는 operatingNote ("공식 사이트에서 시각 확인")가 표시되고 있음.

### 확인 방법

1. 교통국 공식 사이트: `https://www.kotsu-city-kagoshima.jp/sakurajima-tabi/`
2. 출발 시각 수기 확인 후 `cityview-night.json` 각 정류장 `schedule.departures` 배열에 추가

```json
"departures": ["19:30", "20:30"]
```

> strEnd.php는 좌표만 반환하며 시간표 데이터를 포함하지 않는다.

---

## 6. 업데이트 절차 (전 노선 공통)

```
1. 해당 노선 JSON 파일 편집 (src/data/routes/<routeId>.json)
   - metadata.lastUpdatedAt 갱신 (YYYY-MM-DD)
   - metadata.sourceVersion 갱신 (YYYY-MM)
   - 변경된 정류장 lat/lng/name 수정
   - coordinatesApproximate 필드 업데이트
   - metadata.coordinateSource 갱신
2. node node_modules/.bin/next build  ← npm run build 대신 직접 실행
3. git commit -m "fix: update <routeId> data YYYY-MM"
4. git push origin main
```

> **빌드 실행 방법:** `npm run build`가 환경에 따라 `sh` 바이너리를 못 찾는 경우 `node node_modules/.bin/next build` 직접 실행.

---

## 7. 확인 체크리스트

업데이트 후 로컬(`node node_modules/.bin/next dev`)에서 반드시 확인:

**시티뷰:**
- [ ] 20개 마커가 실제 도로 위에 찍히는지
- [ ] stop_01 / stop_20이 동일 위치(가고시마 중앙역)인지
- [ ] stop_03(텐몬칸 센간엔방면) / stop_19(텐몬칸 중앙역방면)이 약 20m 간격 분리
- [ ] 시간표 첫/막 편이 공식 PDF와 일치

**야경 코스:**
- [ ] 7개 마커 위치가 실제 야경 코스 정류장과 일치
- [ ] `coordinatesApproximate` 표시가 UI에 반영되는지

**아일랜드뷰:**
- [ ] 12개 마커가 사쿠라지마 실제 위치에 찍히는지 (31.56~31.64°N 범위)
- [ ] A/B 코스 분기 정류장(iv_stop_07~09)이 올바른 위치에 찍히는지
- [ ] 근사치 정류장(5개)에 orange stroke + 점선 배지 표시 확인

---

## 8. 이력

| 날짜 | 내용 | 담당 |
|---|---|---|
| 2026-06-07 | 최초 공식 데이터 반영. bus_json 콘솔 추출로 시티뷰 좌표 전면 교체, PDF 시간표(19편) 반영 | 손동규 |
| 2026-06-07 | 다중 노선 아키텍처 도입. stops.json → routes/cityview.json 마이그레이션. cityview-night.json, islandview.json 초안 생성 | Claude |
| 2026-06-07 | strEnd.php API로 야경코스(rosenId=1660) 전 정류장 좌표 교체. bus_json이 야경코스 페이지에서 미정의임을 확인. rosenId 1~5000 스캔으로 아일랜드뷰 미지원 확인 | Claude |
| 2026-06-07 | OSM Nominatim/Overpass로 아일랜드뷰 7개 정류장 좌표 확인. 5개는 추정치 유지 | Claude |
