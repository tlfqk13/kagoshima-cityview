import { cookies, headers } from 'next/headers'
import type { Lang } from '@/lib/devlog'
import { normalizeLanguage, resolveLanguage } from './locale'

// proxy가 쿼리·쿠키·Accept-Language로 결정한 언어를 모든 RSC가 공유한다.
export async function getServerLang(): Promise<Lang> {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()])
  return normalizeLanguage(requestHeaders.get('x-cityview-language'))
    ?? resolveLanguage(null, store.get('i18next')?.value, requestHeaders.get('accept-language'))
}
