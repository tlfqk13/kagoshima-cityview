import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mapbox GL JS는 Turbopack과 Worker URL 충돌 — webpack만 사용
  // Turbopack 기본 활성화(Next.js 16+)와 next-pwa webpack 충돌 방지
  turbopack: {},
}

export default withPWA(nextConfig)
