import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type Lang = 'ko' | 'en' | 'ja'

export interface EpisodeMeta {
  slug: string
  title: string
  date: string
  summary: string
  published: boolean
  lang: Lang
}

export interface Episode extends EpisodeMeta {
  content: string
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'story')

function getEpisodePath(slug: string, lang: Lang): string | null {
  const p = path.join(CONTENT_DIR, lang, `${slug}.mdx`)
  return fs.existsSync(p) ? p : null
}

export function getAllEpisodes(lang: Lang = 'ko'): EpisodeMeta[] {
  const koDir = path.join(CONTENT_DIR, 'ko')
  if (!fs.existsSync(koDir)) return []

  const slugs = fs.readdirSync(koDir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''))

  return slugs
    .map(slug => {
      const filePath = getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')!
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'))
      return {
        slug,
        title: data.title ?? slug,
        date: data.date ?? '',
        summary: data.summary ?? '',
        published: data.published !== false,
        lang,
      }
    })
    .filter(ep => ep.published)
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

export function getEpisode(slug: string, lang: Lang = 'ko'): Episode | null {
  const filePath = getEpisodePath(slug, lang) ?? getEpisodePath(slug, 'ko')
  if (!filePath) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? '',
    summary: data.summary ?? '',
    published: data.published !== false,
    lang,
    content,
  }
}
