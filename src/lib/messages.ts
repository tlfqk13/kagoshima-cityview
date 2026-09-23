import type { Language } from './locale'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'
import zhHant from '@/messages/zh-Hant.json'

export type Messages = typeof ja

// 서버 컴포넌트·메타데이터에서 쓰는 언어별 번역 묶음. 클라이언트는 i18n.ts의 리소스를 쓴다.
export const MESSAGES: Record<Language, Messages> = { ko, en, ja, 'zh-Hant': zhHant }
