# Feature: Online Customer Bookings System

**Date Implemented**: 2024-12-01 (estimated)  
**Last Updated**: 2025-01-03  
**Implemented By**: Development Team  
**Risk Level**: HIGH (merchant isolation bug, race conditions)  
**Related Ticket/Issue**: #online-bookings

## 📋 Quick Reference

**What It Does**: Enables customers to book services online through a public-facing booking app with real-time availability checking  
**Where To Find It**: `apps/booking-app` (frontend) and `apps/api/src/public` (backend endpoints)  
**How To Test It**: Navigate to http://localhost:3001 and complete a booking flow  
**Key Dependencies**: Next.js, React Query, Prisma, PostgreSQL with pessimistic locking

## 🎯 Business Context

### Why This Feature Exists
Customers expect to book services online 24/7 without calling during business hours. This self-service booking system reduces administrative burden on merchants while increasing booking conversions and customer satisfaction.

### User Story
As a customer, I want to book beauty services online at my convenience, see real-time availability, and receive instant confirmation so I can plan my schedule without phone calls or waiting.

### Success Metrics
- [ ] 60% of bookings come through online channel
- [ ] Less than 1% booking failure rate due to conflicts
- [ ] Average booking completion time under 3 minutes
- [ ] Zero merchant data leakage between tenants

## 🏗️ Technical Implementation

### Architecture Decision
- **Multi-tenant architecture** using subdomain-based merchant isolation
- **Pessimistic locking** in database transactions to prevent double bookings
- **No temporary slot reservation** - availability checked at booking time only
- **Polling-based availability** updates rather than real-time WebSockets

### Files Modified/Created
```
CREATED:
- apps/booking-app/* - Complete Next.js customer booking application
- apps/api/src/public/public-booking.controller.ts - Public booking endpoints
- apps/api/src/public/availability.controller.ts - Availability checking endpoint
- apps/api/src/contexts/bookings/application/services/public-booking.service.ts - Business logic
- apps/api/src/contexts/bookings/application/services/booking-availability.service.ts - Slot calculation

CRITICAL BUGS FIXED (2025-01-03):
- apps/api/src/public/availability.controller.ts
  - Fixed: Was using findFirst() to get ANY merchant instead of requested one
  - Impact: Showed time slots from wrong merchant (Ngan Nails instead of Hamilton)
  
- apps/api/src/public/public-booking.controller.ts
  - Fixed: service-categories endpoint had same findFirst() bug
  - Impact: Could show services from wrong merchant
```

### Database Schema
```typescript
// No new tables - uses existing schema
Booking {
  id: string
  merchantId: string  // Critical for multi-tenant isolation
  customerId: string
  providerId: string  // Staff member
  startTime: DateTime
  endTime: DateTime
  status: BookingStatus
  // ... other fields
}

// Pessimistic locking during creation:
await prisma.$transaction(async (tx) => {
  // Lock the staff member
  const staff = await tx.staff.findUnique({
    where: { id: staffId },
    // This creates a SELECT ... FOR UPDATE lock
  });
  
  // Check for conflicts
  const conflicts = await tx.booking.findMany({
    where: { /* overlap conditions */ }
  });
  
  if (conflicts.length > 0) {
    throw new ConflictException('Time slot no longer available');
  }
  
  // Create booking
  return await tx.booking.create({ /* ... */ });
});
```

### API Endpoints
```typescript
// Get merchant information
GET /api/v1/public/merchant-info?subdomain=[merchant]
  Headers: X-Merchant-Subdomain: [merchant]
  Response: { name, timezone, currency, allowUnassignedBookings, etc }

// List available services
GET /api/v1/public/services?subdomain=[merchant]
  Headers: X-Merchant-Subdomain: [merchant]
  Response: { data: Service[] }

// Get service categories  
GET /api/v1/public/service-categories
  Headers: X-Merchant-Subdomain: [merchant]
  Response: { data: ServiceCategory[] }

// List staff members
GET /api/v1/public/staff?subdomain=[merchant]
  Headers: X-Merchant-Subdomain: [merchant]
  Response: { data: Staff[] }

// Check availability (booking app uses this)
POST /api/v1/public/bookings/check-availability
  Headers: X-Merchant-Subdomain: [merchant]
  Body: {
    date: "2025-01-04",
    services: [{ serviceId: "...", staffId: "..." }]
  }
  Response: { slots: TimeSlot[] }

// Get raw availability slots (has merchant bug until 2025-01-03)
GET /api/v1/public/availability
  Headers: X-Merchant-Subdomain: [merchant] // REQUIRED after fix
  Query: staffId, serviceId, startDate, endDate, timezone
  Response: { availableSlots: TimeSlot[] }

// Create booking
POST /api/v1/public/bookings
  Headers: X-Merchant-Subdomain: [merchant]
  Body: {
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    services: [{ serviceId: string, staffId?: string }],
    date: string,
    startTime: string,
    notes?: string
  }
  Response: { id, bookingNumber, status, etc }

// Get booking details
GET /api/v1/public/bookings/:id
  Response: { booking details }
```

