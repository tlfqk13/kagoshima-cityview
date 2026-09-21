import type { Metadata, Viewport } from 'next'
import { Zen_Maru_Gothic } from 'next/font/google'
import './globals.css'
import I18nProvider from '@/components/I18nProvider'
import ThemeProvider from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'
import OfflineBanner from '@/components/OfflineBanner'
import { getServerLang } from '@/lib/serverLang'

// 기본 서체 — 레퍼런스(히라야스미·사가시)와 같은 둥근 고딕.
// next/font가 빌드 시 파일을 받아 같은 도메인에서 제공하므로 런타임 CDN 요청이 없다(CSP font-src 'self').
// 일본어는 unicode-range 조각으로 나뉘어 화면에 쓰인 글자 조각만 내려받는다(preload 끔).
// 한글 글리프는 없어 --font-sans의 다음 폰트로 글자 단위 대체된다.
const zenMaru = Zen_Maru_Gothic({
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-zen-maru',
})

export const metadata: Metadata = {
  title: '鹿児島シティビューバスガイド',
  description: '鹿児島シティビューバス全20停留所の正確なGPS位置ガイド。日本語·English·한국어.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'シティビューバス',
  },
}

export const viewport: Viewport = {
  themeColor: '#8B4513',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const language = await getServerLang()
  return (
    <html lang={language} className={zenMaru.variable} suppressHydrationWarning>
      <body>
        <I18nProvider initialLanguage={language}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <OfflineBanner />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
