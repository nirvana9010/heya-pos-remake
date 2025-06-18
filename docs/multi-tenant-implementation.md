# Multi-Tenant Booking System Implementation

## Overview
The booking app now supports multiple merchants, each with their own unique booking URL. The system uses path-based routing in development and can be configured for subdomain-based routing in production.

## Implementation Details

### 1. Merchant Detection (Middleware)
- **File**: `/apps/booking-app/src/middleware.ts`
- Detects merchant from URL using configurable detection modes:
  - **Path mode** (default): `/hamilton`, `/zen-wellness`
  - **Subdomain mode**: `hamilton.bookings.com`, `zen-wellness.bookings.com`
  - **Query mode**: `/?merchant=hamilton`
- Adds `x-merchant-subdomain` header to all requests

### 2. Merchant Context
- **File**: `/apps/booking-app/src/contexts/merchant-context.tsx`
- Provides merchant data throughout the app
- Fetches merchant info from API
- Includes fallback to proxy endpoint for CORS issues
- Handles loading and error states

### 3. API Endpoints
All public API endpoints now require merchant context:
- `/api/v1/public/merchant-info`
- `/api/v1/public/services`
- `/api/v1/public/staff`
- `/api/v1/public/available-slots`
- `/api/v1/public/bookings`

### 4. Test Merchants
Two demo merchants are available:
1. **Hamilton Beauty Spa** (subdomain: `hamilton`)
   - Traditional beauty services
   - Requires 30% deposit
   
2. **Zen Wellness Spa** (subdomain: `zen-wellness`)
   - Wellness and holistic services
   - No deposit required

### 5. Environment Configuration
```env
# /apps/booking-app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_MERCHANT_DETECTION_MODE=path
```

## Testing

### Development URLs
- Hamilton Beauty: http://localhost:3001/hamilton
- Zen Wellness: http://localhost:3001/zen-wellness

### Admin Endpoints
- Create merchant: `POST /api/v1/admin/merchants`
- List merchants: `GET /api/v1/admin/merchants`

### Test Tools
- `/test-api` - Test API connectivity
- `/fetch-test` - Debug fetch issues
- `/api/merchant-info?subdomain=xxx` - Proxy endpoint

## Production Deployment
For production, update the detection mode to use subdomains:
```env
NEXT_PUBLIC_MERCHANT_DETECTION_MODE=subdomain
```

Then configure your DNS to route subdomains to the booking app.