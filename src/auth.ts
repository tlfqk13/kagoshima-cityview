import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 프로덕션(next start)에서 호스트 미신뢰(UntrustedHost)로 세션 해석이 실패하며
  // 인증이 fail-open 되는 문제 방지 — Vercel 외 환경에서도 동작 보장
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      return ADMIN_EMAILS.includes(user.email)
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
})
