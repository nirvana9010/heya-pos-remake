# Allow Unassigned Bookings Setting

## Overview
A new merchant setting `allowUnassignedBookings` has been added to control whether customers can create bookings without selecting a specific staff member.

## Setting Details

**Location**: Settings → General → Booking Settings

**Default Value**: `true` (allows flexibility)

**Options**:
- **true**: Customers can select "Any Available" and bookings will be created without a specific staff assignment
- **false**: Customers must select a specific staff member or the system will auto-assign one

## How It Works

### When `allowUnassignedBookings = true` (Default)

1. **Booking App**: 
   - Shows "Any Available" option
   - When selected, creates booking with `providerId = null`
   - Booking appears in "Unassigned" column on calendar
   - Text shows: "We'll assign the best available specialist for your service"

2. **Merchant Slideout**:
   - "Next Available" still pre-resolves to specific staff
   - Always creates assigned bookings (current behavior maintained)

### When `allowUnassignedBookings = false`

1. **Booking App**:
   - Shows "Any Available" option
   - When selected, automatically assigns first available staff member
   - Booking is created with specific `providerId`
   - Text shows: "We'll automatically assign an available specialist"
   - If no staff available, booking fails with error message

2. **Merchant Slideout**:
   - No change - continues to pre-resolve staff

3. **API Validation**:
   - Rejects bookings without `staffId` with error:
   - "This business requires staff selection for all bookings. Please select a specific staff member."

## Database Changes

### Updated TypeScript Interfaces
```typescript
// apps/api/src/types/models/merchant.ts
export interface MerchantSettings {
  // ... existing settings ...
  showUnassignedColumn: boolean;
  allowUnassignedBookings: boolean; // NEW
}
```

### Migration Script
Run this script to add the setting to existing merchants:
```bash
cd apps/api
npx tsx src/scripts/add-allow-unassigned-bookings-setting.ts
```

## API Changes

### Public Booking Controller
The `/api/v1/public/merchant-info` endpoint now returns:
```json
{
  "id": "...",
  "name": "...",
  // ... other fields ...
  "allowUnassignedBookings": true
}
```

### Public Booking Service
Added validation in `createPublicBooking`:
```typescript
if (!staffId && !allowUnassignedBookings) {
  throw new Error('This business requires staff selection...');
}
```

## UI Changes

### Settings Page
New toggle in Settings → General → Booking Settings:
- **Label**: "Allow Unassigned Bookings"
- **Description**: "Allow customers to book without selecting a specific staff member (they can choose 'Any Available')"

### Booking App
Updated behavior based on merchant setting:
- Conditional auto-assignment when setting is false
- Different descriptive text based on setting value

## Testing

Use the provided test script:
```bash
node test-allow-unassigned-bookings.js
```

This tests all four scenarios:
1. ✅ Setting true + No staff = Success (unassigned booking)
2. ✅ Setting true + With staff = Success (assigned booking)
3. ❌ Setting false + No staff = Fail (validation error)
4. ✅ Setting false + With staff = Success (assigned booking)

## Business Impact

### Benefits of `allowUnassignedBookings = true`:
- Maximum flexibility for staff scheduling
- Customers can book anytime without availability constraints
- Staff can be assigned later based on actual availability
- Supports batch assignment workflows

### Benefits of `allowUnassignedBookings = false`:
- Ensures all bookings have assigned staff immediately
- No manual assignment needed later
- Clearer customer expectations
- Simpler calendar view (no unassigned column needed)

## Recommendations

1. **For high-volume businesses**: Keep `true` for flexibility
2. **For appointment-based services**: Consider `false` for clarity
3. **Pair with `showUnassignedColumn`**: 
   - If `allowUnassignedBookings = true`, keep `showUnassignedColumn = true`
   - If `allowUnassignedBookings = false`, can set `showUnassignedColumn = false`

## Future Enhancements

1. **Smart Auto-Assignment**: When false, use availability and workload data
2. **Customer Preference**: Remember customer's preferred staff
3. **Service-Specific Settings**: Some services require specific staff
4. **Notification Options**: Alert when unassigned bookings are created