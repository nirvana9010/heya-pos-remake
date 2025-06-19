# Calendar Debug Summary - June 1st Bookings Not Showing

## Issues Found

### 1. Calendar Not Passing Date Parameters ✅ FIXED
**Problem**: The calendar page was calling `apiClient.getBookings()` without any date parameters, which caused the API to use its default behavior of only returning today and future bookings.

**Solution**: Updated the calendar page to pass appropriate date parameters based on the current view:
- Day view: passes `date` parameter
- Week view: passes `startDate` and `endDate` parameters  
- Month view: passes `startDate` and `endDate` parameters

### 2. Timezone Mismatch in API Date Filtering
**Problem**: The API is using `date-fns` functions `startOfDay()` and `endOfDay()` which apply timezone conversions. This causes a mismatch between the stored timestamps and the search range.

**Example**:
- Input date: `2025-06-01` (interpreted as UTC midnight)
- `startOfDay()` returns: `2025-05-31T14:00:00.000Z` (midnight June 1st in Australia/Sydney timezone)
- `endOfDay()` returns: `2025-06-01T13:59:59.999Z` (11:59:59 PM June 1st in Australia/Sydney timezone)

This means bookings with timestamps like `2025-06-01T09:30:00.000Z` (7:30 PM June 1st in Sydney) are excluded from the search.

**Evidence**:
- Database has 6 bookings for June 1st
- API returns 7 bookings when searching by date (due to timezone boundary differences)
- The extra booking is likely from late May 31st UTC that falls into June 1st Sydney time

## Verification

Created test scripts to verify:
1. `/apps/api/test/check-june-bookings.ts` - Shows the timezone conversion issue
2. `/apps/api/test/test-booking-api.ts` - Tests the API endpoints directly

## Recommendations

### Short-term Fix (Calendar UI)
The calendar page has been updated to pass the correct date parameters. This partially fixes the issue by ensuring the calendar requests bookings for the specific date being viewed.

### Long-term Fix (API)
The API's date filtering logic should be updated to handle dates consistently:

1. **Option A**: Use UTC dates consistently
   - Parse date strings as UTC midnight
   - Don't apply timezone conversions in date filtering
   - Let the UI handle timezone display

2. **Option B**: Use location-specific timezones
   - Store and filter dates based on the location's timezone
   - Each location in the database has a timezone field that could be used

3. **Option C**: Pass timezone from client
   - Allow the client to specify which timezone to use for date filtering
   - Default to the merchant's primary location timezone

## Current Status
- ✅ Calendar now passes date parameters correctly
- ⚠️ Timezone issue in API still causes some bookings to be missed
- 🔍 June 1st bookings exist in database but may not show correctly due to timezone boundaries