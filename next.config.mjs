import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
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
