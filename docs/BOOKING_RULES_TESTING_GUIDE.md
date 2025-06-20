# 📅 Booking Rules Testing Guide

## Overview

Advance booking hours and cancellation notice are **critical business rules** that directly impact revenue and operations. This guide ensures these settings work reliably.

## 🚀 Quick Test Methods

### 1. Automated UI Test
Navigate to: `/settings/test-booking-rules`
- Visual test interface
- Real-time results
- Tests all edge cases automatically

### 2. Command Line Test
```bash
# Get auth token
AUTH_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "HAMILTON", "password": "demo123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Run tests
AUTH_TOKEN=$AUTH_TOKEN node scripts/test-booking-rules.js
```

### 3. Manual Testing
Follow the step-by-step guide below

---

## 📏 Understanding the Rules

### Advance Booking Hours
- **Purpose**: Prevents last-minute bookings that staff can't prepare for
- **Example**: If set to 48 hours, customers cannot book for today or tomorrow
- **Business Impact**: Ensures adequate preparation time

### Cancellation Notice Hours  
- **Purpose**: Prevents revenue loss from last-minute cancellations
- **Example**: If set to 24 hours, customers cannot cancel bookings starting within 24 hours
- **Business Impact**: May require deposits or fees for late cancellations

---

## 🧪 Manual Testing Steps

### Test 1: Advance Booking Enforcement

#### Setup
1. Go to Settings → Booking tab
2. Set "Advance Booking Hours" to **24**
3. Save settings

#### Test Cases

**Case 1.1: Block Same-Day Booking**
```
1. Go to booking page/calendar
2. Try to book for TODAY at 3pm
3. Expected: ❌ Blocked with message "Bookings must be made at least 24 hours in advance"
4. Actual: _________________
```

**Case 1.2: Block Next-Day Morning**
```
1. Current time: Today 2pm
2. Try to book: Tomorrow 10am (20 hours ahead)
3. Expected: ❌ Blocked
4. Actual: _________________
```

**Case 1.3: Allow Exactly 24 Hours**
```
1. Current time: Today 2pm
2. Try to book: Tomorrow 2pm (exactly 24 hours)
3. Expected: ✅ Allowed
4. Actual: _________________
```

**Case 1.4: Allow Beyond Limit**
```
1. Current time: Today 2pm
2. Try to book: Tomorrow 3pm (25 hours)
3. Expected: ✅ Allowed
4. Actual: _________________
```

### Test 2: Cancellation Notice Enforcement

#### Setup
1. Set "Cancellation Notice Hours" to **48**
2. Save settings
3. Create test bookings at various times

#### Test Cases

**Case 2.1: Block Immediate Cancellation**
```
1. Booking time: Today 3pm (current time: 2:30pm)
2. Try to cancel
3. Expected: ❌ Blocked with "48 hours notice required"
4. Actual: _________________
```

**Case 2.2: Block Within Notice Period**
```
1. Booking time: Tomorrow 3pm (24 hours away)
2. Try to cancel
3. Expected: ❌ Blocked (under 48h notice)
4. Actual: _________________
```

**Case 2.3: Allow At Limit**
```
1. Booking time: Day after tomorrow 2pm (48 hours)
2. Try to cancel
3. Expected: ✅ Allowed
4. Actual: _________________
```

**Case 2.4: PIN Override (if enabled)**
```
1. Booking within notice period
2. Try to cancel
3. Expected: 📍 PIN prompt appears
4. Enter manager PIN
5. Expected: ✅ Cancellation allowed with PIN
6. Actual: _________________
```

---

## 🔄 Edge Case Testing

### Time Zone Considerations
```
1. Set timezone to Perth (UTC+8)
2. Create booking for "tomorrow 10am Perth time"
3. Change timezone to Sydney (UTC+10/11)
4. Verify booking still shows correct relative time
5. Test if advance hours still enforced correctly
```

