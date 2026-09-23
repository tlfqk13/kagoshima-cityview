import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { getStopsForRoute, getRoute } from '@/lib/routes'
import { getAllEpisodes } from '@/lib/devlog'

// 검색엔진용 사이트맵. 인쇄용(/card/*)·관리자(/admin/*)는 뺀다.
// 언어는 쿠키·헤더로 결정되므로 URL은 언어별로 나누지 않는다.
export default function sitemap(): MetadataRoute.Sitemap {
  const route = getRoute('cityview')
  const dataDate = new Date(route.lastUpdatedAt)
  const stops = getStopsForRoute('cityview').map(stop => ({
    url: `${SITE_URL}/map/${stop.id}`,
    lastModified: dataDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))
  const episodes = getAllEpisodes('ja').map(ep => ({
    url: `${SITE_URL}/story/${ep.slug}`,
    lastModified: new Date(ep.date),
    changeFrequency: 'yearly' as const,
    priority: 0.4,
  }))
  return [
    { url: `${SITE_URL}/`, lastModified: dataDate, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/map`, lastModified: dataDate, changeFrequency: 'weekly', priority: 0.9 },
    ...stops,
    { url: `${SITE_URL}/accuracy`, lastModified: dataDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/story`, changeFrequency: 'monthly', priority: 0.5 },
    ...episodes,
    { url: `${SITE_URL}/downloads`, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
