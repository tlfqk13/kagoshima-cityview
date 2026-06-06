import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoginRoute = req.nextUrl.pathname === '/admin/login'
  if (!req.auth && !isLoginRoute) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*'],
}
