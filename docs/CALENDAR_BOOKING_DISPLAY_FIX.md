# Calendar Booking Display Fix

## Problem
Bookings were visible in the Bookings tab but NOT showing in the Calendar view. User reported this issue multiple times with increasing frustration.

## Root Cause
The calendar's time slot matching logic had a critical bug:

1. **Time slots were created with `new Date()`** which used today's date
2. **Booking times were compared using `slot.time.getHours()`** 
3. When viewing a different date (e.g., June 17), the slot's date didn't match the booking's date
4. The slot object was missing `hour` and `minute` properties that the code expected

## The Fix

### 1. Added missing properties to time slots
```javascript
// Before
slots.push({
  time,
  label: format(time, isHour ? "h a" : "h:mm"),
  // ... other properties
});

// After
slots.push({
  time,
  hour,    // Added
  minute,  // Added
  label: format(time, isHour ? "h a" : "h:mm"),
  // ... other properties
});
```

### 2. Fixed time slot comparisons
```javascript
// Before (broken)
b.startTime.getHours() === slot.time.getHours() &&
b.startTime.getMinutes() === slot.time.getMinutes()

// After (fixed)
b.startTime.getHours() === slot.hour &&
b.startTime.getMinutes() === slot.minute
```

## Additional Issues Found

### V2 API Missing staffId
The V2 bookings endpoint was missing the `staffId` field, causing all bookings to be filtered out:
- Fixed in `get-bookings-list.handler.ts` by adding `staffId: booking.provider.id`
- Updated the `BookingListItem` interface to include `staffId`

### Timezone Issues
Bookings appearing at midnight may indicate timezone conversion problems:
- API returns times in UTC (ISO format)
- Frontend converts to local Date objects
- Need to ensure consistent timezone handling

## Key Files Modified
- `/apps/merchant-app/src/app/calendar/CalendarPageContent.tsx` - Main calendar fix
- `/apps/api/src/contexts/bookings/application/queries/handlers/get-bookings-list.handler.ts` - Added staffId
- `/apps/api/src/contexts/bookings/application/read-models/booking-list-item.model.ts` - Added staffId to interface

## Testing
1. Check browser console for debug logs showing booking/staff matching
2. Verify bookings appear at their correct time slots
3. Ensure bookings show when switching between dates
4. Check that staff filtering works correctly