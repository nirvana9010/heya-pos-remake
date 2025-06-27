# Next Available Staff Selection Fix

## Problem
When creating a booking and selecting "Next Available" for staff, the booking creation fails because:
1. The frontend sends an empty string (`''`) for `staffId` when "Next Available" is selected
2. The API requires a valid UUID for `staffId` (either at booking level or service level)
3. There is no backend logic to automatically assign available staff

## Solution Implemented
The fix is implemented in the frontend (`CalendarPage.tsx`) to handle "Next Available" selection:

### Code Changes
1. **File**: `apps/merchant-app/src/components/calendar/refactored/CalendarPage.tsx`
   - When `staffId` is empty (indicating "Next Available" was selected), the system now automatically assigns the first available staff member
   - Added logging to track when automatic assignment happens
   - Shows clear error if no staff members are available

2. **File**: `apps/merchant-app/src/components/BookingSlideOut.tsx`
   - Updated confirmation screen to show "Next Available (will be auto-assigned)" when no specific staff is selected
   - This provides clarity to users about what will happen

### How It Works
```javascript
// When staffId is empty string (Next Available), find an available staff member
if (!assignedStaffId && state.staff.length > 0) {
  // For now, just use the first staff member
  // TODO: Implement proper availability checking
  assignedStaffId = state.staff[0].id;
  console.log('No staff selected, assigning to first available:', state.staff[0].name);
}
```

## Limitations
1. **No True Availability Checking**: Currently just assigns to the first staff member in the list
2. **No Load Balancing**: Doesn't consider existing bookings or staff workload
3. **No Skill Matching**: Doesn't check if the staff member can perform the selected service

## Future Improvements
To implement proper "Next Available" functionality:

1. **Backend Enhancement**: Create an API endpoint like `/api/v1/staff/next-available` that:
   - Accepts: `serviceId`, `startTime`, `duration`
   - Returns: The best available staff member based on:
     - Current schedule availability
     - Service capabilities
     - Workload distribution
     - Break times and working hours

2. **Frontend Enhancement**: 
   - Call the availability endpoint when "Next Available" is selected
   - Show which staff member will be assigned before confirmation
   - Allow manual override if the suggested staff isn't suitable

3. **Alternative Approach**: 
   - Allow bookings to be created without staff assignment
   - Implement a queue system for unassigned bookings
   - Add admin functionality to assign staff later

## Testing
Use the provided test script to verify the fix:
```bash
node test-next-available-fix.js
```

The test confirms that:
1. The API rejects bookings without staffId
2. The frontend fix assigns a staff member when "Next Available" is selected
3. Users see appropriate messaging about auto-assignment