import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/api']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip auth check for public routes
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (!isPublicRoute) {
    // Check for auth token in cookies
    const token = request.cookies.get('authToken')?.value || 
                  request.cookies.get('auth-token')?.value
    
    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // TODO: Optionally validate token expiry here
    // For now, we'll let the API handle token validation
  }
  
  // For login page, redirect to calendar if already authenticated
  if (pathname === '/login') {
    const token = request.cookies.get('authToken')?.value || 
                  request.cookies.get('auth-token')?.value
    
    if (token) {
      return NextResponse.redirect(new URL('/calendar', request.url))
    }
  }
  
  // Continue with the request
  const response = NextResponse.next()
  
  // Add timing headers for debugging
  response.headers.set('x-pathname', pathname)
  response.headers.set('x-middleware-start', Date.now().toString())
  
  return response
}

// Only run middleware on app routes, not on static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}