### Key Components/Functions
```typescript
// Backend Services
PublicBookingService
  Location: apps/api/src/contexts/bookings/application/services/public-booking.service.ts
  Purpose: Handles public booking creation with conflict detection
  Critical Method: createPublicBooking() - has transaction with pessimistic locking

BookingAvailabilityService  
  Location: apps/api/src/contexts/bookings/application/services/booking-availability.service.ts
  Purpose: Calculates available time slots based on staff schedule and existing bookings
  Critical Method: getAvailableSlots() - filters by merchant, staff, and service

// Frontend Components
BookingPageClient
  Location: apps/booking-app/src/app/[merchant]/booking/BookingPageClient.tsx
  Purpose: Main booking flow wizard (7 steps)
  Key State: selectedServices, selectedStaff, selectedDate, selectedTime

DateTimeSelection
  Location: apps/booking-app/src/components/booking/DateTimeSelection.tsx
  Purpose: Calendar and time slot picker
  Features: Groups slots by Morning/Afternoon/Evening, shows availability

useApiClient Hook
  Location: apps/booking-app/src/hooks/use-api-client.ts
  Purpose: Ensures merchant subdomain is set on all API calls
  Critical: Without subdomain, API calls fail
```

## 🔗 Integration Points

### Upstream Dependencies
- [ ] Merchant configuration - determines booking rules and constraints
- [ ] Staff schedules - defines when bookings can be made
- [ ] Service definitions - duration and pricing information
- [ ] Customer records - created on-demand during booking

### Downstream Impact
- [ ] Merchant notifications - triggered on new bookings
- [ ] Calendar views - shows booked appointments
- [ ] Payment processing - if deposits required
- [ ] Email confirmations - sent to customers

### Critical Paths
1. Customer selects service → Checks availability → Shows time slots → Creates booking
2. Booking creation → Locks staff member → Validates no conflicts → Saves to database
3. Merchant subdomain → Determines data isolation → Prevents cross-tenant data access

## 🧪 Testing