### Daylight Saving Transitions
```
1. Test bookings that cross DST boundaries
2. Ensure 24h means 24 actual hours, not "same time tomorrow"
```

### Concurrent Updates
```
1. Admin A: Set advance hours to 24
2. Admin B: Try to book 12 hours ahead (should fail)
3. Admin A: Change to 6 hours
4. Admin B: Retry booking (should succeed)
```

---

## 📱 Multi-Channel Testing

Test that rules are enforced across ALL booking channels:

### 1. Admin/Staff Portal
- [ ] Calendar drag-and-drop
- [ ] New booking form
- [ ] Quick booking button
- [ ] Modify existing booking

### 2. Customer Portal (if enabled)
- [ ] Online booking widget
- [ ] Mobile booking app
- [ ] Phone booking (staff enters)

### 3. API/Integrations
- [ ] Direct API calls
- [ ] Third-party integrations
- [ ] Import tools

---

## 🚨 Common Issues & Solutions

### Issue 1: Rules Not Enforcing
**Symptoms**: Can book/cancel without restrictions
**Check**:
- Settings actually saved? (refresh and check)
- Using correct API version? (v2 for bookings)
- Client-side validation disabled?

### Issue 2: Wrong Time Calculations
**Symptoms**: Blocks valid bookings, allows invalid ones
**Check**:
- Server timezone matches setting timezone?
- Client sending UTC timestamps?
- DST handling correct?

### Issue 3: Inconsistent Enforcement
**Symptoms**: Works in calendar but not booking form
**Check**:
- All UI components reading from same settings?
- Validation in both frontend AND backend?
- Cache invalidation after settings change?

---

## 📊 Test Result Recording

### Template for Each Test Run

```
Test Date: _______________
Tester: _________________
Version: ________________

Settings Tested:
- Advance Booking: _____ hours
- Cancellation: _____ hours
- Timezone: _____________

Results Summary:
- Advance Booking Tests: ___/4 passed
- Cancellation Tests: ___/4 passed  
- Edge Cases: ___/3 passed
- Multi-Channel: ___/3 passed

Issues Found:
1. _____________________
2. _____________________

Notes:
_______________________
```

---

## ✅ Success Criteria

The booking rules are working correctly when:

1. **Consistent Enforcement**
   - Same rules apply everywhere
   - No way to bypass via different screens

2. **Clear Messaging**
   - Error messages state the exact requirement
   - Shows when booking will be allowed

3. **Accurate Calculations**
   - Time math is correct across timezones
   - Edge cases (DST, exactly at limit) work

4. **Business Logic**
   - Managers can override with PIN (if enabled)
   - Audit trail shows overrides
   - Rules apply to modifications too

5. **Performance**
   - Validation is instant
   - No lag when checking availability
   - Settings changes take effect immediately

---

## 🔧 Troubleshooting Commands

### Check Current Settings
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/merchant/settings | jq '.bookingAdvanceHours, .cancellationHours'
```

### Test Booking Creation
```bash
# Try to book 1 hour ahead (should fail if limit > 1)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-id",
    "serviceId": "test-id", 
    "staffId": "test-id",
    "startTime": "'$(date -u -d '+1 hour' -Iseconds)'"
  }' \
  http://localhost:3000/api/v2/bookings
```

### Monitor Validation Logs
```bash
# Watch API logs for validation messages
tail -f logs/api.log | grep -E "(advance|cancel|notice|hours)"
```

---

## 📝 Final Checklist

Before signing off on booking rules:

- [ ] Tested all time boundaries (under, at, over limit)
- [ ] Verified error messages are clear
- [ ] Checked timezone handling
- [ ] Tested on mobile devices
- [ ] Verified API enforcement
- [ ] Documented any overrides/exceptions
- [ ] Confirmed with business stakeholders
- [ ] Updated staff training materials

Remember: These rules directly impact customer experience and business revenue. Test thoroughly!