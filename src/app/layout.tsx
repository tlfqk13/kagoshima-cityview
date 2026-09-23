import type { Metadata, Viewport } from 'next'
import { Zen_Maru_Gothic } from 'next/font/google'
import './globals.css'
import I18nProvider from '@/components/I18nProvider'
import ThemeProvider from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/react'
import OfflineBanner from '@/components/OfflineBanner'
import { getServerLang } from '@/lib/serverLang'
import { SITE_URL } from '@/lib/site'
import { SITE_NAME, OG_LOCALE, OG_IMAGE, seoText } from '@/lib/seo'

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

// 언어별 기본 메타데이터. 페이지 제목은 template로 브랜드 접미사가 붙고, OG·canonical은 각 페이지가 pageMetadata()로 채운다.
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLang()
  const seo = seoText(lang)
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME[lang], template: `%s | ${SITE_NAME[lang]}` },
    description: seo.description,
    manifest: '/manifest.json',
    icons: { apple: '/apple-touch-icon.png' },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: seo.appTitle },
    openGraph: { siteName: SITE_NAME[lang], locale: OG_LOCALE[lang], type: 'website', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image' },
  }
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
