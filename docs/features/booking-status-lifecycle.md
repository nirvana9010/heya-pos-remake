# Feature: Booking State Management

**Date Implemented**: Original system (various dates)  
**Implemented By**: Original developers + Claude Code Session  
**Risk Level**: HIGH  
**Related Ticket/Issue**: Booking cancellation UI not updating, notifications not appearing

## 📋 Quick Reference

**What It Does**: Manages booking lifecycle states (confirmed → in-progress → completed/cancelled)  
**Where To Find It**: `apps/api/src/contexts/bookings/` (backend), `apps/merchant-app/src/components/` (frontend)  
**How To Test It**: Manual testing through UI or API endpoints  
**Key Dependencies**: Prisma ORM, React Query, OutboxEvent system, Cache system

## 🎯 Business Context

### Why This Feature Exists
Bookings need to progress through different states to track customer appointments from creation to completion. This enables staff to manage their daily schedule and track revenue.

### User Story
As a merchant, I want to see real-time booking status updates so that I can manage my appointments efficiently.

### Success Metrics
- [ ] Booking status changes reflect immediately in UI
- [ ] Staff can track daily appointment progress
- [ ] Notifications appear for important booking events

## 🏗️ Technical Implementation

### Architecture Decision
The system uses:
- Domain-driven design with BookingStatus value object
- Event sourcing via OutboxEvent for notifications
- Redis caching for performance
- React Query for frontend state management

### Files Modified/Created
```
KEY FILES:
Backend:
- apps/api/src/contexts/bookings/domain/value-objects/booking-status.vo.ts - Status enum definition
- apps/api/src/contexts/bookings/domain/entities/booking.entity.ts - State transition logic
- apps/api/src/contexts/bookings/application/services/booking-update.service.ts - Service methods
- apps/api/src/contexts/bookings/infrastructure/controllers/bookings.v2.controller.ts - API endpoints

Frontend:
- apps/merchant-app/src/app/(dashboard)/calendar/calendar-enhanced.tsx - Calendar display
- apps/merchant-app/src/components/BookingDetailsSlideOut.tsx - Detail view
- apps/merchant-app/src/lib/clients/bookings-client.ts - API client
```

### Database Changes
```sql
-- Booking status is stored as ENUM in PostgreSQL
CREATE TYPE "BookingStatus" AS ENUM (
  'PENDING',
  'CONFIRMED', 
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
);

-- Booking table uses this enum
ALTER TABLE "Booking" ADD COLUMN "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED';
```

### API Changes
```typescript
// Status update endpoints
PATCH /api/v2/bookings/:id/start
  Response: { ...booking, status: "IN_PROGRESS" }
  
PATCH /api/v2/bookings/:id/complete  
  Response: { ...booking, status: "COMPLETED" }
  
PATCH /api/v2/bookings/:id/cancel
  Request: { reason: string }
  Response: { ...booking, status: "CANCELLED" }
  Breaking change: NO
```

### Key Components/Functions
```typescript
// Backend BookingUpdateService methods
cancelBooking(data: CancelBookingData)
  Location: booking-update.service.ts
  Purpose: Cancels booking and creates OutboxEvent
  Used by: BookingsV2Controller
  
// Frontend updateBookingStatus  
updateBookingStatus(bookingId: string, newStatus: string)
  Location: calendar-enhanced.tsx
  Purpose: Calls API and updates local state
  Used by: Calendar UI
```

## 🔗 Integration Points

### Upstream Dependencies
- [ ] Redis Cache - Stores booking lists for performance
- [ ] OutboxEvent system - Publishes domain events
- [ ] Notification system - Creates merchant/customer notifications

### Downstream Impact
- [ ] Calendar UI - Must refresh to show status changes
- [ ] Notifications - Created from OutboxEvents
- [ ] Analytics - Tracks booking completion rates

### Critical Paths
1. User clicks "Cancel" → API called → Database updated → Cache cleared → Event created → UI refreshes
2. OutboxPublisher polls → Finds events → Publishes to EventEmitter → Handlers create notifications

## 🧪 Testing

