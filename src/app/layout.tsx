import type { Metadata, Viewport } from 'next'
import './globals.css'
import I18nProvider from '@/components/I18nProvider'
import ThemeProvider from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'
import OfflineBanner from '@/components/OfflineBanner'
import { getServerLang } from '@/lib/serverLang'

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
    <html lang={language} suppressHydrationWarning>
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
