# Outstanding UTC-Timezone Follow-Ups

## Summary (October 27, 2025)

- **Staff overrides API still serialises in UTC:** `apps/api/src/staff/staff.service.ts:691` and friends emit override dates via `toISOString().split('T')[0]` and persist with `new Date(data.date)`. This causes off-by-one misalignment for merchants outside UTC when the roster UI hydates overrides. Replace with merchant/location timezone formatting (mirroring `BookingAvailabilityService`).
- **State holiday imports assume UTC midnight:** `apps/api/src/merchant-holidays/merchant-holidays.service.ts:83-133` uses UTC-derived keys when reconciling holidays. AEDT/ACDT merchants can end up with holidays shifted a day. Normalise keys using the merchant timezone before diffing/creating records.
- **Booking app sends customer-local dates:** `apps/booking-app/src/app/booking/BookingPageClient.tsx:511,584` formats dates with the browser locale before calling `/public/staff` and `/public/bookings/check-availability`. On non-local machines that shifts the requested day. Pipe these through `TimezoneUtils.formatInTimezone(..., merchantInfo.timezone, 'yyyy-MM-dd')`. Align `HorizontalDatePicker` keys (`apps/booking-app/src/components/HorizontalDatePicker.tsx:107`) with the same helper.

## Next Steps

1. Update the staff service to accept a timezone param (or fetch it) and replace all override/holiday date serialisation with timezone-aware helpers.
2. Refactor the holiday import service to generate date keys using the merchant timezone, ensuring state holidays line up with roster synthesis.
3. Wire the booking app’s date formatting through timezone utilities and add regression tests for cross-timezone browsers to guarantee the API receives merchant-local day strings.
