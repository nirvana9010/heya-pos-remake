# Timezone Testing Summary

## Test Types Needed

### 1. **Automated Tests** ✅
Created `test-timezone-comprehensive.js` which tests:
- Timezone display verification
- Booking creation across timezones
- Edge cases (midnight, DST transitions)
- Multi-timezone scenarios
- Timezone validation

### 2. **Manual UI Testing**
Created `test-timezone-ui-checklist.md` with detailed checklists for:
- Booking app (customer-facing)
- Merchant app
- Cross-timezone scenarios
- Error handling
- Performance
- Mobile responsiveness
- Accessibility
- Browser compatibility

### 3. **Integration Tests Needed**

#### API Level
```bash
# Test location timezone update
curl -X PATCH /api/v1/locations/:id/timezone \
  -H "Authorization: Bearer TOKEN" \
  -d '{"timezone": "Australia/Brisbane"}'

# Verify bookings use new timezone
curl /api/v1/bookings?date=2025-07-15
```

#### Database Level
```sql
-- Verify timezone stored correctly
SELECT id, name, timezone FROM "Location";

-- Check bookings are in UTC
SELECT id, "startTime", "endTime" FROM "Booking" 
WHERE DATE("startTime") = '2025-07-15';
```

### 4. **Critical Test Scenarios**

#### Scenario 1: Brisbane Merchant (No DST)
- Location timezone: Australia/Brisbane
- Business hours: 9am-6pm Brisbane time
- Test: Book at 2pm Brisbane time
- Verify: 
  - Slots show 09:00-18:00 (not 11:00-20:00)
  - Booking stored as 04:00 UTC (UTC+10)

#### Scenario 2: Perth Merchant (UTC+8)
- Location timezone: Australia/Perth
- Customer in Sydney (UTC+10)
- Test: Customer books "2pm Perth time"
- Verify:
  - Customer sees "2:00 PM AWST"
  - Tooltip shows "4:00 PM AEDT (your time)"
  - Stored as 06:00 UTC

#### Scenario 3: Adelaide Merchant (30-min offset)
- Location timezone: Australia/Adelaide (UTC+9.5/10.5)
- Test: Slots align with half-hour offset
- Verify: 9:00 AM Adelaide = 23:30 UTC previous day

#### Scenario 4: DST Transition
- Sydney location (has DST)
- Test bookings on:
  - First Sunday April (DST ends)
  - First Sunday October (DST starts)
- Verify: No missing/duplicate time slots

### 5. **Key Areas to Monitor**

#### During Development
1. **Day Boundary Issues**
   - "Today" calculations
   - Report date ranges
   - Calendar displays

2. **Time Display Consistency**
   - No mixing of timezones
   - Clear timezone indicators
   - Proper formatting (no 24:00)

3. **Booking Conflicts**
   - Overlap detection in UTC
   - Correct timezone for display

#### In Production
1. **Performance**
   - Timezone calculations shouldn't slow UI
   - Bulk operations handle efficiently

2. **User Confusion**
   - Clear timezone indicators
   - Tooltips for different timezones
   - Email confirmations include timezone

### 6. **Test Data Setup**

```javascript
// Create test locations with different timezones
const testLocations = [
  { name: "Sydney Store", timezone: "Australia/Sydney" },
  { name: "Brisbane Store", timezone: "Australia/Brisbane" },
  { name: "Perth Store", timezone: "Australia/Perth" },
  { name: "Adelaide Store", timezone: "Australia/Adelaide" }
];

// Test booking times
const testTimes = [
  "09:00", // Opening time
  "12:00", // Midday
  "17:30", // Near closing
  "23:30", // Late night
  "00:00"  // Midnight
];
```

### 7. **Regression Tests**

After any timezone-related changes, verify:
- [ ] Existing bookings display correctly
- [ ] Historical reports unchanged
- [ ] No "Invalid Date" errors
- [ ] API responses include timezone info
- [ ] Database times remain UTC

### 8. **User Acceptance Criteria**

From **Customer Perspective**:
- Can see merchant's timezone clearly
- Can book without confusion
- Receives confirmation in correct timezone
- Can see their local time if different

From **Merchant Perspective**:
- Sees all times in their timezone
- Can change timezone in settings
- Reports use correct boundaries
- No confusion with multiple locations

### 9. **Common Issues to Test For**

1. **The "24:00" Bug** - Fixed, but verify
2. **Wrong Day Bug** - Monday showing as Sunday
3. **DST Jump** - Missing hour during transition
4. **Report Boundaries** - Using UTC instead of local
5. **Tooltip Errors** - Wrong user timezone
6. **Email Times** - Missing timezone indicator

### 10. **Success Metrics**

- Zero timezone-related support tickets
- Bookings created at intended times
- Reports show accurate data
- Multi-location merchants work smoothly
- International customers book successfully