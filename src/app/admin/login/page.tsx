import { signIn } from '@/auth'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.h1}>관리자 로그인</h1>
        <p className={styles.note}>
          가고시마 시티뷰 버스 가이드 관리자 전용
        </p>
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/admin' })
          }}
        >
          <button type="submit" className={styles.btn}>
            Google로 로그인
          </button>
        </form>
      </div>
    </main>
  )
}
