import type { Metadata } from 'next'
import type { Language } from '@/lib/locale'
import { MESSAGES } from '@/lib/messages'
import { SITE_URL } from '@/lib/site'

// 페이지 메타데이터 공통 규칙 — 제목 접미사(브랜드)는 layout의 title.template가 붙이므로 페이지는 제목만 넘긴다.
// canonical은 ?lang= 쿼리를 뺀 경로 하나로 고정한다(언어는 쿠키·헤더로 결정되므로 URL이 같다).

export const SITE_NAME: Record<Language, string> = {
  ja: '鹿児島シティビューバスガイド',
  ko: '가고시마 시티뷰 버스 가이드',
  en: 'Kagoshima City View Bus Guide',
  'zh-Hant': '鹿兒島城市觀光巴士指南',
}

export const OG_LOCALE: Record<Language, string> = { ja: 'ja_JP', ko: 'ko_KR', en: 'en_US', 'zh-Hant': 'zh_TW' }

export const OG_IMAGE = { url: '/images/og.jpg', width: 1200, height: 630 }

export function seoText(lang: Language) {
  return MESSAGES[lang].seo
}

interface PageMeta {
  title: string
  description?: string
  /** canonical 경로 (예: '/map/stop_03'). 쿼리 없이. */
  path: string
  /** 인쇄용·관리자 등 검색 색인에서 뺄 페이지 */
  index?: boolean
}

export function pageMetadata(lang: Language, { title, description, path, index = true }: PageMeta): Metadata {
  const url = `${SITE_URL}${path}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME[lang],
      locale: OG_LOCALE[lang],
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(index ? {} : { robots: { index: false } }),
  }
}
