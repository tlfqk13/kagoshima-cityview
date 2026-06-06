# ADR 003: Turbopack 비활성화

**날짜:** 2026-06-06  
**상태:** 승인됨

## 컨텍스트

Next.js 15는 기본적으로 Turbopack을 개발 서버에서 활성화한다.  
Mapbox GL JS를 함께 쓸 때 빌드 오류가 발생했다.

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

`next.config.js`에서 Turbopack 관련 옵션을 제거하고, `create-next-app` 시 `--no-turbopack` 플래그 사용.

```js
// next.config.js
const nextConfig = {
  // turbopack 관련 설정 없음 = webpack 사용
}
```

## 이유

Mapbox GL JS의 Worker URL 이슈는 Turbopack과의 알려진 비호환성이다.  
Mapbox 측 GitHub에도 동일 이슈가 다수 보고되어 있으며, 해결을 위한 별도 webpack 설정(`worker-loader`, `resolve.alias`)이 필요하다.

추가 복잡도를 감수할 만한 성능 이점이 MVP 단계에서는 없으므로 webpack을 유지한다.  
Turbopack이 Mapbox Worker를 안정적으로 지원하게 되면 재검토.

## 트레이드오프

- 개발 서버 HMR이 Turbopack보다 약간 느릴 수 있음 → MVP 규모에서는 체감 차이 없음
