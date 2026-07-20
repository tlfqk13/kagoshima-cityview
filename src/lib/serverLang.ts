import { cookies } from 'next/headers'
import type { Lang } from '@/lib/devlog'

// RSC에서 UI 언어 판별 — react-i18next 감지 순서(querystring > cookie > navigator) 중
// 서버가 읽을 수 있는 건 cookie 뿐. 없으면 기본 언어 ja.
export async function getServerLang(): Promise<Lang> {
  const store = await cookies()
  const v = store.get('i18next')?.value
  return v === 'en' || v === 'ko' ? v : 'ja'
}
