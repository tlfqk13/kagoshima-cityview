# 데이터 출처 및 검증

마지막 대조: 2026-09-20. 런타임 원본은 `src/data/routes/*.json`입니다.

## 현재 출처

| 노선 | 정류장 좌표 | 시간표 | 도로 형상 |
|---|---|---|---|
| 시티뷰 20곳 | 기존 현장 검증 좌표 유지, 교통국 노선도와 대조 | 공식 GTFS route 9121, 19편 | 공식 노선도 strEnd.php + line.php, 271점 |
| 야경 7곳 | 공식 노선도 route 1660 | 공식 안내/노선별 시각표 링크 | 공식 노선도, 종점 귀환 포함 156점 |
| 아일랜드뷰 12곳 | 공식 GTFS 승강장 좌표, 현장 미검증 | GTFS 9061(A 7편) / 9071(B 8편), PDF 대조 | 공식 PDF와 대조한 OSM 도로 참고 형상, A/B 분리 |

[공식 GTFS 카탈로그](https://data.bodik.jp/dataset/462012_bus-kagoshimacity-kagoshima-jp)의 2026-02-01 개정본을 사용했습니다. 유효기간은 2026-02-01~2027-03-31입니다. ZIP SHA-256:

```
c1d6e8401835db6a4d9534825e15c35c3ef7c01420e5b2d8ed4dc6d02853bc5a
```

[교통국 공식 관광 안내](https://www.kotsu-city-kagoshima.jp/sakurajima-tabi/)와 [2026-07 아일랜드뷰 PDF](https://www.kotsu-city-kagoshima.jp/wp/wp-content/uploads/2026/07/b1bf84b7578394e6a205dcd3d0461da5.pdf)를 함께 확인했습니다.

## 정확도와 변경

- 시티뷰의 `lastFieldVerifiedAt: 2026-05-31`은 기존 개발자의 실측 기록입니다. 이번 작업에서 재실측한 날짜가 아닙니다.
- GTFS와 교통국 지도는 일부 승강장 좌표가 다릅니다(예: 중앙역 출발/도착, 이시바시 공원). 시티뷰의 기존 현장 좌표를 GTFS로 자동 덮어쓰지 않았습니다. GTFS 매핑·원본 좌표는 `tests/fixtures/official-gtfs.json`에 별도로 보존합니다.
- 아일랜드뷰는 OSM POI/근사 좌표를 GTFS 승강장 좌표로 전면 교체했습니다. 2·7·9·10·12번의 근사치 표시를 제거하되 GPS 현장 검증으로 승격하지 않습니다.
- 7번은 `38-2`, 9번은 `38-1`로 구분합니다. 12번은 `40-3`(桜洲小学校前)이며 기존 좌표와 약 2.4km 차이가 납니다.
- 12번 다국어 이름은 오슈/Oshu/桜洲로 통일했습니다. 공식 PDF의 2026년 10월 개칭 예고는 안내 문구로 보존하고, 현재 이름을 미리 바꾸지 않았습니다.
- 야경은 1회 요금 230/120엔과 전용 1일권 250/130엔을 구분했습니다. 계절별 시각·임시 운휴가 있어 화면에서는 공식 시각표 확인을 안내합니다.
- 운행일은 Asia/Tokyo 기준입니다. 정기 운행 규칙은 임시 운휴·증편을 보장하지 않습니다.

## 도로 형상

GTFS에는 `shapes.txt`가 없습니다. 시티뷰/야경의 각 구간은 교통국 공개 `line.php` 응답이며 요청 URL을 JSON에 보관합니다.

아일랜드뷰는 GTFS의 정류장 순서와 공식 PDF의 코스 지도를 기준으로 OSM 도로를 연결했습니다. 일반 자동차 경로 엔진이 10→11번을 북쪽으로 우회하므로 해당 산길은 `scripts/data/island-mountain-road.json`에 보존한 OSM way 좌표로 대체합니다. 나머지 구간은 OSRM 도로 참고 경로입니다. 승강장과 도로 중심선은 최대 100m 차이를 허용해 검사하며, 실측 버스 궤적으로 표시하지 않습니다.

## 라이선스

- 공식 GTFS: 鹿児島市, CC BY 4.0. 표기: `データ提供：鹿児島市（原データより加工）`.
- OSM 도로 형상: © OpenStreetMap contributors, ODbL. 해당 원본 스냅샷과 파생 좌표는 ODbL로 제공하며 출처·way ID/version을 함께 유지합니다.
- 앱 코드의 라이선스와 데이터 라이선스는 별개입니다.

## 재현 가능한 갱신

공식 카탈로그에서 ZIP을 받은 뒤 먼저 쓰기 없는 대조를 실행합니다.

```sh
node scripts/import-transit-data.mjs /absolute/path/official.zip YYYY-MM-DD
node scripts/import-transit-data.mjs /absolute/path/official.zip YYYY-MM-DD --write
node scripts/import-route-geometry.mjs YYYY-MM-DD --write
npm run check
npm run test:e2e
```

`--write`는 관련 JSON과 테스트 원본을 갱신합니다. 변경된 ID·정류장 순서·날짜·라이선스를 검토한 뒤 사용하세요. 스냅샷을 다시 생성했다는 사실만으로 정답을 검증한 것은 아닙니다. 공식 시간표와 지도 시각 대조를 반복해야 합니다. 새로운 현장 실측 없이 `lastFieldVerifiedAt`을 바꾸지 않습니다.

## 메타데이터

- `lastSourceCheckedAt`: 공식 출처 대조일.
- `lastFieldVerifiedAt`: 기존 현장 실측 기록; 미실측은 null.
- `gtfs`: 다운로드 URL, 해시, route ID, 유효기간.
- `gtfsStopId`: 정류장별 방향을 포함하는 승강장 ID.
- `geometry`: 코스, 좌표 배열, 생성 방법, 확인일, 원본 URL.
- `coordinatesApproximate`: 개별 정류장 근사치. 노선 수준 값은 근사치 포함 여부이며 모든 정류장의 상태를 뜻하지 않습니다.
