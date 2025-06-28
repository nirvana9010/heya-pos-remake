# Calendar Refresh Issue - Bookings Created via Public API

## Problem Summary
When bookings are created through the booking app (public API), they appear in the "Unassigned" column on the merchant calendar, even when:
1. `allowUnassignedBookings` is set to `false`
2. A staff member is explicitly assigned
3. The database correctly stores the `providerId`

## Root Cause Analysis

### 1. **Database State is Correct**
Testing confirms that bookings ARE correctly saved in the database:
```javascript
// Database shows:
providerId: "27597e20-198b-41a7-8411-651361d8308a"
provider: { firstName: "Emma", lastName: "Williams" }
```

### 2. **Calendar Caching Issue**
The calendar component maintains local state and doesn't automatically refresh when bookings are created externally:

```typescript
// CalendarPage.tsx - When booking created via slideout:
actions.addBooking(transformedBooking);  // Adds to local state immediately

// But bookings created via public API are not added to local state
```

### 3. **API Response Consistency**
The public booking API and merchant booking API return slightly different response structures:
- Public API returns: `staffId`, `staffName`
- V2 Merchant API returns: `staffId` (derived from `providerId`), `staffName`

## Quick Verification

1. Create a booking via the booking test page with "Any Available" selected
2. Note the staff member assigned in the response
3. **Refresh the merchant calendar page (F5)**
4. The booking should now appear in the correct staff column

## Solutions

### Short-term Workaround
- Manually refresh the calendar after creating bookings via public API
- Add a "Refresh" button to the calendar toolbar

### Long-term Solutions

#### Option 1: Auto-refresh Calendar
Add periodic refresh to the calendar:
```typescript
// In CalendarPage or hooks.ts
useEffect(() => {
  const interval = setInterval(() => {
    refresh(); // Refresh bookings every 30 seconds
  }, 30000);
  
  return () => clearInterval(interval);
}, [refresh]);
```

#### Option 2: WebSocket/Real-time Updates
Implement real-time updates using WebSockets or Server-Sent Events to push new bookings to all connected clients.

#### Option 3: Cache Invalidation
Add cache invalidation headers or use React Query with proper cache invalidation when bookings are created.

#### Option 4: Optimistic Updates
When creating bookings through any channel, broadcast the change to update all components.

## Testing the Fix

Use the debug script to verify database state:
```bash
node check-booking-database.js
```

Expected output:
```
=== COLUMN PLACEMENT ===
✓ This booking appears in: Emma Williams column
```

## Related Files
- `/apps/merchant-app/src/components/calendar/refactored/hooks.ts` - Calendar data fetching
- `/apps/merchant-app/src/components/calendar/refactored/CalendarPage.tsx` - Calendar state management
- `/apps/api/src/contexts/bookings/application/services/public-booking.service.ts` - Booking creation logic
- `/apps/booking-app/src/app/booking-test/page.tsx` - Test page with refresh notice

## Notes
- This is NOT a bug in the booking creation logic
- The database is correctly storing staff assignments
- The issue is purely a frontend state synchronization problem
- Common in SPAs where multiple entry points can modify shared data