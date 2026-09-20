# 가고시마 시티뷰 버스 가이드

일본 가고시마 관광 버스 3개 노선의 정류장·시간표·지도를 제공하는 한국어/영어/일본어 Next.js 서비스입니다.

## 로컬 실행

Node.js 22 이상을 사용합니다. `.env.local.example`을 참고해 로컬 환경 변수를 설정하세요. 비밀 값은 커밋하지 않습니다.

```sh
npm ci
npm run dev
```

지도는 Mapbox 토큰이 필요합니다. 개발·빌드는 Mapbox Worker/PWA 호환성을 위해 webpack을 사용합니다.

## 검증

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

- `check`: ESLint, Vitest, Next.js 프로덕션 빌드.
- Playwright: 빌드 후 3117번 포트에서 서버를 시작해 데스크톱·모바일 다국어, 목록 탐색, 검증 배지, 관리자 보호를 검사합니다.
- 자동 UI 테스트에서는 외부 지도·분석 요청 및 서비스 워커를 차단합니다. 실제 지도/서비스 워커 검증을 대체하지 않습니다.
- GitHub Actions는 동일한 검사와 실패 시 브라우저 리포트 보존을 수행합니다. 설정 파일 작성과 원격 CI 실행은 구분합니다.

## 데이터와 운영

런타임 정류장·경로 원본은 `src/data/routes/*.json`입니다. 현장 검증, 공식 출처 대조, 참고 도로 경로를 구분합니다. 출처·갱신 명령은 [데이터 출처](docs/data-sources.md), 설계는 [ADR 006](docs/adr/006-request-locale-and-route-geometry.md), 검증 기록은 [QA](docs/qa/2026-09-20-reliability.md)를 참고하세요.

`main` 푸시는 Vercel 배포를 유발합니다. 사용자 승인 범위에 포함될 때만 커밋·푸시합니다.