### Manual Testing Checklist
- [ ] Create a new booking - verify status is "confirmed"
- [ ] Click "Start" - verify status changes to "in-progress"
- [ ] Click "Complete" - verify status changes to "completed"  
- [ ] Click "Cancel" - verify status changes to "cancelled"
- [ ] Refresh page - verify status persists
- [ ] Check notifications bell - verify notification appears (may take 5-10 seconds)

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ Cannot cancel already cancelled booking - Returns 400 error
- ✅ Status transitions are validated - Can't go from completed to in-progress

### Known Limitations
- ⚠️ **Cache invalidation missing for cancel** - BookingUpdateService.cancelBooking() doesn't clear cache
- ⚠️ **Notification delay** - OutboxPublisher polls every 5 seconds, notifications not instant
- ⚠️ **Frontend overwrites status** - calendar-enhanced.tsx line 235 overwrites API response with local status

### Performance Notes
- Cache TTL is aggressive to improve performance but causes stale data issues
- OutboxEvent processing is async and can be delayed under load

## 🐛 Debugging Guide

### Common Issues

**Issue**: Cancelled booking still shows as "confirmed" in UI
- Check: Browser Network tab - is the API returning the old status?
- Check: Is cache being cleared after cancellation?
- Fix: Add cache invalidation to cancelBooking method

**Issue**: Notifications don't appear immediately  
- Check: Are OutboxEvents being created? Check database
- Check: Is OutboxPublisher running? Check pm2 logs
- Check: Is refreshNotifications() being called too early (before event processed)?
- Fix: Increase delay or implement proper WebSocket/SSE

### Debug Commands
```bash
# Check if OutboxEvents are created
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.outboxEvent.findMany({where:{eventType:'cancelled'},take:5}).then(console.log)"

# Check API logs for errors
pm2 logs api --lines 100 | grep -E "cancelBooking|OutboxPublisher"

# Check if notifications exist in database
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.merchantNotification.findMany({orderBy:{createdAt:'desc'},take:5}).then(console.log)"
```

### Key Log Entries
```
[BookingUpdateService] Starting cancelBooking
[BookingUpdateService] Booking cancelled in DB
[OutboxPublisher] Publishing event: booking.cancelled
[NotificationEventHandler] Handling booking cancelled event
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ Notification delay timing
- ✅ UI status badge colors and icons

### Modify with Caution
- ⚠️ Status transition logic in Booking entity
- ⚠️ Cache invalidation patterns

### Do NOT Modify Without Full Understanding
- ❌ BookingStatus enum values (database migration required)
- ❌ OutboxEvent structure (affects all event handlers)

## 📊 Monitoring

### Metrics to Track
- Cache hit/miss ratio - High miss rate indicates cache issues
- OutboxEvent processing delay - Should be < 10 seconds
- Failed status transitions - Indicates business logic violations

### Alerts to Configure
- OutboxEvent backlog > 100 - Publisher may be stuck
- Cache invalidation failures - Will cause stale data

## 🔗 Related Documentation

- [Notification System Documentation](./real-time-merchant-notifications.md)
- [Cache Strategy Documentation](./caching.md)
- [Event Sourcing Pattern](./event-sourcing.md)

## 📝 Additional Notes

### Current Bugs (as of 2025-07-01)

1. **Cancel doesn't update UI**: `cancelBooking` in BookingUpdateService doesn't invalidate cache, causing API to return stale data

2. **Frontend overwrites status**: Line 235 in calendar-enhanced.tsx should not override status:
   ```typescript
   // WRONG
   b.id === bookingId ? { ...b, ...updatedBooking, status: newStatus as any } : b
   
   // CORRECT  
   b.id === bookingId ? { ...b, ...updatedBooking } : b
   ```

3. **Notification refresh timing**: 1-2 second delay is too short for OutboxEvent processing (5 second poll interval)

### Recommended Fixes

1. Add cache invalidation to cancelBooking method
2. Remove status override in frontend
3. Implement WebSocket/SSE for real-time notifications instead of polling

---

**Last Updated**: 2025-07-01  
**Next Review Date**: 2025-10-01