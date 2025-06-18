import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  
  // Skip middleware for API routes and static files
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Detect merchant from URL
  const detectionMode = process.env.NEXT_PUBLIC_MERCHANT_DETECTION_MODE || 'path';
  let merchantSubdomain: string | null = null;

  if (detectionMode === 'subdomain') {
    // Option A: Subdomain detection
    const hostname = request.headers.get('host') || '';
    const parts = hostname.split('.');
    
    // For production: merchant.bookings.heya-pos.com
    // For local: merchant.localhost:3001
    if (parts.length >= 2) {
      const subdomain = parts[0];
      // Exclude common non-merchant subdomains
      if (subdomain && !['www', 'bookings', 'app', 'api'].includes(subdomain)) {
        merchantSubdomain = subdomain;
      }
    }
  } else if (detectionMode === 'path') {
    // Option B: Path-based detection (e.g., /hamilton/...)
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Check if first segment could be a merchant subdomain
    if (pathSegments[0] && !['_next', 'public', 'api'].includes(pathSegments[0])) {
      // Check if this looks like a merchant subdomain (alphanumeric and hyphens only)
      if (/^[a-z0-9-]+$/.test(pathSegments[0])) {
        merchantSubdomain = pathSegments[0];
        
        // Remove merchant from path for internal routing
        const newPathSegments = pathSegments.slice(1);
        const newPath = '/' + newPathSegments.join('/');
        
        // Rewrite the URL to remove the merchant segment
        const newUrl = new URL(newPath, request.url);
        newUrl.search = url.search; // Preserve query params
        
        const response = NextResponse.rewrite(newUrl);
        
        // Add merchant as header for the app to read
        response.headers.set('x-merchant-subdomain', merchantSubdomain);
        
        return response;
      }
    }
  } else if (detectionMode === 'query') {
    // Option C: Query parameter detection
    merchantSubdomain = url.searchParams.get('merchant');
  }

  // If no merchant detected and we're not on the root path, redirect to error
  if (!merchantSubdomain && url.pathname !== '/') {
    // For development, we'll allow no merchant and show a selector
    // In production, this would redirect to an error page
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] No merchant detected, showing merchant selector');
    }
  }

  // Add merchant subdomain as header if detected
  const response = NextResponse.next();
  if (merchantSubdomain) {
    response.headers.set('x-merchant-subdomain', merchantSubdomain);
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
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};