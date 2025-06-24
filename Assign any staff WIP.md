# "Any Available" Staff Assignment - Work in Progress

## Summary of Work Done

### 1. Fixed Initial UI Blocking Issue
- **File**: `/apps/booking-app/src/app/booking/BookingPageClient.tsx`
- **Fix**: Changed `canProceed` function to allow empty string for "Any Available" selection
```typescript
// Before:
return !!selectedStaff;
// After:
return selectedStaff !== null && selectedStaff !== undefined;
```

### 2. Enabled Unassigned Column by Default
Updated default settings to show unassigned column in:
- `/apps/api/src/merchant/merchant.constants.ts`
- `/apps/merchant-app/src/app/(dashboard)/calendar/CalendarPageContent.tsx`
- `/apps/merchant-app/src/app/(dashboard)/settings/page.tsx`

### 3. Updated Booking Creation API
- **File**: `/apps/api/src/contexts/bookings/application/services/public-booking.service.ts`
- Modified to allow `null` providerId for unassigned bookings
- Updated conflict checking to only check when staffId is provided
- Fixed response handling for unassigned bookings (staffName: 'Unassigned')

### 4. Fixed Availability Checking
- Updated `checkAvailability` method to properly check staff availability for "Any Available"
- Now checks if at least one staff member is available instead of just checking any bookings

## Current Issue

The booking creation is failing with `createdById: null` error. The Prisma schema requires `createdById` (not nullable), but when trying to find an active staff member to use as creator, the query seems to return null.

### Debug Info
- Hamilton merchant has 4 active staff members (confirmed via check-staff.js)
- The PublicBookingService is finding the correct merchant
- But `anyActiveStaff` query is returning null despite active staff existing

### Code State
```typescript
// Current problematic code in PublicBookingService
const anyActiveStaff = await this.prisma.staff.findFirst({
  where: {
    merchantId: merchant.id,
    status: 'ACTIVE',
    NOT: {
      firstName: 'Unassigned',
    },
  },
  orderBy: {
    createdAt: 'asc',
  },
});

// This is returning null even though active staff exist
```

## Next Steps

1. **Debug why staff query returns null**
   - Check if merchant ID mismatch
   - Check if Prisma connection issue
   - Add more detailed logging

2. **Alternative approach**: Instead of requiring a creator staff, consider:
   - Making `createdById` nullable in schema (migration needed)
   - OR creating a system user that's hidden from UI
   - OR using merchant owner as default creator

3. **Test thoroughly**
   - Ensure unassigned bookings appear in calendar
   - Verify drag-and-drop assignment works
   - Check that unassigned staff doesn't appear in staff management

## Files Modified
- `/apps/booking-app/src/app/booking/BookingPageClient.tsx`
- `/apps/api/src/contexts/bookings/application/services/public-booking.service.ts`
- `/apps/api/src/merchant/merchant.constants.ts`
- `/apps/merchant-app/src/app/(dashboard)/calendar/CalendarPageContent.tsx`
- `/apps/merchant-app/src/app/(dashboard)/settings/page.tsx`
- `/apps/api/prisma/seed.ts` (attempted to add Unassigned staff, then reverted)

## Test Script
Created `/scripts/test-any-available-booking.js` to test the flow end-to-end.

## Key Insight from User
"The unassigned staff should not be an editable staff member. It exists as a valid staff member for booking purposes but user can't see it or edit it in the Staff page."

This means we need a special handling for unassigned bookings, not a visible staff member.