# Timezone Implementation Summary

## Overview
Implemented comprehensive timezone support across the Heya POS system, allowing merchants to set their timezone and ensuring all times are displayed correctly to both staff and customers.

## Key Components Added

### 1. Shared Infrastructure (`/packages/utils/src/timezone.ts`)
- Already existed with timezone utility functions
- Provides methods for timezone conversion and formatting
- Supports all Australian timezones

### 2. Merchant App Components

#### TimezoneProvider (`/apps/merchant-app/src/contexts/timezone-context.tsx`)
- React context for managing timezone state
- Loads merchant and location timezone settings
- Detects user's browser timezone for comparison
- Provides formatting methods for both merchant and user timezones

#### TimeDisplay Component (`/apps/merchant-app/src/components/TimeDisplay.tsx`)
- Displays times in merchant timezone with optional user timezone tooltip
- Shows timezone abbreviation (e.g., AEDT, AEST)
- Automatically handles timezone conversion

#### Settings Page Updates
- Merchant timezone saved to merchant settings (not just location)
- Timezone selector shows all Australian timezones
- Updates both merchant-level and location-level timezones

#### Calendar Updates
- Added timezone indicator in header
- Time displays use TimeDisplay component for timezone awareness
- Booking tooltips show times with timezone

### 3. Booking App Components

#### TimezoneProvider (`/apps/booking-app/src/contexts/timezone-context.tsx`)
- Similar to merchant app but loads timezone from merchant info API
- Provides consistent timezone handling for customers

#### TimeDisplay Component (`/apps/booking-app/src/components/TimeDisplay.tsx`)
- Shows appointment times in merchant's timezone
- Includes tooltip with customer's local time if different

#### Booking Flow Updates
- Time selection shows timezone indicator
- Confirmation page displays appointment time with timezone

### 4. API Updates

#### Merchant Settings
- Timezone field added to MerchantSettings type
- Merchant service handles timezone in settings updates
- Default timezone: "Australia/Sydney"

#### Bookings Service
- Already uses timezone-aware date filtering
- Converts between UTC storage and local display
- Handles daylight saving time correctly

### 5. Database Migration Script
- `/apps/api/scripts/update-merchant-timezones.ts`
- Ensures all existing merchants have timezone settings
- Inherits timezone from first location if not set

## Timezone Hierarchy

1. **Merchant Level**: Default timezone for the entire business
2. **Location Level**: Can override merchant timezone (optional)
3. **Display Priority**: Location timezone > Merchant timezone > "Australia/Sydney"

## User Experience

### For Merchants
- Set timezone in Settings > Business Information
- All calendar views show times in their configured timezone
- Clear timezone indicators throughout the app

### For Customers
- See available times in merchant's timezone
- Get helpful tooltips showing their local time equivalent
- Clear "All times shown in [TIMEZONE]" indicators
- Confirmation shows appointment time with timezone

## Technical Implementation

### UTC Storage
- All timestamps stored in UTC in database
- Conversion happens at display layer
- Prevents ambiguity and DST issues

### Timezone Display
- Uses IANA timezone identifiers (e.g., "Australia/Sydney")
- Shows friendly abbreviations (AEDT, AEST, etc.)
- Handles daylight saving transitions automatically

### Edge Cases Handled
- Lord Howe Island (30-minute DST shifts)
- Different timezones between merchant and customer
- DST transition dates
- Invalid times during "spring forward"

## Testing Recommendations

1. **Basic Functionality**
   - Change merchant timezone in settings
   - Verify calendar displays update correctly
   - Check booking app shows correct timezone

2. **Cross-Timezone Testing**
   - Access booking app from different timezone
   - Verify tooltip shows correct local time conversion
   - Test with VPN or browser timezone override

3. **DST Transitions**
   - Test bookings around DST change dates
   - Verify times remain consistent after transition
   - Check historical bookings display correctly

4. **Data Migration**
   - Run migration script on test database
   - Verify all merchants get timezone settings
   - Check existing bookings display correctly

## Future Enhancements

1. **Multi-Location Support**
   - UI to manage different timezones per location
   - Staff timezone preferences
   - Cross-location booking coordination

2. **International Expansion**
   - Add non-Australian timezone support
   - Handle more complex timezone scenarios
   - Multi-language timezone names

3. **Advanced Features**
   - Timezone-aware notifications
   - Calendar export with correct timezone data
   - Timezone conflict warnings