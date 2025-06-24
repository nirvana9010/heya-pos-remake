# Timezone Implementation Summary

## Overview
The Heya POS system supports multiple timezones, allowing each merchant location to operate in their local timezone. The system is NOT hardcoded to Sydney time - it dynamically uses whatever timezone is configured for each location.

## Architecture

### Database Structure
- **Merchant**: Has multiple locations
- **Location**: Each has its own `timezone` field (defaults to "Australia/Sydney" but fully configurable)
- **Bookings**: Stored in UTC, displayed in location's timezone

### Key Components

#### 1. Location Timezone Storage
```prisma
model Location {
  timezone String @default("Australia/Sydney")
  // ... other fields
}
```

#### 2. Timezone Updates
Merchants can update their location timezone via:
- `PATCH /api/v1/locations/:id` - Update all location details
- `PATCH /api/v1/locations/:id/timezone` - Update just timezone

#### 3. Timezone Validation
```typescript
// TimezoneUtils.isValidTimezone()
// Uses Intl API to validate any IANA timezone
static isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
```

#### 4. Booking Availability
- Uses location's configured timezone for:
  - Business hours interpretation
  - Slot generation
  - Availability checking
  - Date/time display

#### 5. UI Components
- `TimeDisplay` component shows times in merchant timezone
- `TimezoneIndicator` shows which timezone is being used
- Tooltips show user's local time if different from merchant

## Supported Timezones
Any valid IANA timezone, including but not limited to:
- Australia/Sydney (AEDT/AEST)
- Australia/Brisbane (AEST - no DST)
- Australia/Perth (AWST)
- Australia/Adelaide (ACDT/ACST)
- Australia/Darwin (ACST - no DST)
- Australia/Hobart (AEDT/AEST)
- Pacific/Auckland
- Asia/Singapore
- Europe/London
- America/New_York
- UTC, GMT, etc.

## How It Works

### 1. Booking Creation Flow
```
User selects time → Time interpreted in location timezone → 
Converted to UTC for storage → Displayed back in location timezone
```

### 2. Availability Check Flow
```
Request date → Get location timezone → Generate slots in that timezone → 
Check conflicts in UTC → Return available times in location timezone
```

### 3. Business Hours
- Configured per location in local time (e.g., "09:00" means 9 AM in that location's timezone)
- Day of week calculated based on location timezone (important for date boundaries)

## Testing
Created test scripts:
- `test-multi-timezone.js` - Tests booking system with current timezone
- `test-update-timezone.js` - Guide for updating timezone settings

## Important Fixes Made

### 1. Removed Hardcoded Default
```typescript
// BEFORE: Had default timezone
const { timezone = 'Australia/Sydney' } = data;

// AFTER: Timezone is required from location
const { timezone } = data;
```

### 2. Fixed Day of Week Calculation
```typescript
// Now uses location timezone for day calculation
const dayOfWeek = currentDate.toLocaleDateString('en-US', { 
  weekday: 'long', 
  timeZone: timezone 
}).toLowerCase();
```

### 3. Fixed TimezoneUtils.createDateInTimezone
Simplified to correctly handle timezone conversion without double-conversion issues.

## Best Practices
1. Always get timezone from location, never hardcode
2. Store times in UTC in database
3. Display times in location's timezone
4. Show timezone indicator in UI
5. Validate timezone changes before saving
6. Consider DST when testing

## Migration Notes
- Existing locations default to "Australia/Sydney" (schema default)
- Merchants should update their timezone via settings if different
- No data migration needed - times are already stored in UTC