# V1 vs V2 Endpoint Usage Guide

## Quick Reference

### Use V1 Endpoints For:
- **Authentication** - All auth endpoints remain V1
- **Simple CRUD Operations** - Staff, Customers, Services, etc.
- **Existing Features** - Everything except bookings
- **Public API** - All public endpoints use V1

### Use V2 Endpoints For:
- **Bookings** - All booking-related operations
- **Complex Business Logic** - Features with multiple states and workflows
- **Event-Driven Features** - Where domain events are needed

## Complete Endpoint Reference

### Authentication (V1 Only)
```
POST   /api/v1/auth/merchant/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/merchant/change-password
POST   /api/v1/auth/verify-action
GET    /api/v1/auth/session
GET    /api/v1/auth/health
```

### Bookings (V2 Only)
```
GET    /api/v2/bookings              # List bookings with filtering
GET    /api/v2/bookings/calendar     # Calendar view of bookings
GET    /api/v2/bookings/availability  # Check available time slots
GET    /api/v2/bookings/:id          # Get single booking details
POST   /api/v2/bookings              # Create new booking
PATCH  /api/v2/bookings/:id          # Update booking details
PATCH  /api/v2/bookings/:id/start    # Start a booking
PATCH  /api/v2/bookings/:id/complete # Complete a booking
PATCH  /api/v2/bookings/:id/cancel   # Cancel a booking
DELETE /api/v2/bookings/:id          # Delete a booking
```

### Customers (V1 Only)
```
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id
GET    /api/v1/customers/export
POST   /api/v1/customers/import
```

### Services (V1 Only)
```
GET    /api/v1/services
POST   /api/v1/services
GET    /api/v1/services/:id
PATCH  /api/v1/services/:id
DELETE /api/v1/services/:id
POST   /api/v1/services/import
POST   /api/v1/services/import/csv
PATCH  /api/v1/services/reorder
PATCH  /api/v1/services/bulk/status
```

### Service Categories (V1 Only)
```
GET    /api/v1/service-categories
POST   /api/v1/service-categories
PATCH  /api/v1/service-categories/:id
DELETE /api/v1/service-categories/:id
```

### Staff (V1 Only)
```
GET    /api/v1/staff
POST   /api/v1/staff
GET    /api/v1/staff/:id
PATCH  /api/v1/staff/:id
DELETE /api/v1/staff/:id
```

### Payments (V1 Only)
```
POST   /api/v1/payments/process
POST   /api/v1/payments/split
POST   /api/v1/payments/refund
POST   /api/v1/payments/void/:paymentId
POST   /api/v1/payments/orders
GET    /api/v1/payments/orders/:orderId
POST   /api/v1/payments/orders/:orderId/items
POST   /api/v1/payments/orders/:orderId/modifiers
POST   /api/v1/payments/orders/:orderId/state
POST   /api/v1/payments/orders/from-booking/:bookingId
GET    /api/v1/payments
```

### Locations (V1 Only)
```
GET    /api/v1/locations
GET    /api/v1/locations/:id
PATCH  /api/v1/locations/:id
PATCH  /api/v1/locations/:id/timezone
```

### Merchant (V1 Only)
```
GET    /api/v1/merchant/settings
PUT    /api/v1/merchant/settings
GET    /api/v1/merchant/profile
GET    /api/v1/merchant/settings/debug
GET    /api/v1/merchant/settings/raw
```

### Loyalty (V1 Only)
```
GET    /api/v1/loyalty/program
POST   /api/v1/loyalty/program
GET    /api/v1/loyalty/customers/:customerId
POST   /api/v1/loyalty/redeem-visit
POST   /api/v1/loyalty/redeem-points
POST   /api/v1/loyalty/adjust
GET    /api/v1/loyalty/check/:customerId
```

### Public Endpoints (V1 Only)
```
GET    /api/v1/public/merchant-info
GET    /api/v1/public/services
GET    /api/v1/public/staff
POST   /api/v1/public/customers/lookup
GET    /api/v1/public/service-categories
POST   /api/v1/public/bookings/check-availability
POST   /api/v1/public/bookings
GET    /api/v1/public/bookings/:id
GET    /api/v1/public/availability
```

### Admin/Monitoring (V1 Only)
```
GET    /api/v1/admin/outbox/status
GET    /api/v1/admin/outbox/unprocessed
```

## Key Differences

### V1 Endpoints
- Direct database access through Prisma
- Simple request/response pattern
- Synchronous operations
- Traditional REST semantics

### V2 Endpoints
- Command/Query separation (CQRS)
- Domain-driven design with bounded contexts
- Event sourcing capabilities via Outbox pattern
- Rich domain models with business logic
- Asynchronous event handling

## Migration Status

| Feature | V1 Status | V2 Status | Notes |
|---------|-----------|-----------|-------|
| Authentication | ✅ Active | ❌ Not Planned | Will remain V1 |
| Bookings | ❌ Removed | ✅ Active | Fully migrated to V2 |
| Customers | ✅ Active | 🔄 Planned | Next migration candidate |
| Services | ✅ Active | 🔄 Planned | Future migration |
| Staff | ✅ Active | 🔄 Planned | Future migration |
| Payments | ✅ Active | 🔄 Planned | Complex - needs careful planning |
| Loyalty | ✅ Active | 🔄 Planned | Low priority |
| Public API | ✅ Active | ❌ Not Planned | Will remain V1 for compatibility |

## Frontend Integration Notes

### API Client Configuration
The frontend API client (`api-client.ts`) automatically routes to the correct version:
- `/bookings/*` → `/api/v2/bookings/*`
- All other paths → `/api/v1/*`

### Response Format Differences
V2 endpoints may have different response formats:
- V1: Direct database models (nested relations)
- V2: Flattened DTOs optimized for frontend use

Example:
```javascript
// V1 Response
{
  customer: {
    firstName: "John",
    lastName: "Doe"
  }
}

// V2 Response
{
  customerName: "John Doe"
}
```

## Best Practices

1. **Don't Mix Versions** - Use either V1 or V2 for a complete feature
2. **Check Response Formats** - V2 may return data differently
3. **Use Specific Actions** - V2 prefers specific endpoints over generic updates
4. **Handle Events** - V2 endpoints may trigger domain events
5. **Test Thoroughly** - V2 has different error handling patterns

## Troubleshooting

### Common Issues

1. **404 Not Found**
   - Check you're using the correct version prefix
   - Ensure the endpoint exists in that version

2. **Different Response Format**
   - V2 endpoints return flattened/optimized data
   - Update frontend transformations accordingly

3. **Missing Generic Operations**
   - V2 uses specific actions (start, complete, cancel)
   - No generic status updates in V2

4. **Authentication Errors**
   - All versions use V1 auth endpoints
   - Token works across all versions

## Future Roadmap

### Next V2 Migrations (Priority Order)
1. **Customers** - Has complex relationships and would benefit from bounded context
2. **Inventory** - Natural fit for event sourcing
3. **Reporting** - Read models perfect for CQRS
4. **Services** - Could benefit from rich domain logic

### Will Remain V1
- Authentication (stable, no complex domain logic)
- Public API (backward compatibility)
- Simple lookups (locations, settings)