# Multi-Tenant Booking App Implementation Plan

## Overview
Transform the booking app from a single-merchant hardcoded system to a multi-tenant system where each merchant has their own unique booking URL based on their subdomain.

## Current State
- Booking app is hardcoded to use "HAMILTON" merchant
- Public API endpoints use `findFirst()` to get the first active merchant
- No subdomain-based routing implemented
- All merchants would share the same booking URL

## Target State
- Each merchant has a unique subdomain (e.g., `hamilton.bookings.heya-pos.com`)
- Booking app dynamically loads merchant based on subdomain
- Public API accepts merchant identifier (subdomain)
- Proper isolation between merchants

## Implementation Approach

### 1. Subdomain Detection Strategy
We have three options for identifying merchants:

#### Option A: Subdomain-based (Recommended for Production)
- URL format: `https://[merchant-subdomain].bookings.heya-pos.com`
- Example: `https://hamilton.bookings.heya-pos.com`
- Pros: Clean URLs, easy to share, professional
- Cons: Requires DNS configuration, harder to test locally

#### Option B: Path-based (Recommended for Development/Testing)
- URL format: `https://bookings.heya-pos.com/[merchant-subdomain]`
- Example: `https://bookings.heya-pos.com/hamilton`
- Pros: Easy to test locally, no DNS setup needed
- Cons: Less clean URLs

#### Option C: Query Parameter-based (Quick Testing Only)
- URL format: `https://bookings.heya-pos.com?merchant=[subdomain]`
- Example: `https://bookings.heya-pos.com?merchant=hamilton`
- Pros: Easiest to implement
- Cons: Ugly URLs, not production-ready

### 2. Implementation Steps

#### Step 1: Create Merchant Context Provider
Create a React context that provides merchant information throughout the booking app.

#### Step 2: Create Middleware for Merchant Detection
Implement Next.js middleware to detect merchant from URL and pass it to the app.

#### Step 3: Update API Client
Modify the API client to include merchant identification in all requests.

#### Step 4: Update Public API Endpoints
Modify all public endpoints to accept and validate merchant identification.

#### Step 5: Create Merchant Configuration Hook
Create a hook that fetches and caches merchant configuration.

#### Step 6: Update All Components
Replace hardcoded merchant references with dynamic data from context.

### 3. Testing Strategy

#### Local Testing Setup
1. Use path-based routing for local development
2. Create test merchants with different subdomains
3. Use environment variables to switch between modes

#### Test Cases
1. Valid merchant subdomain loads correct data
2. Invalid subdomain shows appropriate error
3. Missing subdomain redirects to merchant selector or error page
4. API calls include correct merchant context
5. Booking creation associates with correct merchant

### 4. Security Considerations
1. Validate merchant subdomain on every request
2. Ensure API endpoints verify merchant access
3. Prevent cross-merchant data leakage
4. Add rate limiting per merchant

### 5. Migration Plan
1. Deploy with backward compatibility (current hardcoded behavior)
2. Test with select merchants using new URLs
3. Gradually migrate all merchants
4. Remove hardcoded values

## Technical Implementation Details

### Merchant Detection Logic
```typescript
// In middleware.ts
export function detectMerchant(request: NextRequest): string | null {
  const url = new URL(request.url);
  
  // Option A: Subdomain detection
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'bookings') {
    return subdomain;
  }
  
  // Option B: Path-based detection
  const pathSegments = url.pathname.split('/');
  if (pathSegments[1] && pathSegments[1] !== 'api') {
    return pathSegments[1];
  }
  
  // Option C: Query parameter detection (dev only)
  const merchantParam = url.searchParams.get('merchant');
  if (merchantParam) {
    return merchantParam;
  }
  
  return null;
}
```

### API Integration Pattern
```typescript
// All public API calls should include merchant context
GET /api/v1/public/merchant-info
Headers: X-Merchant-Subdomain: hamilton

// Or as query parameter
GET /api/v1/public/merchant-info?merchant=hamilton
```

## Environment Variables Needed
```env
# Booking app
NEXT_PUBLIC_BOOKING_DOMAIN=bookings.heya-pos.com
NEXT_PUBLIC_MERCHANT_DETECTION_MODE=path # subdomain | path | query

# API
BOOKING_DOMAIN_WHITELIST=bookings.heya-pos.com,localhost:3001
```