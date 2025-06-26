import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/reset-password']

// Get JWT secret - same as API uses
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters-long'

// Cache for JWT verification results (request-scoped)
const verificationCache = new WeakMap<NextRequest, any>()

async function verifyToken(token: string, request: NextRequest) {
  // Check cache first
  const cached = verificationCache.get(request)
  if (cached) return cached
  
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    // Cache the result for this request
    verificationCache.set(request, payload)
    return payload
  } catch (error) {
    verificationCache.set(request, null)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Early return for API routes (they have their own auth)
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }
  
  // Early return for static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next()
  }
  
  // Skip auth check for public routes
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (!isPublicRoute) {
    // Check for auth token in cookies - use consistent naming
    const token = request.cookies.get('authToken')?.value
    
    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Validate token with proper signature verification
    const payload = await verifyToken(token, request)
    
    if (!payload) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      
      // Clear the invalid cookie
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('authToken')
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
    const token = request.cookies.get('authToken')?.value
    
    if (token) {
      try {
        const payload = await verifyToken(token, request)
        
        // Only redirect if token is valid and not expired
        if (payload && payload.exp && payload.exp > Date.now() / 1000) {
          // Check if we're coming from a failed auth redirect
          const from = request.nextUrl.searchParams.get('from')
          if (from) {
            // Don't redirect if we were just sent here
            return NextResponse.next()
          }
          return NextResponse.redirect(new URL('/calendar', request.url))
        } else {
          // Token is invalid/expired, clear the cookie
          const response = NextResponse.next()
          response.cookies.delete('authToken')
          return response
        }
      } catch (error) {
        // If verification fails, clear the cookie and proceed
        const response = NextResponse.next()
        response.cookies.delete('authToken')
        return response
      }
    }
  }
  
  // Continue with the request
  return NextResponse.next()
}

// Match only the routes that need authentication
export const config = {
  matcher: [
    /*
     * Match only app routes that need auth checking:
     * - All main app pages
     * - Exclude API routes (they have their own auth)
     * - Exclude static files automatically
     */
    '/',
    '/calendar/:path*',
    '/calendar-new/:path*',
    '/settings/:path*', 
    '/bookings/:path*',
    '/services/:path*',
    '/staff/:path*',
    '/customers/:path*',
    '/reports/:path*',
    '/analytics/:path*',
    '/pos/:path*',
    '/login',
    '/forgot-password',
    '/reset-password',
  ],
}