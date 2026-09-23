import Link from 'next/link'
import Nav from '@/components/Nav'
import { getServerLang } from '@/lib/serverLang'
import ko from '@/messages/ko.json'
import en from '@/messages/en.json'
import ja from '@/messages/ja.json'
import styles from './not-found.module.css'

const messages = { ko, en, ja }

// 404 — QR 오타·옛 링크로 들어온 여행자를 지도로 돌려보낸다. 기능 레이어라 종이 질감 없이 토큰만 쓴다.
export default async function NotFound() {
  const lang = await getServerLang()
  const t = messages[lang].notFound
  return (
    <>
      <Nav />
      <main className={styles.main}>
        <p className={styles.code} aria-hidden="true">404</p>
        <h1 className={styles.h1}>{t.title}</h1>
        <p className={styles.body}>{t.body}</p>
        <div className={styles.actions}>
          <Link href="/map" className={styles.primary}>{t.map} →</Link>
          <Link href="/" className={styles.ghost}>{t.home}</Link>
        </div>
      </main>
    </>
  )
}
