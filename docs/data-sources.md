# 데이터 출처 및 검증

> 이 문서는 `src/data/routes/*.json`에 수록된 정류장 좌표가 **어디서 왔는지(출처)** 와
> **얼마나 신뢰할 수 있는지(검증 상태)** 를 설명한다.
> 마지막 개정: 2026-07-18 — 다중 노선 구조(`routes/*.json`) 기준으로 전면 개정.

## 노선별 출처 요약

| 노선 | 데이터 파일 | 좌표 출처 | 시간표 출처 | 좌표 신뢰도 |
|------|-------------|-----------|-------------|-------------|
| 시티뷰 | `cityview.json` | 가고시마시 교통국 노선도 페이지 | 가고시마시 교통국 버스 목록 페이지 | 20개 전부 현장 실측 (2026-05-31) |
| 시티뷰 야경 | `cityview-night.json` | 교통국 `strEnd.php` API 추출 (2026-06-07) | 교통국 공식 사이트 | 현장 미검증 |
| 아일랜드뷰 | `islandview.json` | OpenStreetMap (ODbL) | 교통국 시각표 PDF | 7개 확정 / 5개 근사치 |

각 파일의 `metadata.coordinateSource` / `metadata.scheduleSource` 필드가 위 내용을 그대로 담고 있다.
데이터와 문서가 어긋나면 **JSON 파일이 진실의 원천**이다 (ISS-001).

---

## 1. 시티뷰 (`cityview.json`, 20개 정류장)

### 좌표 출처

- **1차 출처:** 가고시마시 교통국 노선 검색 페이지 (rosenId=1680)  
  `https://www.kotsu-city-kagoshima.jp/wp/timesearch/line_rosen_map.php?rosenId=1680`
- **배경:** MVP 단계에서는 가고시마시 GTFS-JP 오픈데이터의 `stops.txt`를 수동 정규화해 사용했다
  (오픈데이터 포털 `https://www.city.kagoshima.lg.jp/ict/opendata.html`, 카탈로그 3-30
  「シティビューバス・まち歩きバス」, CC BY 4.0). 2026-06 다중 노선 개편에서 교통국 노선도
  페이지 기준으로 재정렬했다.
- **시간표 출처:** `https://www.kotsu-city-kagoshima.jp/wp/timesearch/bus_list.php?rosenId=1680&syubetuId=0`

### 현장 GPS 검증 (2026-05-31)

- **검증자:** 개발자 (가고시마 현지 방문)
- **방법:** 스마트폰 GPS로 실제 정류장 위치 측정 후 데이터 좌표와 비교
- **결과:** 20개 중 19개 정류장이 허용 오차(±30m) 이내 일치
- **오류 발견:** 텐몬칸(`stop_03`) — 구글맵이 실제보다 약 200m 어긋난 위치를 표시.
  이 정류장에는 `googleMapsError: true`와 구글맵 오류 좌표(`googleMapsLat/Lng`)를 기록하고,
  지도 UI에 반투명 경고 핀으로 시각화한다. (배경: 데브로그 EP.01~02)

---

## 2. 시티뷰 야경 (`cityview-night.json`, 7개 정류장)

- **좌표 출처:** 교통국 `strEnd.php` API (rosenId=1660), 2026-06-07 추출.
- **운행일:** 매주 토요일 (8·12·1월은 금·토 양일). 정확한 출발 시각은 공식 사이트 확인이 필요해
  정류장별 시각 대신 `metadata.scheduleNote`로 안내한다.
- **검증 상태:** 현장 미검증. 공식 데이터 기반 좌표이나 실측 대조는 아직 없다.
- **알려진 과제:** `metadata.scheduleSource`가 현재 사쿠라지마 안내 페이지
  (`/sakurajima-tabi/`)를 가리키고 있어, 다음 데이터 갱신 때 야경 코스 전용 페이지로
  확인·교체가 필요하다.

---

## 3. 아일랜드뷰 (`islandview.json`, 12개 정류장)

- **좌표 출처:** OpenStreetMap Nominatim/Overpass (`strEnd.php`가 이 노선을 제공하지 않음).
  - 확정 7개: stops 1, 3, 4, 5, 6, 8, 11
  - 근사치 5개: stops 2, 7, 9, 10, 12 — 각 정류장에 `coordinatesApproximate: true`,
    노선 메타데이터에도 `coordinatesApproximate: true`. UI에 "좌표 근사치(미검증)" 배지 표시.
