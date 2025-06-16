# API Versioning Guide

## Overview

The Heya POS API implements versioning to support backward compatibility while allowing for architectural improvements. All API endpoints must include the version number in the URL path.

## Version Strategy

### V1 - Original Implementation
- **Path Pattern**: `/api/v1/*`
- **Architecture**: Traditional service layer pattern
- **Available Since**: Initial release
- **Status**: Stable, maintained for backward compatibility

### V2 - CQRS/Bounded Context Pattern
- **Path Pattern**: `/api/v2/*`
- **Architecture**: Command Query Responsibility Segregation (CQRS) with bounded contexts
- **Available Since**: Phase 4 architectural improvements
- **Status**: Active development, currently only bookings implemented

## Endpoint Reference

### Authentication (V1)
All authentication endpoints use V1:
```
POST   /api/v1/auth/merchant/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/merchant/change-password
GET    /api/v1/auth/session
```

### V1 Endpoints
```
# Customers
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id

# Services
GET    /api/v1/services
POST   /api/v1/services
GET    /api/v1/services/:id
PATCH  /api/v1/services/:id
DELETE /api/v1/services/:id

# Service Categories
GET    /api/v1/service-categories
POST   /api/v1/service-categories
PATCH  /api/v1/service-categories/:id
DELETE /api/v1/service-categories/:id

# Staff
GET    /api/v1/staff
POST   /api/v1/staff
GET    /api/v1/staff/:id
PATCH  /api/v1/staff/:id
DELETE /api/v1/staff/:id

# Payments
POST   /api/v1/payments/process
POST   /api/v1/payments/refund
POST   /api/v1/payments/orders/from-booking/:bookingId
GET    /api/v1/payments

# Locations
GET    /api/v1/locations
GET    /api/v1/locations/:id
PATCH  /api/v1/locations/:id

# Merchant
GET    /api/v1/merchant/settings
PUT    /api/v1/merchant/settings
GET    /api/v1/merchant/profile

# Loyalty
GET    /api/v1/loyalty/program
POST   /api/v1/loyalty/program
GET    /api/v1/loyalty/customers/:customerId
POST   /api/v1/loyalty/redeem-visit
POST   /api/v1/loyalty/redeem-points

# Public (no auth required)
GET    /api/v1/public/merchant-info
GET    /api/v1/public/services
GET    /api/v1/public/staff
POST   /api/v1/public/customers/lookup
GET    /api/v1/public/service-categories
```

### V2 Endpoints
```
# Bookings (CQRS Implementation)
GET    /api/v2/bookings              # List bookings
GET    /api/v2/bookings/calendar     # Calendar view
GET    /api/v2/bookings/availability  # Check availability
GET    /api/v2/bookings/:id          # Get single booking
POST   /api/v2/bookings              # Create booking
PATCH  /api/v2/bookings/:id          # Update booking
PATCH  /api/v2/bookings/:id/start    # Start booking
PATCH  /api/v2/bookings/:id/complete # Complete booking
PATCH  /api/v2/bookings/:id/cancel   # Cancel booking
DELETE /api/v2/bookings/:id          # Delete booking
```

## Authentication

All versioned endpoints (except public endpoints) require authentication:

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}'

# 2. Use token in subsequent requests
curl http://localhost:3000/api/v1/staff \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Migration Notes

### For Frontend Applications
- Update all API calls to include version numbers
- The base URL remains the same: `http://localhost:3000`
- Add `/v1` or `/v2` after `/api` in all endpoints

### Common Mistakes
1. **Missing version number**: `/api/auth/login` → Should be `/api/v1/auth/merchant/login`
2. **Wrong version for bookings**: `/api/v1/bookings` → Should be `/api/v2/bookings`
3. **Version in wrong place**: `/v1/api/auth` → Should be `/api/v1/auth`

## Testing

### Quick Test Commands
```bash
# Test V1 endpoint
curl http://localhost:3000/api/v1/health

# Test V2 endpoint (requires auth)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}' | jq -r '.token')

curl http://localhost:3000/api/v2/bookings \
  -H "Authorization: Bearer $TOKEN"
```

## Future Versions

As more bounded contexts are implemented, they will be added as V2 endpoints:
- Customers (planned)
- Inventory (planned)
- Reporting (planned)

V1 endpoints will remain available for backward compatibility.