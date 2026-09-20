# ADR 003: Turbopack 비활성화

**날짜:** 2026-06-06  
**상태:** 승인됨

## 컨텍스트

초기 개발 환경에서 Turbopack과 Mapbox GL JS를 함께 쓸 때 빌드 오류가 발생했다. 아래 오류는 당시 관찰 기록이며, 현재 프로젝트는 Next.js 16을 사용한다.

## 문제

Mapbox GL JS는 내부적으로 Web Worker를 사용한다.  
Turbopack이 Worker URL을 처리하는 방식이 webpack과 달라 다음 오류가 발생했다:

```
Error: Cannot find module './mapbox-gl-csp-worker'
```

또는 런타임에서:

```
Failed to create WebWorker: URL scheme must be "blob" or "https"
```

## 결정

Mapbox Worker와 PWA 빌드 호환성을 위해 개발 서버와 프로덕션 빌드 모두 webpack을 유지한다.

현재 실행 기준은 `package.json`의 scripts다:

```json
{
  "dev": "next dev --webpack",
  "build": "next build --webpack"
}
```

`next.config.mjs`의 `turbopack: {}` 유무나 프로젝트 생성 당시의 `--no-turbopack` 선택만으로 현재 실행 번들러를 결정하지 않는다. Next.js 16에서는 실행 시 `--webpack`을 명시한다. 기본 명령과 직접 실행이 필요한 경우의 대체 명령은 [AGENTS.md의 빌드 및 실행 명령어](../../AGENTS.md#빌드-및-실행-명령어)를 따른다.

## 이유

Mapbox GL JS의 Worker URL 이슈는 Turbopack과의 알려진 비호환성이다.  
Mapbox 측 GitHub에도 동일 이슈가 다수 보고되어 있으며, 해결을 위한 별도 webpack 설정(`worker-loader`, `resolve.alias`)이 필요하다.

추가 복잡도를 감수할 만한 성능 이점이 MVP 단계에서는 없으므로 webpack을 유지한다.  
Turbopack이 Mapbox Worker를 안정적으로 지원하게 되면 재검토.

## 트레이드오프

- 개발 서버 HMR이 Turbopack보다 약간 느릴 수 있음 → MVP 규모에서는 체감 차이 없음
