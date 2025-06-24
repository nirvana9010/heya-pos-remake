# Timezone Testing Plan

## Overview
This document outlines comprehensive tests to ensure timezone settings flow correctly through all aspects of the merchant and booking applications.

## Test Scenarios

### 1. Location Timezone Configuration Tests

#### 1.1 Update Location Timezone
- **Setup**: Login as merchant with location in Sydney timezone
- **Test**: Update location timezone to Brisbane (no DST)
- **Verify**: 
  - API returns success
  - New timezone is saved in database
  - Timezone validation works (reject invalid timezones)

#### 1.2 Multiple Locations with Different Timezones
- **Setup**: Merchant with locations in Sydney, Brisbane, Perth
- **Test**: Each location operates independently
- **Verify**: Each location shows correct local time

### 2. Booking App Tests

#### 2.1 Availability Display
- **Setup**: Location in Brisbane (UTC+10)
- **Test**: Check availability for a specific date
- **Verify**:
  - Business hours show correctly (9am Brisbane = 9am slots, not 11am)
  - Day boundaries are correct (Monday in Brisbane, not Sunday UTC)
  - No "24:00" times appear (should be "00:00")

#### 2.2 Booking Creation Across Timezones
- **Setup**: 
  - Location in Perth (UTC+8)
  - Customer in Sydney (UTC+10/11)
- **Test**: Customer books 2pm Perth time
- **Verify**:
  - Booking stored correctly in UTC
  - Confirmation shows 2pm Perth time
  - Customer sees tooltip with their local time (4pm Sydney)

#### 2.3 DST Transition Tests
- **Setup**: Location in Sydney
- **Test**: Book appointments around DST transitions
  - Last Sunday in March (DST ends)
  - First Sunday in October (DST starts)
- **Verify**:
  - Slots generated correctly during transition
  - Existing bookings maintain correct times

#### 2.4 Edge Case: Midnight Bookings
- **Setup**: Location with late hours (open until midnight)
- **Test**: Book appointment at 11:30pm
- **Verify**:
  - End time crosses to next day correctly
  - Display shows correct date/time

### 3. Merchant App Tests

#### 3.1 Dashboard Time Display
- **Setup**: Location in Adelaide (UTC+9.5/10.5)
- **Test**: View today's bookings
- **Verify**:
  - All times show in Adelaide time
  - "Today" is based on Adelaide date, not UTC
  - Timezone indicator shows "ACDT" or "ACST"

#### 3.2 Booking Management
- **Setup**: Location in Brisbane
- **Test**: 
  - Create manual booking
  - Modify existing booking time
  - View calendar
- **Verify**:
  - Time pickers use Brisbane time
  - Calendar days align with Brisbane dates
  - No timezone conversion errors

#### 3.3 Reports and Analytics
- **Setup**: Location in Perth
- **Test**: Generate daily/weekly reports
- **Verify**:
  - Day boundaries use Perth time
  - Revenue calculations use correct day boundaries
  - Historical data shows in consistent timezone

### 4. Cross-Timezone Scenarios

#### 4.1 Multi-Location Business
- **Setup**: 
  - Location A in Sydney
  - Location B in Perth (2-3 hours behind)
- **Test**: View consolidated reports
- **Verify**:
  - Each location's data uses its own timezone
  - Aggregated data handles timezone differences
  - Staff can switch between locations seamlessly

#### 4.2 International Customers
- **Setup**: Location in Sydney, customer from NZ (Auckland)
- **Test**: Customer books appointment
- **Verify**:
  - Available times show in Sydney time
  - Tooltip shows Auckland equivalent
  - Confirmation email includes both timezones

### 5. API Integration Tests

#### 5.1 Third-Party Integrations
- **Test**: API calls include timezone information
- **Verify**:
  - Webhooks send times with timezone
  - External calendars sync correctly
  - No ambiguous time representations

#### 5.2 Data Export/Import
- **Test**: Export bookings, change timezone, import
- **Verify**:
  - Times maintain correctness
  - Historical data unchanged
  - Future bookings adjust appropriately

## Test Implementation Scripts

### Script 1: Basic Timezone Flow Test
```javascript
// test-timezone-flow.js
async function testTimezoneFlow() {
  // 1. Login as merchant
  // 2. Get current location timezone
  // 3. Update to different timezone
  // 4. Create test booking
  // 5. Verify times are correct
  // 6. Switch to customer view
  // 7. Verify availability shows correctly
}
```

### Script 2: Edge Case Test
```javascript
// test-timezone-edges.js
async function testTimezoneEdges() {
  // Test midnight boundaries
  // Test DST transitions
  // Test 30-minute offset timezones (Adelaide)
  // Test international date line scenarios
}
```

### Script 3: Multi-Location Test
```javascript
// test-multi-location-timezone.js
async function testMultiLocationTimezone() {
  // Create bookings at same "clock time" in different zones
  // Verify UTC storage is different
  // Test staff switching between locations
}
```

## Manual Testing Checklist

### Booking App
- [ ] Timezone indicator visible
- [ ] Available slots show in merchant timezone
- [ ] Time selection works correctly
- [ ] Confirmation shows correct time
- [ ] Email includes timezone info
- [ ] Tooltip shows user's local time (if different)

### Merchant App
- [ ] Dashboard shows correct "today"
- [ ] Calendar aligns with location timezone
- [ ] Time pickers default to correct timezone
- [ ] Reports use correct day boundaries
- [ ] Staff schedule shows in location time
- [ ] No "Invalid Date" errors

### Settings & Configuration
- [ ] Can update timezone successfully
- [ ] Invalid timezones are rejected
- [ ] Changes take effect immediately
- [ ] No need to restart services
- [ ] Historical data unchanged

## Common Issues to Watch For

1. **"24:00" Display Bug**
   - Should show as "00:00"
   - Check time formatting functions

2. **Day of Week Mismatch**
   - Monday in Sydney might be Sunday in UTC
   - Verify business hours apply correctly

3. **DST Confusion**
   - Some zones have DST, others don't
   - Test around transition dates

4. **Booking Conflicts**
   - Ensure overlap detection works across timezones
   - UTC comparison must be correct

5. **Report Boundaries**
   - "Daily" reports should use location's day
   - Not UTC day boundaries

## Automated Test Framework

```typescript
describe('Timezone Functionality', () => {
  it('should display times in location timezone', async () => {
    // Test implementation
  });

  it('should handle DST transitions correctly', async () => {
    // Test implementation
  });

  it('should store all times in UTC', async () => {
    // Test implementation
  });

  it('should validate timezone updates', async () => {
    // Test implementation
  });
});
```

## Success Criteria

1. All times display correctly in location's timezone
2. No hardcoded timezone assumptions
3. Smooth experience across timezone boundaries
4. Clear timezone indicators for users
5. Accurate data regardless of user/server timezone
6. Proper handling of DST transitions
7. International customers can book without confusion