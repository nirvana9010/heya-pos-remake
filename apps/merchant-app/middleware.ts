import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Development Middleware - Phase 3 Build System Improvements
 * 
 * This middleware improves development experience by:
 * 1. Adding performance headers
 * 2. Handling CORS for local development
 * 3. Adding security headers
 * 4. Logging slow requests in development
 */

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Has file extension
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Add performance timing header
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

  // Development-only features
  if (process.env.NODE_ENV === 'development') {
    // Enable CORS for local development
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Log slow requests
    const responseTime = Date.now() - startTime;
    if (responseTime > 1000) {
      console.warn(`[Middleware] Slow request detected: ${pathname} took ${responseTime}ms`);
    }
  }

  // Security headers for all environments
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );

  // Add CSP header for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://api.stripe.com http://localhost:3000 https://*.supabase.co wss://*.supabase.co; " +
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com;"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};