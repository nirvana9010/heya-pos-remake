# Session: Parameter Mismatch Debugging - Status Validation Error

**Date**: 2025-07-01
**Issue**: Persistent "status: must be one of: confirmed, in-progress, completed, cancelled" error
**Resolution**: Fixed parameter mismatch in event handlers

## Problem Summary

After ~20 failed attempts to fix what appeared to be a status validation error, the real issue was discovered to be a parameter mismatch in UI event handlers.

## Root Cause

**Parameter mismatch in event handlers:**
- `BookingActions` component called: `onStatusChange(bookingId, status)` 
- `BookingDetailsSlideOut` handler expected: `(status)`
- Result: The booking ID (UUID) was passed as the status parameter, causing validation to fail

## Key Mistakes Made

1. **Assumed error message was accurate** - Spent multiple attempts fixing status values when the actual value being passed was a UUID
2. **Fixed the wrong component** - Modified calendar-enhanced.tsx without verifying it was actually being used (app was using refactored CalendarPage)
3. **Wrong layer focus** - Kept fixing API validation and data transformation when issue was in UI event handling
4. **Didn't log actual values** - Would have immediately seen UUID being passed as status
5. **Poor comparison strategy** - Compared working "Mark as Paid" feature without noticing it masked the same issue by ignoring parameters

## Critical Debugging Lessons

### 1. Always Log Actual Values
```typescript
// Add logging at both ends
console.log('Calling with:', param1, param2);
onClick={() => handler(param1, param2)}

const handler = (received1, received2) => {
  console.log('Received:', received1, received2);
}
```

### 2. Check Parameter Signatures Match
```typescript
// BAD: Mismatch in parameters
// Caller: onStatusChange(bookingId, status)
// Handler: const handleStatusChange = (status) => {}
// Result: bookingId gets passed as status!

// GOOD: Parameters match
// Caller: onStatusChange(bookingId, status)  
// Handler: const handleStatusChange = (bookingId, status) => {}
```

### 3. Verify Component Usage
- Check dynamic imports: `import('@/components/...')`
- Don't waste time fixing files that aren't being loaded

### 4. Compare at Same Layer
- UI handlers should be compared to UI handlers
- Don't compare API calls to UI events
- Working features might mask the same bug

### 5. Error Messages Can Mislead
- "status: must be one of..." → Actually receiving a UUID
- Focus on what's actually being passed, not what error says
- Toast messages often reveal real values: "Booking marked as [UUID]"

## Fix Applied

```typescript
// Before (wrong):
const handleStatusChange = async (newStatus: string) => {
  setIsStatusUpdating(true);
  try {
    await onStatusChange(booking.id, newStatus);
  } finally {
    setIsStatusUpdating(false);
  }
};

// After (fixed):
const handleStatusChange = async (bookingId: string, newStatus: string) => {
  setIsStatusUpdating(true);
  try {
    await onStatusChange(bookingId, newStatus);
  } finally {
    setIsStatusUpdating(false);
  }
};
```

## Time Wasted

- ~20 attempts over multiple hours
- Could have been solved in 2 minutes with proper value logging

## Action Items Completed

1. ✅ Updated task-checklists.md with parameter mismatch debugging section
2. ✅ Added "Always log actual values" to debugging checklist
3. ✅ Added "Check parameter signatures match" to investigation phase
4. ✅ Created this session memory for future reference
5. ✅ Made Network Tab check more explicit with data type verification
6. ✅ Added STOP reminder before any code writing

## CRITICAL REMINDER FOR FUTURE SESSIONS

**WE HAD THE RIGHT CHECKLIST BUT DIDN'T FOLLOW IT!**

The debugging checklist already said "CHECK BROWSER DEVTOOLS NETWORK TAB FIRST" but we ignored it and jumped straight to code changes. The Network tab would have shown:
```json
{
  "status": "5ab3f904-67ce-443e-8758-1e06233187"  // UUID instead of status string!
}
```

**ALWAYS FOLLOW THE DAMN CHECKLIST** - It exists for a reason. Network tab check takes 30 seconds and would have saved hours.