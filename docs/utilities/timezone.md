# Utility: TimezoneUtils

**Created**: 2025-01-07  
**Location**: `packages/utils/src/timezone.ts`  
**Used By**: Booking services, Merchant app settings, Location services

## 🎯 What It Does

TimezoneUtils provides comprehensive timezone handling for the POS system, ensuring accurate date/time operations across different timezones. It solves the critical problem of managing bookings, business hours, and appointments when merchants and customers are in different timezones, while maintaining UTC storage in the database.

## 📖 How to Use

### Basic Usage
```typescript
import { TimezoneUtils } from '@heya/utils';

// Create a date in a specific timezone
const appointmentDate = TimezoneUtils.createDateInTimezone(
  '2024-03-15', 
  '14:30', 
  'Australia/Sydney'
);
```

### Common Patterns
```typescript
// Pattern 1: Display a UTC date in merchant's timezone
const booking = await getBooking();
const displayInfo = TimezoneUtils.toTimezoneDisplay(
  booking.startTime, 
  merchant.timezone
);
console.log(displayInfo.time); // "2:30 PM"

// Pattern 2: Get day boundaries for filtering
const startOfDay = TimezoneUtils.startOfDayInTimezone(
  new Date(), 
  'Australia/Perth'
);
const endOfDay = TimezoneUtils.endOfDayInTimezone(
  new Date(), 
  'Australia/Perth'
);
```

## 📝 API Reference

### Function Signature
```typescript
class TimezoneUtils {
  static createDateInTimezone(
    dateStr: string,
    timeStr: string,
    timezone: string
  ): Date

  static formatInTimezone(
    date: Date | string,
    timezone: string,
    formatStr?: 'date' | 'time' | 'datetime'
  ): string

  static startOfDayInTimezone(
    date: Date | string,
    timezone: string
  ): Date

  static endOfDayInTimezone(
    date: Date | string,
    timezone: string
  ): Date

  static toTimezoneDisplay(
    date: Date | string,
    timezone: string
  ): { date: string; time: string; datetime: string }

  static getAustralianTimezones(): Array<{value: string, label: string}>

  static getAllTimezones(): Record<string, Array<{value: string, label: string}>>

  static isValidTimezone(timezone: string): boolean
}
```

### Parameters
- `dateStr` - Date in YYYY-MM-DD format (required)
- `timeStr` - Time in HH:mm format (required)
- `timezone` - IANA timezone identifier (e.g., 'Australia/Sydney')
- `formatStr` - Optional format type: 'date', 'time', or 'datetime'

### Return Value
Methods return either Date objects (in UTC) or formatted strings based on the operation.

## 🧪 Examples

### Example 1: Creating a Booking in Merchant's Timezone
```typescript
// Input
const bookingDate = TimezoneUtils.createDateInTimezone(
  '2024-03-15',
  '10:00',
  'Australia/Sydney'
);

// Output
console.log(bookingDate.toISOString()); 
// "2024-03-14T23:00:00.000Z" (UTC - 11 hours during AEDT)
```

### Example 2: Displaying Times to Users
```typescript
// Showing a booking time to a merchant in Perth
const booking = { startTime: '2024-03-15T04:00:00Z' };
const display = TimezoneUtils.toTimezoneDisplay(
  booking.startTime,
  'Australia/Perth'
);

// Returns
{
  date: "15/03/2024",
  time: "12:00 PM",
  datetime: "15/03/2024, 12:00 PM"
}
```

### Example 3: Using with React Context (Walk-in Customers)
```typescript
// Import the timezone context
import { useTimezone } from "@/contexts/timezone-context";

// In your component
const { formatInMerchantTz } = useTimezone();

// Generate timezone-aware customer names
const bookingDateTime = new Date(formData.date);
bookingDateTime.setHours(formData.time.getHours());
bookingDateTime.setMinutes(formData.time.getMinutes());

// Format consistently in merchant's timezone
const timeStr = formatInMerchantTz(bookingDateTime, 'time');
const monthDay = format(bookingDateTime, "MMM-dd");
const customerName = `Walk-in ${monthDay}-${timeStr}`;
```

## ⚠️ Edge Cases & Gotchas

- **Daylight Saving**: Automatically handled by the native Intl API - times adjust correctly during DST transitions
- **Invalid Timezones**: Always validate timezones with `isValidTimezone()` before use to prevent runtime errors
- **Date Storage**: All dates are returned in UTC for database storage - never store localized dates

## 🔧 Implementation Notes

### Why It Works This Way
Uses the native Intl.DateTimeFormat API internally because it provides accurate timezone calculations including DST transitions without external dependencies. All methods return UTC dates to ensure consistent database storage.

### Dependencies
- date-fns (for parseISO utility only)
- Native JavaScript Intl API

### Performance
- Time complexity: O(1) for all operations
- Space complexity: O(1)
- No caching needed as Intl API is highly optimized

## 🧹 Maintenance

### To Modify Safely
1. Run existing tests to ensure compatibility
2. Test DST transitions (March/October for Australian timezones)
3. Verify booking creation and display still work correctly

### Test Command
```bash
npm run test -- packages/utils/src/__tests__/timezone.test.ts
```

## 🐛 Common Issues

**Issue**: Booking shows wrong time after creation
**Cause**: Using local Date object instead of timezone-aware creation
**Fix**: Always use `createDateInTimezone()` when creating dates from user input

**Issue**: Times off by 1 hour during DST
**Cause**: Manual offset calculation instead of using Intl API
**Fix**: Rely on TimezoneUtils methods which handle DST automatically

**Issue**: Walk-in customer names show wrong date/time
**Cause**: Using `new Date()` (current time) instead of the booking's selected date/time
**Fix**: Use the booking's date/time with timezone-aware formatting through `useTimezone()` context

---

**See Also**: 
- [Booking Manager](/docs/features/bookings-manager.md)
- [Merchant Settings](/docs/features/merchant-settings.md)