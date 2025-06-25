# Calendar API Investigation

## Current State Analysis

### 1. Original Calendar (CalendarPageContent.tsx)

**API Calls Being Made:**
- `apiClient.getBookings(params)` - Fetches bookings with date range
- `apiClient.getStaff()` - Fetches staff members
- `apiClient.getMerchantSettings()` - Fetches merchant settings
- `apiClient.getLocations()` - Fetches locations
- `apiClient.rescheduleBooking(id, data)` - Reschedules a booking

**Mock Data Being Used:**
- `mockServices` - Hardcoded service data
- `mockCustomers` - Hardcoded customer data

### 2. API Client Structure

The API client has been refactored into domain-specific clients:

```typescript
apiClient = {
  auth: AuthClient,
  bookings: BookingsClient,
  customers: CustomersClient,
  services: ServicesClient,
  staff: StaffClient,
  payments: PaymentsClient,
  reports: ReportsClient,
  locations: LocationsClient
}
```

### 3. Available Methods Mapping

| Original Call | Correct Method | Returns |
|--------------|----------------|---------|
| `apiClient.getBookings(params)` | ✅ Works as is | `Booking[]` |
| `apiClient.getStaff()` | ✅ Works as is | `Staff[]` |
| `apiClient.getServices()` | ✅ Works as is | `Service[]` |
| `apiClient.getCustomers()` | ✅ Works as is | `Customer[]` |
| `apiClient.getMerchantSettings()` | ✅ Works as is | Settings object |
| `apiClient.rescheduleBooking()` | ✅ Works as is | Updated booking |
| `apiClient.updateBookingStatus()` | ✅ Works as is | Updated booking |

### 4. Key Findings

1. **Services and Customers ARE Available**: The original calendar uses mock data, but the API actually has these endpoints!
2. **No Method Name Issues**: The methods like `getStaff()`, `getServices()`, `getCustomers()` exist directly on `apiClient`
3. **The error was from wrong property access**: I was trying `apiClient.staff.getList()` when it should be `apiClient.getStaff()`

### 5. Data Transformations Needed

**Bookings:**
- API returns bookings with `startTime` and `endTime` as ISO strings
- Need to extract `date` and `time` for calendar display
- Handle `staffId` vs `providerId` legacy fields

**Staff:**
- API returns `{ id, firstName, lastName, email, phone, role, isActive }`
- Need to combine name: `${firstName} ${lastName}`
- Default color if not provided

**Services:**
- API returns proper service objects
- No transformation needed

**Customers:**
- API returns proper customer objects
- Handle `mobile` vs `phone` fields

## Correct Implementation

The refactored calendar hooks should use these patterns:

```typescript
// Correct API calls
const response = await apiClient.getBookings(params);
const staff = await apiClient.getStaff();
const services = await apiClient.getServices();
const customers = await apiClient.getCustomers();

// NOT these (which caused the errors):
// ❌ apiClient.staff.getList()
// ❌ apiClient.bookings.getList()
```

## Next Steps

1. Fix the hooks to use the correct API methods
2. Remove dependency on mock data
3. Add proper data transformations
4. Test with real API data