import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/api', '/emergency-logout.html']

// Get JWT secret - same as API uses
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters-long'

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    return null
  }
}

export async function middleware(request: NextRequest) {
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
    
    // Validate token with proper signature verification
    const payload = await verifyToken(token)
    
    if (!payload) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      
      // Clear the invalid cookie
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('authToken')
      response.cookies.delete('auth-token')
      return response
    }
    
    // Check token expiration
    const now = Date.now() / 1000 // Convert to seconds
    if (payload.exp && payload.exp < now) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      
      // Clear the expired cookie
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('authToken')
      response.cookies.delete('auth-token')
      return response
    }
    
    // Token is valid, pass user data to the request via headers
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.sub as string)
    response.headers.set('x-merchant-id', payload.merchantId as string)
    response.headers.set('x-user-type', payload.type as string)
    return response
  }
  
  // For login page, redirect to calendar if already authenticated
  if (pathname === '/login') {
    const token = request.cookies.get('authToken')?.value || 
                  request.cookies.get('auth-token')?.value
    
    if (token) {
      try {
        const payload = await verifyToken(token)
        
        // Only redirect if token is valid and not expired
        if (payload && payload.exp && payload.exp > Date.now() / 1000) {
          return NextResponse.redirect(new URL('/calendar', request.url))
        } else {
          // Token is expired, clear the cookie
          const response = NextResponse.next()
          response.cookies.delete('authToken')
          response.cookies.delete('auth-token')
          return response
        }
      } catch (error) {
        // Invalid token, clear the cookie
        const response = NextResponse.next()
        response.cookies.delete('authToken')
        response.cookies.delete('auth-token')
        return response
      }
    }
  }
  
  // Continue with the request
  return NextResponse.next()
}

// Only run middleware on app routes, not on static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}