### Manual Testing Checklist
- [ ] Access booking app with merchant subdomain (e.g., http://localhost:3001/hamilton)
- [ ] Verify only Hamilton services and staff appear
- [ ] Select a service and pick available time slot
- [ ] Complete booking with test customer info
- [ ] Attempt to book same slot again - should fail with "no longer available"
- [ ] Check different merchant (e.g., /ngan-nails) shows different services
- [ ] Test booking without selecting staff (if merchant allows unassigned)
- [ ] Verify booking appears in merchant dashboard

### Test Script
```bash
#!/bin/bash
# Test booking creation
SUBDOMAIN="hamilton"
SERVICE_ID="580115e6-6a6b-4eee-af47-161c9ca48c3d"  # Classic Facial
STAFF_ID="27597e20-198b-41a7-8411-651361d8308a"     # Emma Williams

curl -X POST "http://localhost:3000/api/v1/public/bookings?subdomain=$SUBDOMAIN" \
  -H "Content-Type: application/json" \
  -H "x-merchant-subdomain: $SUBDOMAIN" \
  -d '{
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "customerPhone": "+61 400 000 000",
    "serviceId": "'$SERVICE_ID'",
    "staffId": "'$STAFF_ID'",
    "date": "2025-01-04",
    "startTime": "09:00",
    "notes": "Test booking"
  }'
```

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ Double booking prevention - pessimistic locking in transaction
- ✅ Customer creation - automatically creates if doesn't exist
- ✅ Timezone handling - converts between UTC and location timezone
- ✅ Multi-service bookings - supports booking multiple services at once
- ✅ Unassigned bookings - if merchant allows, can book without selecting staff

### Known Limitations
- ⚠️ **No slot reservation** - selected slot can be taken before payment completes
- ⚠️ **No re-validation** - doesn't check availability again before final submission
- ⚠️ **Merchant isolation bug** (FIXED 2025-01-03) - was showing wrong merchant's slots
- ⚠️ **No booking modification** - customers can't reschedule online
- ⚠️ **No cancellation** - customers can't cancel online

### Race Condition Scenario
1. Customer A selects 9:00 AM slot
2. Customer B selects same 9:00 AM slot  
3. Customer B completes booking first
4. Customer A completes payment
5. Customer A gets "time slot no longer available" error
6. Customer A is frustrated after going through entire flow

## 🐛 Debugging Guide

### Common Issues

**Issue**: "Time slot is no longer available" error at checkout
- Check: Someone else booked the slot between selection and submission
- Check: Merchant subdomain mismatch (pre-2025-01-03 bug)
- Check: Service belongs to different merchant
- Fix: Ensure using correct merchant subdomain in all API calls

**Issue**: Wrong merchant's services/slots appearing
- Check: `/api/v1/public/availability` endpoint using findFirst()
- Check: `/api/v1/public/service-categories` endpoint using findFirst()
- Fix: Both fixed on 2025-01-03 to use merchant subdomain

**Issue**: No time slots showing
- Check: Staff working hours configured
- Check: Service duration fits in available time
- Check: Not searching too far in future (90 day limit)
- Check: Merchant subdomain header present

### Debug Commands
```bash
# Check which merchant services belong to
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.service.findUnique({
  where: { id: 'SERVICE_ID' },
  include: { merchant: true }
}).then(s => console.log(s?.merchant?.subdomain));
"

# Test availability endpoint
curl -X GET "http://localhost:3000/api/v1/public/availability?\
serviceId=SERVICE_ID&staffId=STAFF_ID&\
startDate=2025-01-04&endDate=2025-01-05&\
timezone=Australia/Sydney" \
-H "x-merchant-subdomain: hamilton"

# Check for booking conflicts
SELECT * FROM "Booking" 
WHERE "providerId" = 'STAFF_ID'
AND "status" NOT IN ('CANCELLED', 'NO_SHOW')
AND "startTime" < '2025-01-04 10:00:00'
AND "endTime" > '2025-01-04 09:00:00';
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ Time slot grouping (Morning/Afternoon/Evening boundaries)
- ✅ UI styling and layout
- ✅ Validation messages
- ✅ Available time slot intervals (15, 30, 60 minutes)

### Modify with Caution
- ⚠️ Merchant subdomain detection logic - affects data isolation
- ⚠️ Conflict detection query - must catch all overlapping bookings
- ⚠️ Transaction isolation - could cause deadlocks if changed

### Do NOT Modify Without Full Understanding
- ❌ Pessimistic locking strategy - prevents double bookings
- ❌ Multi-tenant query filters - prevents data leakage
- ❌ Database transaction boundaries - ensures data consistency

## 📊 Monitoring

### Metrics to Track
- Booking success rate - should be > 99%
- Time slot conflict rate - indicates race condition frequency
- Average booking completion time - user experience metric
- Merchant isolation violations - CRITICAL security metric

### Alerts to Configure
- Booking failure rate > 2% - indicates system issue
- Cross-tenant data access attempts - security breach
- Availability endpoint errors - affects customer experience
- Transaction deadlocks - indicates locking issue

## 🔧 Recommended Improvements

### High Priority
1. **Add slot reservation system** - Hold slot for 10 minutes during checkout
2. **Re-validate before payment** - Check availability one more time
3. **Add booking modification** - Let customers reschedule online
4. **Add cancellation** - Let customers cancel with policy enforcement

### Medium Priority
1. **WebSocket availability updates** - Real-time slot updates
2. **Waitlist functionality** - Notify when slot becomes available
3. **Recurring bookings** - Book same time weekly/monthly
4. **Group bookings** - Multiple people, same time

### Low Priority
1. **Smart time suggestions** - ML-based optimal timing
2. **Dynamic pricing** - Peak/off-peak rates
3. **Package deals** - Multiple services discount
4. **Loyalty program** - Integration with rewards

## 📝 Additional Notes

- The merchant isolation bug was critical - could have exposed customer data across businesses
- Pessimistic locking adds small performance overhead but prevents major issues
- Consider implementing optimistic UI updates with rollback for better UX
- The 90-day availability limit prevents database overload from malicious queries
- All times are stored in UTC and converted to location timezone for display

---

**Last Updated**: 2025-01-03  
**Next Review Date**: 2025-04-03