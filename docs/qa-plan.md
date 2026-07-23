# QA 계획 — 전체 기능 검증 (2026-07-18)

## 목적

- 관광과 공식 채택 제출 전, 서비스의 핵심 가치인 **"정확한 정류장 위치 제공"이 실제로 동작함**을 검증한다.
- 최근 대규모 변경(다중 노선 구조, 다국어 배선, PWA 복구, 보안 헤더, 데이터 정합 작업) 이후 **회귀가 없는지** 확인한다.
- 자동으로 검증 가능한 것과 사람이 브라우저로 확인해야 하는 것을 구분해, 수동 QA 범위를 명확히 한다.

## 목표 (검증 항목)

| # | 영역 | 검증 항목 | 방법 |
|---|------|-----------|------|
| Q1 | 정적 게이트 | `npm run lint` 0 errors, `npm run build` 성공 | 자동 |
| Q2 | 데이터 무결성 | 좌표 범위(가고시마 인근), stop_01==stop_20, 목적지 stopId 참조 무결성, 시간표 첫/막차 정합, i18n 키 패리티 | 자동 스크립트 |
| Q3 | 라우팅/응답 | 전 페이지 200, 잘못된 stopId 404, 보안 헤더 6종, `/map/[stopId]` 메타데이터 | 자동 (HTTP) |
| Q4 | 다국어 | ko/en/ja 쿠키별 스토리 콘텐츠, 출처 표기 키 존재 | 자동 (HTTP) |
| Q5 | 지도 런타임 | Mapbox 로딩(CSP 하), 정류장 핀/폴리라인 렌더, 정류장 선택 → 상세 표시, 콘솔 에러 유무 | 브라우저(가능하면 헤드리스) |
| Q6 | PWA | `sw.js` 생성, 매니페스트 유효 | 자동 |

## 완료 조건

- Q1~Q4, Q6 전부 통과
- Q5는 헤드리스 브라우저로 검증하되, 불가한 항목은 수동 체크리스트로 남기고 사유를 기록
- 결과를 이 문서 하단 "QA 결과" 섹션에 기록한다.

## 범위 외

- 부하/성능 테스트, 크로스브라우저 매트릭스, 실기기 GPS 테스트(현지 필요)

---

## QA 결과 (2026-07-18 실행)

| # | 영역 | 결과 | 비고 |
|---|------|------|------|
| Q1 | 정적 게이트 | **PASS** | lint 0 errors(경고 10개는 기존 패턴), build 성공 |
| Q2 | 데이터 무결성 | **PASS 12/12** | 좌표 범위(39정류장), stop_01==stop_20, 참조 무결성, 시간표 정합, i18n 패리티(92키) 등 |
| Q3 | 라우팅/응답 | **PASS** (1건 발견·수정) | 전 페이지 200/404 정상, 보안 헤더 6종 + X-Powered-By 제거. **`/admin` 무인증 접근 발견 → ISS-004 수정 후 307 확인** |
| Q4 | 다국어 | **PASS 4/4** | ja/en 쿠키별 스토리 콘텐츠, ko fallback, `/map/stop_03` ja 메타데이터 |
| Q5 | 지도 런타임 | **PASS 9/9** (1건 발견·수정) | 헤드리스 Chrome: 캔버스 렌더, Mapbox 요청 27건·실패 0, CSP 위반 0, 정류장 20개 목록·선택·상세, stop_03 오류 배지, 아일랜드뷰 12개+근사치 배지. **hydration #418 발견 → ISS-005 수정 후 재검증 통과** |
| Q6 | PWA | **PASS** | sw.js 9.0KB 서빙, manifest 유효 |

### QA에서 발견·수정된 이슈

- **ISS-004 (Critical):** NextAuth `UntrustedHost` 시 인증 fail-open → `/admin` 무인증 노출. `trustHost: true`로 수정.
- **ISS-005 (High):** Node의 `navigator.language='en-US'`를 언어 감지가 읽어 SSR/클이언트 언어 불일치(React #418). SSR 언어 ko 고정 + 마운트 후 전환으로 수정.

### 수동 확인 권장 항목

- 실기기(iPhone/Android)에서 GPS 현위치 → 도보 경로 표시
- iOS Safari의 Apple Maps 링크 표시
- 다크 모드 토글, 바텀시트 드래그 제스처
- Vercel 배포 환경에서 `/admin` 로그인 플로우(로컬과 인증 동작이 다를 수 있음 — ISS-004 참고)

---

## QA 결과 (2026-07-23 재실행 — 프로덕션 빌드 기준)

> 대규모 추가 변경(히어로 스크롤, /accuracy, /card+호텔 브랜드, googleMapsError 5곳, 운영자 섹션, 기본 언어 ja 전환) 이후 운영급 재검증. `npm run build` + `npm run start` 프로덕션 환경에서 수행.

| # | 영역 | 결과 | 비고 |
|---|------|------|------|
| Q1 | 정적 게이트 | **PASS** | lint 0 errors, build 성공 |
| Q2 | 데이터 무결성 | **PASS 6/6** | 39정류장 좌표 범위, stop_01==stop_20, destinations 참조, i18n 패리티(113키), accuracy-audit 20건(등급/좌표), hotels 8곳(stopId 참조), googleMapsError 5곳 좌표 존재. 야경 departures=[]는 설계상 정상(토요 운행·시각 미공개) |
| Q3 | 라우팅/응답 | **PASS 24/24** | 전 페이지 200, bogus stop/slug/card 404, `/admin` 307, 카드 브랜드/무효 slug 200. 보안 헤더 6종 + X-Powered-By 없음. 프로덕션 서버 로그 에러 0 |
| Q4 | 다국어 | **PASS** | CDP 실브라우저 검증: `/accuracy?lang=ko/en/ja` 각각 해당 언어 h1 렌더 (SSR ja 고정 후 클라이언트 전환 정상). 스토리 ja 쿠키 콘텐츠, `/map/stop_03` ja 메타데이터, 홈 運営について 블록 |
| Q5 | 지도 런타임 | **PASS** | CDP WebGL(swiftshader): `/map` 타일 로드·노선 폴리라인·번호 핀 렌더 확인, `/map/stop_13` 오류 배지+상세 패널. CLI --screenshot의 빈 지도는 virtual-time 아티팩트(실제는 정상 렌더) |
| Q6 | PWA | **PASS** | sw.js 9.4KB, manifest 유효(鹿児島シティビューバスガイド), 아이콘 2종 200 |

### 이번 실행에서 발견된 이슈

- 없음 (신규 페이지·기능 전부 정상)

### 검증 방법 메모 (재사용 가능)

- CLI `--screenshot`/`--dump-dom`은 이 환경(실제 Chrome 상주)에서 불안정 — **CDP(`--remote-debugging-port` + Node 내장 WebSocket)로 Runtime.evaluate/Page.captureScreenshot을 쓰는 방식이 안정적** (`/tmp/cdp-*.mjs` 패턴)
- 프로덕션 서버 로그 확인은 SSR 예외 검출에 유효

