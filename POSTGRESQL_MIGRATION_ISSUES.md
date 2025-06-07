# PostgreSQL Migration Issues Found in Merchant App

## Summary
After investigating all components in the merchant app, I found several issues related to the SQLite to PostgreSQL migration. The main issues were around decimal/financial calculations, date/time handling, and potential boolean comparisons.

## Status: RESOLVED ✅
All critical decimal handling issues have been fixed by:
1. Creating a data transformation layer (`db-transforms.ts`)
2. Updating the API client to automatically transform responses
3. Fixing all components to handle decimal values properly

## Critical Issues Found

### 1. Financial/Decimal Issues

#### `/apps/merchant-app/src/app/payments/page.tsx`
- **Lines 90-91, 184, 237-238, 244-245, 251-252, 257-258**: Hardcoded decimal values and `toFixed(2)` operations
- **Issue**: PostgreSQL returns DECIMAL/NUMERIC types as strings, not JavaScript numbers
- **Fix needed**: Parse decimal values from API responses before operations

#### `/apps/merchant-app/src/app/reports/page.tsx`
- **Lines 89-96, 178, 212-214, 231, 329, 379, 402, 431, 456, 461, 603**: Extensive financial calculations with hardcoded decimals
- **Lines 619**: Math operations on prices that may be strings from PostgreSQL
- **Issue**: All revenue/price calculations assume numeric types
- **Fix needed**: Ensure all financial data is parsed to numbers

#### `/apps/merchant-app/src/app/dashboard/dashboard-enhanced.tsx`
- **Line 191**: `toFixed(0)` on revenue values that might be strings
- **Issue**: Dashboard stats may contain string decimals from PostgreSQL

#### `/apps/merchant-app/src/app/services/ServicesPageContent.tsx`
- **Lines 402, 619, 913**: Price operations and display
- **Line 619**: `Math.round(newPrice * 100) / 100` - assumes numeric type
- **Issue**: Service prices from API might be strings

#### `/apps/merchant-app/src/components/BookingDetailsSlideOut.tsx`
- **Line 49**: `totalPrice` field expects number type but might receive string

#### `/apps/merchant-app/src/components/tyro/TyroPaymentButton.tsx`
- **Line 96**: `amount.toFixed(2)` - assumes amount is a number

#### `/apps/merchant-app/src/app/staff/StaffPageContent.tsx`
- **Line 52**: `commissionRate` field might be a decimal string from PostgreSQL

### 2. Date/Time Handling Issues

#### All components using dates
- PostgreSQL returns timestamps in ISO 8601 format with timezone
- SQLite returned local datetime strings
- Need to ensure proper timezone handling for Australian Eastern Time

### 3. Boolean Comparison Issues

#### `/apps/merchant-app/src/app/services/ServicesPageContent.tsx`
- **Line 435**: `service.isActive` boolean comparison
- PostgreSQL returns true/false, SQLite might have returned 1/0

## Recommended Fixes

### 1. Create a Data Transformation Layer

```typescript
// utils/db-transforms.ts
export const transformDecimal = (value: any): number => {
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return Number(value) || 0;
};

export const transformBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  return value === 1 || value === '1' || value === 'true';
};

export const transformDate = (value: any): Date => {
  return new Date(value);
};
```

### 2. Update API Client Response Interceptor

Add transformation logic to the API client to automatically convert data types:

```typescript
// In api-client.ts response interceptor
response => {
  // Transform decimal fields
  if (response.data) {
    transformApiResponse(response.data);
  }
  return response;
}
```

### 3. Specific Component Fixes

1. **Payment/Financial Components**: Add parsing for all price/amount fields
2. **Date Display Components**: Ensure timezone-aware formatting
3. **Boolean Status Fields**: Ensure proper boolean conversion

## Priority Files to Fix

1. `/apps/merchant-app/src/app/payments/page.tsx` - Critical for payment processing
2. `/apps/merchant-app/src/app/reports/page.tsx` - Critical for financial reporting
3. `/apps/merchant-app/src/app/services/ServicesPageContent.tsx` - Critical for pricing
4. `/apps/merchant-app/src/components/tyro/TyroPaymentButton.tsx` - Critical for payment
5. `/apps/merchant-app/src/app/dashboard/dashboard-enhanced.tsx` - Important for metrics

## Testing Recommendations

1. Test all financial calculations with PostgreSQL decimal values
2. Verify timezone handling for bookings across different times
3. Test boolean fields in service status and other toggles
4. Verify commission rates and percentage calculations
5. Test payment amounts with decimal values

## Resolution Applied

### 1. Data Transformation Layer
Created `/apps/merchant-app/src/lib/db-transforms.ts` with:
- `transformDecimal()` - Converts PostgreSQL decimal strings to numbers
- `transformBoolean()` - Handles both PostgreSQL and SQLite boolean formats
- `transformDate()` - Ensures proper Date object creation
- `transformApiResponse()` - Recursively transforms all API responses

### 2. API Client Updates
Updated both `api-client.ts` and `api-wrapper.ts` to:
- Import the transformation utilities
- Apply `transformApiResponse()` to all API responses
- Ensure all decimal/money fields are converted to numbers

### 3. Component Fixes Applied
- ✅ Dashboard page - Fixed revenue display with `Number()` conversion
- ✅ Dashboard enhanced - Fixed revenue display
- ✅ Reports page - Uses mock data (no fix needed)
- ✅ Payments page - Uses mock data (no fix needed)
- ✅ Services page - Fixed price display with `Number().toFixed(2)`
- ✅ Tyro payment button - Fixed amount display
- ✅ Bookings page - Fixed totalAmount display
- ✅ Booking details - Fixed totalPrice display
- ✅ Customers page - Fixed totalSpent and revenue display

## Remaining Considerations

### Date/Time Handling
PostgreSQL returns timestamps in ISO 8601 format. The transformation layer handles this, but ensure:
- All date displays use proper timezone handling for Australian Eastern Time
- Date filtering in queries accounts for timezone differences

### Boolean Fields
The transformation layer handles both PostgreSQL (true/false) and SQLite (1/0) formats.

## Testing Recommendations
1. Test all financial calculations with real PostgreSQL data
2. Verify decimal precision is maintained (2 decimal places for currency)
3. Test date filtering across different timezones
4. Verify boolean toggles work correctly