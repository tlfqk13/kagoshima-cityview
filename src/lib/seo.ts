import type { Metadata } from 'next'
import type { Lang } from '@/lib/routes'
import { SITE_URL } from '@/lib/site'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'

// 페이지 메타데이터 공통 규칙 — 제목 접미사(브랜드)는 layout의 title.template가 붙이므로 페이지는 제목만 넘긴다.
// canonical은 ?lang= 쿼리를 뺀 경로 하나로 고정한다(언어는 쿠키·헤더로 결정되므로 URL이 같다).
const messages = { ko, en, ja }

export const SITE_NAME: Record<Lang, string> = {
  ja: '鹿児島シティビューバスガイド',
  ko: '가고시마 시티뷰 버스 가이드',
  en: 'Kagoshima City View Bus Guide',
}

export const OG_LOCALE: Record<Lang, string> = { ja: 'ja_JP', ko: 'ko_KR', en: 'en_US' }

export const OG_IMAGE = { url: '/images/og.jpg', width: 1200, height: 630 }

export function seoText(lang: Lang) {
  return messages[lang].seo
}

interface PageMeta {
  title: string
  description?: string
  /** canonical 경로 (예: '/map/stop_03'). 쿼리 없이. */
  path: string
  /** 인쇄용·관리자 등 검색 색인에서 뺄 페이지 */
  index?: boolean
}

export function pageMetadata(lang: Lang, { title, description, path, index = true }: PageMeta): Metadata {
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
