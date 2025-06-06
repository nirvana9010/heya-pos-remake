import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Log navigation timing
  const start = Date.now()
  
  // Add timing header
  const response = NextResponse.next()
  
  // Log slow navigations
  const pathname = request.nextUrl.pathname
  
  response.headers.set('x-pathname', pathname)
  response.headers.set('x-middleware-start', start.toString())
  
  return response
}

// Only run middleware on app routes, not on static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}