- **시간표 출처:** 교통국 시각표 PDF (메타데이터의 `scheduleSource` 참조).
- **검증 상태:** 현장 미검증.
- **알려진 과제:** `iv_stop_07`/`iv_stop_09`가 동일 좌표(placeholder 수준), `iv_stop_12`의
  정류장명이 언어별로 어긋남 — 다음 현장 확인 시 우선 검증 대상.

---

## 라이선스 및 출처 표기

### 가고시마시 데이터 — CC BY 4.0

| 항목 | 내용 |
|------|------|
| 제공 기관 | 鹿児島市 (가고시마시) |
| 라이선스 | CC BY 4.0 (Creative Commons Attribution 4.0 International) |

준수 사항:

1. **출처 표기** — `データ提供：鹿児島市（原データより加工）` 문구를 표시한다.
   표기 위치: 전 페이지 푸터(`footer.source`), 지도 페이지 하단(`map.sourceNote`).
2. **가공 사실 고지** — 위 문구의 `（原データより加工）` 부분이 해당한다.
3. **라이선스 표기** — 푸터에 `CC BY 4.0` 명시.
4. 동일 조건(ShareAlike) 조항은 없으므로 이 서비스에 동일 라이선스를 적용할 필요는 없다.

### OpenStreetMap — ODbL

- **적용 범위:** `islandview.json` 좌표에 한함.
- **표기 의무:** `© OpenStreetMap contributors` 표기가 필요하다
  (참고: https://www.openstreetmap.org/copyright).
- **현재 상태:** 해결 (2026-07-18, ISS-002) — 아일랜드뷰 선택 시 지도 하단 출처 표기에
  `© OpenStreetMap contributors`를 병기한다 (`map.sourceNoteOsm`).

---

## 메타데이터 필드 정의

각 노선 JSON 최상위 `metadata` 객체:

| 필드 | 의미 |
|------|------|
| `sourceVersion` | 출처 데이터의 기준 시점 (예: `2026-06`) |
| `lastUpdatedAt` | 이 JSON 파일을 마지막으로 갱신한 날짜 |
| `lastFieldVerifiedAt` | 현장 GPS 실측일. 미실측 노선은 `null` |
| `lastSourceCheckedAt` | 공식 출처와 마지막으로 대조한 날 |
| `coordinateSource` | 좌표 출처 (URL 또는 추출 방법) |
| `scheduleSource` | 시간표 출처 URL |
| `coordinatesApproximate` | 노선에 근사치 좌표가 포함되면 `true` |

> **검증일 필드 분리 (2026-07-18, ISS-003):** 과거 `lastValidatedAt` 하나로 관리하던 것을
> "현장 실측일"(`lastFieldVerifiedAt`)과 "공식 데이터 대조일"(`lastSourceCheckedAt`)로 분리했다.
> UI는 실측 노선에만 "검증" 문구를, 미실측 노선에는 "데이터 확인" 문구를 표시한다.

정류장 단위 필드:

| 필드 | 의미 |
|------|------|
| `googleMapsError` | 구글맵 표시 위치가 실제와 유의미하게 다륵면 `true` |
| `googleMapsLat/Lng` | 구글맵이 가리키는 (틀린) 좌표 — 경고 핀 표시용 |
| `googleMapsErrorNote` | 오류 내용과 확인일 메모 |
| `coordinatesApproximate` | 좌표가 근사치(미실측)이면 `true` |

---

## 데이터 업데이트 절차

1. 노선별 출처(위 표)에서 최신 데이터 확인
2. `src/data/routes/*.json` 갱신 — TypeScript 파일에 좌표를 하드코딩하지 않는다 (ISS-001)
3. `metadata.lastUpdatedAt` 갱신, 실제 현장 검증을 한 경우에만 검증일 관련 필드 갱신
4. `docs/data-update-guide.md`의 체크리스트 수행 (마커 위치, 폴리라인, stop_01==stop_20 등)
5. Vercel 재배포 (git push → 자동 빌드)

> 참고: GTFS 자동 파싱 스크립트(`scripts/parse-gtfs.ts`)는 계획만 있고 미구현 상태다.
> 정류장과 GTFS `stop_id`의 매핑도 아직 데이터에 없어, GTFS 갱신 시 수동 대조가 필요하다.

---

## 사용하지 않는 데이터

| 항목 | 제외 이유 |
|------|-----------|
| TripAdvisor 리뷰 인용 | ToS 5항 — 상업적 재사용 금지. 익명 처리("어느 여행자")로 대체. |
| Google Maps 정류장 데이터 | 부정확. Google Maps API ToS도 별도 검토 필요. |
| 실시간 운행 정보 | 별도 실시간 API 필요. 이 서비스는 GPS 위치와 공식 시간표만 제공. |
