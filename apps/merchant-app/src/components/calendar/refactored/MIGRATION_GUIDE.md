# Calendar Refactor Migration Guide

## Overview
This guide explains how to migrate from the monolithic 2962-line `CalendarPageContent.tsx` to the new modular, resilient calendar architecture.

## Key Improvements

### 1. **Proper State Management**
- ❌ **Before**: 20+ useState hooks scattered throughout
- ✅ **After**: Single useReducer with typed actions in CalendarProvider

### 2. **Timezone Handling**
- ❌ **Before**: Inconsistent date handling causing timezone bugs
- ✅ **After**: Centralized timezone-aware date handling using existing `date-utils.ts`

### 3. **Separation of Concerns**
- ❌ **Before**: Single 2962-line God Component
- ✅ **After**: Modular architecture with:
  - `CalendarProvider.tsx` - State management
  - `types.ts` - Type definitions
  - `hooks.ts` - Reusable logic
  - `views/DailyView.tsx` - View-specific rendering

### 4. **Performance**
- ❌ **Before**: Re-renders entire component on any state change
- ✅ **After**: Optimized with useMemo, useCallback, and focused updates

### 5. **Maintainability**
- ❌ **Before**: Fragile code that breaks with "every little change"
- ✅ **After**: Isolated components with clear responsibilities

## Migration Steps

### Step 1: Test the New Calendar
The new calendar is in `/components/calendar/refactored/`. To test it:

```tsx
// In your test page or route:
import { CalendarPage } from '@/components/calendar/refactored/CalendarPage';

export default function TestCalendarPage() {
  return <CalendarPage />;
}
```

### Step 2: Update the Route
Once verified, update the calendar route:

```tsx
// apps/merchant-app/src/app/(dashboard)/calendar/page.tsx
import { CalendarPage } from '@/components/calendar/refactored/CalendarPage';

export default function CalendarRoute() {
  return <CalendarPage />;
}
```

### Step 3: Remove Old Code
After confirming everything works:
1. Delete `/app/(dashboard)/calendar/CalendarPageContent.tsx`
2. Delete related debug files
3. Update any imports

## Architecture Overview

```
components/calendar/refactored/
├── CalendarProvider.tsx    # State management with useReducer
├── types.ts               # TypeScript interfaces
├── hooks.ts               # Custom hooks for calendar logic
├── CalendarPage.tsx       # Main component with UI chrome
├── views/
│   ├── DailyView.tsx     # Daily calendar view
│   ├── WeeklyView.tsx    # Weekly view (to be implemented)
│   └── MonthlyView.tsx   # Monthly view (to be implemented)
└── MIGRATION_GUIDE.md     # This file
```

## Key Differences

### State Access
```tsx
// Before - Direct useState
const [bookings, setBookings] = useState([]);
const [selectedStaffIds, setSelectedStaffIds] = useState([]);

// After - Context with actions
const { state, actions } = useCalendar();
const { bookings, selectedStaffIds } = state;
actions.setStaffFilter(['staff-1', 'staff-2']);
```

### Date Handling
```tsx
// Before - Manual date manipulation
const date = new Date();
date.setHours(10, 0, 0, 0);

// After - Timezone-aware utilities
import { toMerchantTime, formatInMerchantTime } from '@/lib/date-utils';
const merchantTime = toMerchantTime(new Date());
```

### Booking Updates
```tsx
// Before - Direct API calls mixed with UI
const updateBooking = async (id, data) => {
  // API call
  // Manual state update
  // UI updates
};

// After - Clean separation
const { updateBookingTime } = useBookingOperations();
await updateBookingTime(bookingId, newDate, newTime, staffId);
```

## Benefits

1. **Resilient to Changes**: Each component has a single responsibility
2. **Easy to Debug**: Clear data flow and isolated logic
3. **Better Performance**: Optimized re-renders and memoization
4. **Type Safety**: Full TypeScript coverage with proper types
5. **Testable**: Each piece can be tested in isolation

## Next Steps

1. **Weekly View**: Implement `WeeklyView.tsx` following the same pattern
2. **Monthly View**: Implement `MonthlyView.tsx` 
3. **Filters UI**: Add advanced filtering UI components
4. **Optimize**: Add virtualization for large booking lists

## Troubleshooting

### Issue: Bookings not showing
- Check `filteredBookings` in CalendarProvider
- Verify date range is correct
- Ensure staff filter includes the booking's staff

### Issue: Drag and drop not working
- Verify DndContext is properly wrapped
- Check that booking IDs are unique
- Ensure drop targets have correct data

### Issue: Timezone problems
- Always use `toMerchantTime` for display
- Use `toUTC` when sending to API
- Never use `toISOString()` for date-only values

## Summary

This refactor addresses the core issue: **"The daily view is fundamentally broken - it stops working every other day with any and every little change."**

The new architecture ensures:
- Changes are isolated and predictable
- State management is centralized
- Timezone handling is consistent
- Components are reusable and testable

No more fragile code. No more breaking with every change.