import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { getRoute } from '@/lib/routes'
import styles from './admin.module.css'

export default async function AdminPage() {
  const session = await auth()
  if (!session) redirect('/admin/login')

  const meta = getRoute('cityview')

  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <h1 className={styles.h1}>관리자 대시보드</h1>
        <p className={styles.user}>{session.user?.email}</p>
        <div className={styles.info}>
          <p>가고시마 시티뷰 버스 가이드 관리 페이지입니다.</p>
          <ul>
            <li>서비스 상태: 정상 운영 중</li>
            <li>데이터 출처: 노선별 상이 (docs/data-sources.md 참조)</li>
            <li>시티뷰 현장 검증일: {meta.lastFieldVerifiedAt ?? '미실측'}</li>
            <li>데이터 대조일: {meta.lastSourceCheckedAt}</li>
          </ul>
        </div>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/' })
          }}
        >
          <button type="submit" className={styles.signout}>로그아웃</button>
        </form>
      </div>
    </main>
  )
}
