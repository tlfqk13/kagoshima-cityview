import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  // Zen Maru Gothic(next/font)은 일본어 unicode-range 조각이 수백 개(약 6.7MB)라 precache에서 뺀다.
  // 기본 exclude 정규식은 에셋 이름(static/media/…)에 /_next/ 접두사가 없어 폰트를 거르지 못한다.
  // 대신 실제로 화면에 쓰인 조각만 아래 런타임 캐시에 쌓아 오프라인에서도 같은 서체로 보이게 한다.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    exclude: [/\.woff2$/, /\.map$/, /^manifest.*\.js$/],
    runtimeCaching: [
      {
        // 기본 static-font-assets(최대 4개)를 덮어쓴다 — 파일명에 해시가 있어 CacheFirst로 충분
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-font-assets',
          expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
})

const isDev = process.env.NODE_ENV === 'development'

// Mapbox GL JS 공식 CSP 요구사항 반영 (worker-src/child-src blob: 등)
// https://docs.mapbox.com/mapbox-gl-js/guides/browsers-and-testing/#csp-directives
// Next.js nonce 미들웨어가 없으므로 인라인 스크립트 허용이 필요 — 'unsafe-inline' 유지
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.mapbox.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com https://vitals.vercel-insights.com${isDev ? ' ws:' : ''}`,
  "worker-src 'self' blob:",
  "child-src blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Mapbox URL 제한 토큰은 Referer 헤더가 필요 — origin 전송이 보장되는 값 사용
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 지오로케이션은 자체 기능(현위치)에서만 사용
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Mapbox GL JS는 Turbopack과 Worker URL 충돌 — webpack만 사용
  // Turbopack 기본 활성화(Next.js 16+)와 next-pwa webpack 충돌 방지
  turbopack: {},
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default withPWA(nextConfig)
