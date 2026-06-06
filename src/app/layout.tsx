import type { Metadata, Viewport } from 'next'
import './globals.css'
import I18nProvider from '@/components/I18nProvider'
import { Analytics } from '@vercel/analytics/react'
import OfflineBanner from '@/components/OfflineBanner'

export const metadata: Metadata = {
  title: '가고시마 시티뷰 버스 가이드',
  description: '가고시마 시티뷰 버스 20개 정류장 정확한 GPS 위치 가이드. 한국어·English·日本語.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '시티뷰 버스',
  },
}

export const viewport: Viewport = {
  themeColor: '#8B4513',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <Analytics />
        <OfflineBanner />
      </body>
    </html>
  )
}
