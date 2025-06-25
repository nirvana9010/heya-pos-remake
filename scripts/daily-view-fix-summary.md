# Daily View Fix Summary

## Issue
Bookings weren't showing in Daily view after the timezone and unassigned booking fixes.

## Root Cause
The filtering logic was excluding unassigned bookings (with `staffId: null`) because:
1. When staff loads, `selectedStaffIds` is set to all staff IDs
2. Unassigned bookings have `staffId: null`, which isn't in the `selectedStaffIds` array
3. The filter was rejecting these bookings

## Fix Applied
Updated the filtering logic in `CalendarPageContent.tsx`:
```javascript
// For unassigned bookings, always show them if unassigned column is visible
if (booking.staffId === null) {
  return showUnassignedColumn;
}
// For assigned bookings, check if staff is selected
if (!filters.selectedStaffIds.includes(booking.staffId)) {
  return false;
}
```

## Result
- Unassigned bookings now show in the calendar when the unassigned column is visible
- Regular bookings continue to be filtered by selected staff
- Daily, Weekly, and Monthly views all work correctly

## Testing
1. Create a booking with "Any Available" staff
2. View calendar in Daily view
3. Booking should appear in the "Unassigned" column
4. All views (Daily, Weekly, Monthly) should show bookings correctly