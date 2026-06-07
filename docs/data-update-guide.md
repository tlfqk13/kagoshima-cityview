# stops.json 정기 업데이트 가이드

가고시마 시 교통국 공식 웹사이트에서 좌표·시간표 데이터를 추출해 `src/data/stops.json`을 갱신하는 절차.

**업데이트 주기 권장:** 연 1회 (매년 4월 다이어 개정 직후) + 공식 발표 시 수시

---

## 1. 좌표 업데이트 (GPS 정류장 위치)

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

| bus_json 필드 | stops.json 필드 | 설명 |
|---|---|---|
| `num` | `number` | 정류장 순번 (1~20) |
| `id` | (참고용) | 교통국 내부 ID |
| `bus` | `name.ja` | 공식 일본어 정류장명 |
| `ido` | `lat` | 위도 |
| `keido` | `lng` | 경도 |

> stop_20(순환 종점)은 stop_01과 동일 좌표 (`id: 531` 중복 확인).

---

## 2. 시간표 업데이트

**소스 URL:**
```
https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php?rosenId=1680&syubetuId=0
```

### 추출 방법 (브라우저 콘솔)

1. 위 URL을 Chrome/Firefox에서 열기
2. 개발자도구 → Console 탭
3. 아래 명령으로 페이지 내 JavaScript 변수 탐색:

```js
// 시간표 변수명 확인 (페이지마다 다를 수 있음)
Object.getOwnPropertyNames(window).filter(k =>
  typeof window[k] === 'string' && window[k].length > 200
)
```

4. 발견된 변수명(예: `jikoku_json`)으로 파싱:

```js
// 변수명이 jikoku_json인 경우
const timetable = JSON.parse(jikoku_json)
console.log(JSON.stringify(timetable, null, 2))
```

5. 콘솔 변수 추출이 안 될 경우: 페이지 시간표 테이블을 직접 읽거나, 교통국에서 제공하는 PDF 사용.

### 현재 시간표 요약 (2026년 6월 기준)

- 총 19편 운행
- 첫차: 가고시마 중앙역 **08:30**
- 막차: 가고시마 중앙역 **17:30** (중앙역 순환 도착 **18:50**)
- 배차 간격: **30분**

### stops.json schedule 필드 구조

```json
"schedule": {
  "departures": ["HH:MM", "HH:MM", ...],
  "operatingNote": {
    "ko": "...",
    "en": "...",
    "ja": "..."
  }
}
```

`departures` 배열: 해당 정류장 통과 시각 19개 (실제 PDF 기준값 사용).

---

## 3. stops.json 업데이트 절차

```
1. 좌표 추출 (콘솔 → JSON 복사)
2. 시간표 확인 (콘솔 또는 PDF)
3. src/data/stops.json 편집
   - metadata.lastUpdatedAt 갱신 (YYYY-MM-DD)
   - metadata.sourceVersion 갱신 (YYYY-MM)
   - 변경된 정류장만 lat/lng/name 수정
   - 변경된 편만 departures 배열 수정
4. npm run dev 로컬 확인 (지도 마커 위치 검증)
5. git commit -m "fix: update stops data YYYY-MM"
6. Vercel 배포 (자동 or 수동 push)
```

---

## 4. 확인 체크리스트

업데이트 후 로컬(`npm run dev`)에서 반드시 확인:

- [ ] 20개 마커가 실제 도로 위에 찍히는지 확인
- [ ] stop_01과 stop_20이 동일 위치(가고시마 중앙역)인지 확인
- [ ] stop_03(텐몬칸 센간엔방면)과 stop_19(텐몬칸 중앙역방면)이 약 20m 간격으로 분리되는지 확인
- [ ] 정류장 클릭 시 시간표 첫 편/막 편이 PDF와 일치하는지 확인

---

## 5. 이력

| 날짜 | 내용 | 담당 |
|---|---|---|
| 2026-06-07 | 최초 공식 데이터 반영. bus_json 콘솔 추출로 좌표 전면 교체, PDF 시간표(19편) 반영 | 손동규 |
