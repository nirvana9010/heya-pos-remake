# Unified Staff Assignment Implementation

## Overview
This document describes the implementation to unify staff assignment logic between the booking app and slideout when `allowUnassignedBookings = false`.

## Problem Statement
When `allowUnassignedBookings = false`, both the booking app and slideout auto-assign staff, but they used different algorithms:
- **Booking App**: Simple assignment to first staff member (`staff[0].id`)
- **Slideout**: Intelligent assignment based on availability and workload balancing

## Solution Implemented

### 1. Enhanced Booking App Logic
Created an intelligent staff selection function in `BookingPageClient.tsx` that:
- Filters out "Unassigned" and inactive staff
- Uses a rotation-based assignment to distribute bookings evenly
- Uses date and time as a seed for consistent but varied assignment

```typescript
function selectBestAvailableStaff(staff: Staff[], selectedDate: Date | undefined, selectedTime: string | null): string | null {
  // Filter eligible staff
  const eligibleStaff = staff.filter(s => 
    s.name.toLowerCase() !== 'unassigned' && 
    s.isActive
  );
  
  // Use date/time for rotation
  let rotationSeed = 0;
  if (selectedDate) {
    rotationSeed += selectedDate.getDate() + (selectedDate.getMonth() * 31);
  }
  if (selectedTime) {
    const hour = parseInt(selectedTime.split(':')[0] || '0');
    rotationSeed += hour;
  }
  
  // Select staff based on rotation
  const selectedIndex = rotationSeed % eligibleStaff.length;
  return eligibleStaff[selectedIndex].id;
}
```

### 2. Why Not Full Workload Balancing?
The booking app cannot implement the same workload-based assignment as the slideout because:
- **Privacy**: The booking app doesn't have access to all bookings data
- **Security**: Exposing all bookings to the public API would be a security risk
- **Performance**: Loading all bookings for every customer would be inefficient

### 3. Rotation-Based Distribution
The implemented solution uses a deterministic rotation based on:
- **Date**: Different days select different staff
- **Time**: Different hours further vary the selection
- **Result**: Bookings are distributed across staff members predictably but fairly

## Test Results

The test script (`test-unified-staff-assignment.js`) confirms:

1. **Setting Enforcement**: When `allowUnassignedBookings = false`, bookings without staff are rejected
2. **Auto-Assignment**: The booking app correctly auto-assigns staff using the rotation algorithm
3. **Distribution**: Staff assignments are distributed across team members

Example distribution:
```
Date: 2024-01-15, Time: 10:00 → Assigned to: Mike Johnson
Date: 2024-01-15, Time: 14:00 → Assigned to: Emma Wilson
Date: 2024-01-16, Time: 10:00 → Assigned to: Emma Wilson
Date: 2024-01-16, Time: 14:00 → Assigned to: Sarah Chen
Date: 2024-01-17, Time: 10:00 → Assigned to: Sarah Chen
```

## Future Improvements

1. **Backend Auto-Assignment**: Move the assignment logic to the backend where it can access booking counts
2. **Staff Availability API**: Create a public endpoint that returns staff with availability indicators
3. **Preference-Based Assignment**: Consider service-staff preferences in the assignment

## Configuration

The behavior is controlled by the merchant setting `allowUnassignedBookings`:

**When TRUE (default):**
- Customers selecting "Any Available" → Creates unassigned bookings
- Bookings appear in the "Unassigned" column
- Staff must manually assign these bookings later

**When FALSE:**
- Customers selecting "Any Available" → Auto-assigns a staff member
- Uses rotation-based fair distribution algorithm
- Bookings are immediately assigned to a specific staff member

**Important:** Customers can ALWAYS select "Any Available" - the setting only controls what happens when they do.