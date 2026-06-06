# ADR 001: Mapbox GL JS 선택 (Google Maps 대신)

**날짜:** 2026-06-06  
**상태:** 승인됨

## 컨텍스트

지도 렌더링 라이브러리를 선택해야 했다. 주요 후보는 Google Maps JavaScript API, Mapbox GL JS, Leaflet.

## 결정

**Mapbox GL JS** 사용.

## 이유

| 항목 | Mapbox GL JS | Google Maps JS API |
|------|-------------|-------------------|
| 커스텀 레이어 | GeoJSON 네이티브, Paint 식으로 완전 제어 | 마커 기반, 커스터마이징 제한 |
| 벡터 타일 | 기본 지원 | 별도 설정 필요 |
| 번들 사이즈 | ~250KB gzip | ~50KB (하지만 CDN 의존) |
| 무료 한도 | 월 50,000 로드 | 월 28,000 로드 ($200 크레딧) |
| SSR | `window` 참조 → `ssr: false` 필요 | 동일 |
| 토큰 도메인 제한 | 허용 URL 스코프 설정 가능 | 도메인 제한 가능 |

Google Maps를 선택하지 않은 추가 이유: 이 서비스의 핵심 가치가 "구글맵이 틀렸다"는 메시지이므로, 구글 지도를 백엔드로 쓰는 것은 메시지와 충돌한다.

## 트레이드오프

- Mapbox 토큰이 클라이언트에 노출됨 → 허용 URL 도메인 스코프로 완화
- 번들 사이즈가 Google Maps CDN 방식보다 큼 → dynamic import + ssr:false로 초기 로드에서 제외
