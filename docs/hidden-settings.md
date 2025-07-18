# Hidden Settings Documentation

This document tracks all settings that have been hidden from the merchant app UI because they are not currently functional. These settings are preserved in the codebase for future implementation.

## Hidden Settings

### 1. Currency Selection
**Location**: Settings > Business > Location Settings  
**Component**: `/apps/merchant-app/src/app/(dashboard)/settings/page.tsx` (lines 605-617)  
**Status**: UI hidden, backend not implemented  
**Description**: Allows merchants to select their preferred currency (AUD, NZD, USD)  
**Why Hidden**: Currency handling is not fully implemented throughout the payment and reporting system

### 2. Buffer Time Between Appointments
**Location**: Settings > Booking Settings  
**Component**: `/apps/merchant-app/src/app/(dashboard)/settings/page.tsx` (lines 813-831)  
**Status**: UI hidden, backend partially implemented  
**Description**: Adds automatic buffer time (15 or 30 minutes) between bookings  
**Why Hidden**: The calendar system doesn't currently enforce buffer times when creating or moving bookings

### 3. Require Deposit
**Location**: Settings > Booking Settings > Payment Settings  
**Component**: `/apps/merchant-app/src/app/(dashboard)/settings/page.tsx` (lines 903-937)  
**Status**: UI hidden, backend exists but not integrated  
**Related Fields**:
- `requireDeposit`: Boolean flag to enable/disable deposits
- `depositPercentage`: Percentage of total booking amount required as deposit
**Default**: `requireDeposit: false`, `depositPercentage: 0`  
**Why Hidden**: Deposit collection is not implemented in the booking flow or payment processing

### 4. Enable Tips
**Location**: Settings > Booking Settings > Payment Settings  
**Component**: `/apps/merchant-app/src/app/(dashboard)/settings/page.tsx` (lines 941-990)  
**Status**: UI hidden, backend exists but not integrated  
**Related Fields**:
- `enableTips`: Boolean flag to enable/disable tips
- `defaultTipPercentages`: Array of suggested tip percentages (e.g., [10, 15, 20])
- `allowCustomTipAmount`: Boolean to allow custom tip amounts
**Default**: `enableTips: false` (appropriate for Australian market)  
**Why Hidden**: Tip functionality is not implemented in the payment dialog or payment processing

## Backend Implementation Status

All these settings exist in the database schema and API:
- Database fields are defined in the `MerchantSettings` schema
- API endpoints accept these fields in `/api/v1/merchant/settings`
- Default values are set in `/apps/api/src/merchant/merchant.constants.ts`

## To Re-enable These Settings

1. **Currency**: Implement currency conversion and display throughout:
   - Payment processing
   - Invoices and receipts
   - Reports and analytics
   - Service pricing display

2. **Buffer Time**: Implement in calendar logic:
   - Booking availability calculations
   - Calendar drag-and-drop validation
   - Booking creation/update validation

3. **Deposits**: Implement deposit workflow:
   - Add deposit collection to booking flow
   - Create deposit payment records
   - Handle deposit refunds on cancellation
   - Show deposit status in booking details

4. **Tips**: Implement tip functionality:
   - Add tip selection to payment dialog
   - Include tips in payment calculations
   - Track tips separately in payment records
   - Add tip reporting for staff

## Code References

The hidden settings are commented out but preserved in:
- UI Components: Lines are wrapped in `{/* ... */}` comments
- Save Handler: Lines are commented with `// Hidden - not functional`

To find all hidden settings, search for: `"Hidden - not functional"` or `"hidden - not currently functional"`