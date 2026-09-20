import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { normalizeLanguage, resolveLanguage } from '@/lib/locale'

export default auth((req) => {
  const isLoginRoute = req.nextUrl.pathname === '/admin/login'
  const isAdminRoute = req.nextUrl.pathname === '/admin' || req.nextUrl.pathname.startsWith('/admin/')
  if (isAdminRoute && !req.auth && !isLoginRoute) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  const language = resolveLanguage(req.nextUrl.searchParams.get('lang'), req.cookies.get('i18next')?.value, req.headers.get('accept-language'))
  const requestHeaders = new Headers(req.headers)
  // 외부에서 전달된 동일 이름의 헤더는 신뢰하지 않고 덮어쓴다.
  requestHeaders.set('x-cityview-language', language)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  if (normalizeLanguage(req.nextUrl.searchParams.get('lang'))) {
    response.cookies.set('i18next', language, { path: '/', maxAge: 31536000, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:' })
  }
  return response
})

export const config = {
  matcher: ['/admin/:path*', '/((?!api|_next|.*\\..*).*)'],
}
