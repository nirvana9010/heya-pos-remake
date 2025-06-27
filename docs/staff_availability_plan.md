# Staff Availability System Implementation Plan

## Overview
Implement a proper "Next Available" feature that actually checks staff availability based on existing bookings, working hours, and service capabilities.

## Current State
- "Next Available" simply assigns the first staff member in the list
- No availability checking
- No service-staff capability validation
- Can create double bookings

## Proposed Solution

### Phase 1: Backend Infrastructure (Foundation)
1. **Create Availability Service** (`apps/api/src/availability/availability.service.ts`)
   - Method: `getAvailableStaff(serviceId, startTime, duration, locationId)`
   - Returns: Array of available staff members sorted by availability score

2. **Add API Endpoint** (`/api/v1/availability/staff`)
   - Query params: `serviceId`, `startTime`, `duration`, `locationId`
   - Response: Available staff with time slots

3. **Enhance Database Schema**
   - Add `staff_services` table to track which staff can perform which services
   - Add `staff_schedules` table for working hours
   - Add indexes for performance

### Phase 2: Availability Logic
1. **Check Existing Bookings**
   ```typescript
   // Check for conflicts with existing bookings
   const conflicts = await prisma.booking.findMany({
     where: {
       providerId: staffId,
       status: { in: ['confirmed', 'in-progress'] },
       OR: [
         // New booking starts during existing
         { startTime: { lte: newStart }, endTime: { gt: newStart } },
         // New booking ends during existing
         { startTime: { lt: newEnd }, endTime: { gte: newEnd } },
         // New booking encompasses existing
         { startTime: { gte: newStart }, endTime: { lte: newEnd } }
       ]
     }
   });
   ```

2. **Check Working Hours** (if implemented)
   - Verify staff is scheduled to work at requested time
   - Check for break times

3. **Check Service Capabilities**
   - Ensure staff is trained/authorized for the service
   - Consider skill levels if applicable

4. **Scoring Algorithm**
   - Prioritize staff with fewer bookings (load balancing)
   - Consider travel time between appointments
   - Factor in staff preferences

### Phase 3: Frontend Integration (Immediate Implementation)
1. **Update BookingSlideOut Component**
   - Add loading state for availability check
   - Fetch available staff when service + time selected
   - Update dropdown to show only available staff
   - Show "No staff available" message when applicable

2. **Update CalendarPage Component**
   - Replace hardcoded first-staff assignment
   - Call availability API
   - Handle no-availability scenario

3. **API Client Updates**
   - Add `getAvailableStaff` method to API client
   - Handle error cases

### Phase 4: Enhanced Features (Future)
1. **Smart Suggestions**
   - Suggest alternative time slots if no staff available
   - Show next available slot for preferred staff

2. **Visual Indicators**
   - Show staff workload in dropdown
   - Display availability heatmap

3. **Optimization**
   - Cache availability data
   - Implement real-time updates

## Implementation Order
1. Phase 3 first (Frontend) - Immediate improvement with mock data
2. Phase 1 (Backend Infrastructure) - Build the foundation
3. Phase 2 (Logic) - Implement actual availability checking
4. Phase 4 (Enhancements) - Additional features

## Phase 3 Implementation Details (Immediate)

### Step 1: Create Mock Availability Service
Create a temporary frontend service that simulates availability checking:
```typescript
// apps/merchant-app/src/lib/services/mock-availability.service.ts
export async function getAvailableStaff(
  serviceId: string,
  startTime: Date,
  staffList: Staff[],
  bookings: Booking[]
): Promise<Staff[]> {
  // Filter out staff with conflicts
  return staffList.filter(staff => {
    const hasConflict = bookings.some(booking => 
      booking.staffId === staff.id &&
      isTimeConflict(booking, startTime)
    );
    return !hasConflict;
  });
}
```

### Step 2: Update BookingSlideOut
- Add state for available staff
- Fetch availability when service + time selected
- Update UI to show availability status

### Step 3: Update CalendarPage
- Replace simple assignment with availability check
- Show appropriate error messages

### Step 4: User Experience
- Show loading spinner during availability check
- Clear messaging when no staff available
- Suggest alternative times if possible

## Success Criteria
1. "Next Available" only shows actually available staff
2. No double bookings possible
3. Clear user feedback when no availability
4. Improved load distribution across staff

## Migration Path
1. Deploy Phase 3 with mock implementation
2. Build backend in parallel
3. Switch from mock to real API when ready
4. No breaking changes for users