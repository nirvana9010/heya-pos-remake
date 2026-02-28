# 🎯 Settings Visual Testing Guide

## Quick Visual Test Card

Print this guide or keep it open while testing each setting!

---

## 🏢 BUSINESS TAB

### Test 1: Business Name Change

```
1. Current name: ________________
2. Change to: "Test Business 123"
3. Click Save
4. Refresh page (F5)
5. ✅ Name still shows "Test Business 123"?
6. ❌ Reverted to old name?
```

### Test 2: Timezone Impact

```
1. Note a booking time: ________________
2. Change timezone: Sydney → Perth
3. Click Save
4. Check same booking
5. ✅ Time shifted 2-3 hours earlier?
6. Go to Calendar view
7. ✅ All times updated?
```

### Test 3: Business Hours

```
1. Set Monday: 10:00 AM - 2:00 PM
2. Toggle Sunday: OFF
3. Click Save
4. Go to Calendar
5. ✅ Monday shows 10am start?
6. ✅ Sunday shows as unavailable?
```

---

## 📅 BOOKING TAB

### Test 4: Advance Booking

```
1. Set to: 24 hours
2. Click Save
3. Go to Booking page
4. Try to book for today
5. ❌ Should be blocked
6. Try to book for day after tomorrow
7. ✅ Should work
```

### Test 5: Deposit Requirement

```
1. Enable deposits: ON
2. Set percentage: 30%
3. Click Save
4. Create new $100 booking
5. ✅ Shows "$30 deposit required"?
6. ❌ Can complete without deposit?
```

### Test 6: Tips (Australian Context)

```
1. Enable tips: ON (usually OFF in AU)
2. Set options: 10%, 15%, 20%
3. Allow custom: ON
4. Click Save
5. Process a payment
6. ✅ Tip options appear?
7. ✅ Can enter custom amount?
```

---

## 🔒 SECURITY TAB

### Test 7: PIN for Refunds

```
1. Set "Require PIN for Refunds": ON
2. Click Save
3. Go to Payments
4. Process a refund
5. ✅ PIN dialog appears?
6. Enter wrong PIN
7. ❌ Refund blocked?
8. Enter correct PIN
9. ✅ Refund processes?
```

### Test 8: Auto-logout

```
1. Set timeout: 5 minutes
2. Click Save
3. Leave app idle (no clicks/typing)
4. Wait 5 minutes
5. ✅ Redirected to login?
6. ❌ Still logged in?
```

---

## 🎁 LOYALTY TAB

### Test 9: Points Configuration

```
1. Set type: Points per Visit
2. Set rate: 10 points/visit
3. Click Save
4. Complete a booking
5. Check customer profile
6. ✅ Shows +10 points?
7. Switch to: Points per Dollar
8. Set rate: 1 point/$1
9. Complete $50 booking
10. ✅ Shows +50 points?
```

---

## 🔔 NOTIFICATIONS TAB

### Test 10: Customer Notifications

```
1. Enable booking confirmations: Email ✅ SMS ❌
2. Click Save
3. Create new booking
4. ✅ Email sent?
5. ❌ SMS sent?
6. Check email content
7. ✅ Has booking details?
8. ✅ Has correct time/date?
```

---

## ⚡ QUICK VALIDATION CHECKS

### After EVERY setting change:

- [ ] Save button clicked?
- [ ] Success toast shown?
- [ ] No error messages?
- [ ] Refresh page - setting persists?
- [ ] Related features updated?

### Red Flags 🚩

- Setting saves but doesn't work = BROKEN
- Setting reverts after refresh = NOT SAVING
- Error in console = CHECK LOGS
- Other features break = SIDE EFFECT

---

## 📱 Mobile Testing

Test these on tablet/phone:

- [ ] All buttons tappable
- [ ] Dropdowns work
- [ ] Time pickers functional
- [ ] Save button reachable
- [ ] Toast messages visible

---

## 🔍 Developer Console Checks

Open DevTools (F12) and check:

1. **Network Tab**

   - PUT request to `/merchant/settings`?
   - Status 200 (green)?
   - Response has updated values?

2. **Console Tab**

   - No red errors?
   - No yellow warnings?

3. **Application Tab**
   - Local Storage > access_token exists?
   - No expired tokens?

---

## 📝 Test Log Template

Copy for each test:

```
Setting: ________________
Old Value: ________________
New Value: ________________
Expected: ________________
Actual: ________________
Status: ✅ PASS / ❌ FAIL
Notes: ________________
```

---

## 🎯 Success Indicators

✅ **Setting is WORKING when:**

- Value saves and persists
- Business logic respects it
- No errors anywhere
- Related features update
- Works after logout/login

❌ **Setting is BROKEN when:**

- Value doesn't save
- Saves but doesn't work
- Causes errors
- Breaks other features
- Needs app restart to work

---

## 🆘 Quick Fixes

**Setting won't save?**

- Check auth token
- Check network connection
- Try logout/login
- Clear browser cache

**Setting saves but doesn't work?**

- Check if feature is implemented
- Look for TODO comments in code
- Check API endpoint exists
- Verify database column exists

**Everything broken?**

- Refresh page
- Clear localStorage
- Re-login
- Check API is running
- Reset to defaults
