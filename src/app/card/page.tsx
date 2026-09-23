import { redirect } from 'next/navigation'

// 인쇄물 목록은 /downloads 에 통합됐다. 옛 링크 호환용 리다이렉트.
export default function CardIndexPage() {
  redirect('/downloads')
}
