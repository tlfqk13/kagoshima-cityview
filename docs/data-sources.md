# 데이터 출처 및 검증

## 1차 데이터 출처: 가고시마시 공식 GTFS-JP 오픈데이터

| 항목 | 내용 |
|------|------|
| 제공 기관 | 鹿児島市 (가고시마시) |
| 데이터 형식 | GTFS-JP (General Transit Feed Specification, Japan) |
| 공개 URL | `https://www.city.kagoshima.lg.jp/ict/opendata.html` |
| 카탈로그 항목 | 3-30 「シティビューバス・まち歩きバス」 |
| 라이선스 | CC BY 4.0 (Creative Commons Attribution 4.0 International) |
| 버전 | 2026-05 |

### CC BY 4.0 준수 사항

이 라이선스에 따라 이 서비스는 다음을 이행한다:

1. **출처 표기** — UI Footer에 `データ提供：鹿児島市（原データより加工）` 명시
2. **가공 사실 고지** — "원본 데이터에서 가공" 문구 포함
3. **라이선스 링크** — Footer에 `CC BY 4.0` 링크 포함
4. **동일 라이선스 불필요** — CC BY 4.0은 SA(동일조건) 조항 없음

### GTFS 데이터 구조

가고시마시 GTFS 패키지 내 사용한 파일:

```
stops.txt        — 정류장 ID, 위도(stop_lat), 경도(stop_lon), 정류장명
routes.txt       — 노선 정보 (시티뷰 버스 route_id 확인)
trips.txt        — 운행 회차
stop_times.txt   — 정류장 순서 (시티뷰 버스 순서 확인용)
```

MVP에서는 `stops.txt`의 GPS 좌표와 `stops.json`을 수동으로 정규화했다.
정식 운영 전 `scripts/parse-gtfs.ts`를 작성해 자동 파싱으로 전환 예정.

---

## 현장 GPS 검증

**검증일:** 2026년 5월 31일  
**검증자:** 개발자 (가고시마 현지 방문)  
**검증 방법:** 스마트폰 GPS로 실제 정류장 위치 측정 후 GTFS 좌표와 비교

### 검증 결과 — 오류 발견 정류장

| 정류장 | 현상 | 오차 | 비고 |
|--------|------|------|------|
| 텐몬칸 (No.3) | 구글맵이 실제보다 약 200m 남쪽 표시 | ~200m | 2026-05-31 확인 |

그 외 정류장은 GTFS 좌표와 현장 GPS가 허용 오차(±30m) 이내로 일치.

### stops.json 메타데이터 구조

오류 정보와 검증 일자는 `src/data/stops.json`의 최상위 `metadata` 객체에 기록된다:

```json
{
  "metadata": {
    "sourceVersion": "2026-05",
    "lastValidatedAt": "2026-05-31",
    "lastUpdatedAt": "2026-06-06",
    "disclaimer": {
      "ko": "이 서비스는 GPS 정류장 위치 정보를 제공합니다...",
      "en": "This service provides GPS stop location data...",
      "ja": "本サービスはGPS停留所位置情報を提供します..."
    }
  }
}
```

개별 정류장에는 `googleMapsError: boolean` 필드와 `googleMapsErrorNote` 필드가 있다:

```json
{
  "id": "stop_03",
  "googleMapsError": true,
  "googleMapsErrorNote": "구글맵이 실제 위치보다 약 200m 남쪽을 가리킴. 2026-05-31 현장 확인."
}
```

---

## 데이터 업데이트 절차

GTFS 데이터는 가고시마시가 주기적으로 갱신한다. 업데이트 절차:

1. 가고시마시 오픈데이터 포털에서 최신 GTFS 패키지 다운로드
2. `stops.txt` 좌표와 현재 `stops.json` 비교
3. 변경 정류장에 대해 현장 검증 (또는 위성 이미지 대조)
4. `stops.json` 업데이트 + `metadata.lastUpdatedAt` 갱신
5. `metadata.lastValidatedAt`은 실제 현장 검증 후에만 갱신
6. Vercel 재배포 (git push → CI)

---

## 사용하지 않는 데이터

| 항목 | 제외 이유 |
|------|-----------|
| TripAdvisor 리뷰 인용 | ToS 5항 — 상업적 재사용 금지. 익명 처리("어느 여행자")로 대체. |
| Google Maps 정류장 데이터 | 부정확. Google Maps API ToS도 별도 검토 필요. |
| 운행 시간표 | GTFS stop_times.txt 포함 가능하나 MVP 제외. 실시간 운행은 별도 API 필요. |
