# Settings Testing Checklist

## 🎯 Comprehensive Settings Testing Guide

This document provides a foolproof way to test every setting in the Heya POS Settings page to ensure they fulfill their intended purpose.

## 📋 Quick Test Access

1. **Automated Test Suite**: Navigate to `/settings/test-settings` to run automated tests
2. **Manual Testing**: Follow the checklist below for thorough manual verification

## 🔧 Business Information Tab

### Business Details

- [ ] **Business Name**

  - Change the business name
  - Save and refresh the page
  - ✅ Verify: Name persists after refresh
  - ✅ Verify: Name appears in page header/navigation

- [ ] **ABN**

  - Update ABN number
  - Save changes
  - ✅ Verify: ABN format validation works
  - ✅ Verify: ABN appears on invoices/receipts

- [ ] **Business Email**

  - Change email address
  - ✅ Verify: Email validation works
  - ✅ Verify: System emails come from this address

- [ ] **Business Phone**
  - Update phone number
  - ✅ Verify: Phone format validation
  - ✅ Verify: Phone appears on customer communications

### Location Settings

- [ ] **Timezone**

  - Change from Sydney to Perth timezone
  - Save changes
  - ✅ Verify: All booking times adjust by 2-3 hours
  - ✅ Verify: Calendar view reflects new timezone
  - ✅ Verify: Reports show times in new timezone
  - Change back to original timezone

- [ ] **Currency**
  - Change currency setting
  - ✅ Verify: Currency symbol updates throughout app
  - ✅ Verify: Payment processing uses correct currency

### Business Hours

- [ ] **Daily Hours**
  - Change Monday hours from 9-5 to 10-6
  - Toggle Sunday to closed
  - Save changes
  - ✅ Verify: Calendar blocks out non-business hours
  - ✅ Verify: Online booking respects business hours
  - ✅ Verify: Staff schedules align with business hours

## 📅 Booking Settings Tab

### Booking Rules

- [ ] **Advance Booking Hours**

  - Set to 24 hours
  - Try to book an appointment for tomorrow
  - ✅ Verify: Can book 24+ hours ahead
  - ❌ Verify: Cannot book less than 24 hours ahead
  - Change to 72 hours and test again

- [ ] **Cancellation Notice**

  - Set to 48 hours
  - Create a booking for 3 days from now
  - Try to cancel it
  - ✅ Verify: Can cancel
  - Create a booking for tomorrow
  - ❌ Verify: Cannot cancel (or requires PIN)

- [ ] **Online Bookings Toggle**

  - Turn off online bookings
  - ✅ Verify: Booking widget shows "closed" message
  - ✅ Verify: API rejects online booking attempts
  - Turn back on

- [ ] **Auto-confirm Bookings**

  - Turn off auto-confirm
  - Create a new booking
  - ✅ Verify: Booking status is "pending"
  - ✅ Verify: Confirmation email not sent
  - Turn back on and verify bookings auto-confirm

- [ ] **Buffer Time**
  - Set to 15 minutes
  - Book back-to-back appointments
  - ✅ Verify: 15-minute gap enforced between bookings
  - ✅ Verify: Calendar shows buffer time as unavailable

### Payment Settings

- [ ] **Deposit Requirements**

  - Enable deposit requirement
  - Set to 30%
  - Create a $100 booking
  - ✅ Verify: System requests $30 deposit
  - ✅ Verify: Cannot complete booking without deposit
  - Disable and verify no deposit required

- [ ] **Tips Settings** (Australian context - usually disabled)
  - Enable tips
  - Set percentages to 10, 15, 20
  - Process a payment
  - ✅ Verify: Tip options appear
  - ✅ Verify: Custom tip amount works if enabled
  - Disable and verify no tip options shown

## 🔒 Security Tab

### PIN Requirements

- [ ] **PIN for Refunds**

  - Enable PIN requirement
  - Process a refund
  - ✅ Verify: PIN prompt appears
  - ❌ Verify: Cannot refund without correct PIN
  - Disable and verify no PIN required

- [ ] **PIN for Cancellations**

  - Enable PIN requirement
  - Cancel a booking
  - ✅ Verify: PIN prompt appears for late cancellations
  - ✅ Verify: No PIN needed for early cancellations
  - Disable and verify no PIN required

- [ ] **PIN for Reports**

  - Enable PIN requirement
  - Navigate to Reports page
  - ✅ Verify: PIN prompt appears
  - ❌ Verify: Cannot access without PIN
  - Disable and verify direct access

- [ ] **Auto-logout Timeout**
  - Set to 5 minutes
  - Leave app idle for 5 minutes
  - ✅ Verify: Automatically logs out
  - ✅ Verify: Requires re-login
  - Set to preferred timeout

### Access Levels

- [ ] **Role Permissions**

  - Login as Employee role
  - ❌ Verify: Cannot access Settings
  - ❌ Verify: Cannot see all bookings
  - ✅ Verify: Can process payments
  - Login as Manager role
  - ✅ Verify: Can access reports
  - ✅ Verify: Can manage schedules
  - ❌ Verify: Cannot change business settings
  - Login as Owner role
  - ✅ Verify: Full access to all features

## 🎁 Loyalty Program Tab

### Loyalty Configuration

- [ ] **Loyalty Type - Visit Based**

  - Set to "Points per Visit"
  - Set to 10 points per visit
  - Complete a booking
  - ✅ Verify: Customer receives 10 points
  - ✅ Verify: Points show in customer profile

- [ ] **Loyalty Type - Spend Based**

  - Switch to "Points per Dollar"
  - Set to 1 point per dollar
  - Complete a $50 booking
  - ✅ Verify: Customer receives 50 points
  - ✅ Verify: Points calculation correct

- [ ] **Redemption Value**
  - Set 100 points = $10
  - Customer with 200 points makes purchase
  - ✅ Verify: Can redeem for $20 discount
  - ✅ Verify: Points deducted correctly

### Loyalty Features

- [ ] **Enable/Disable Program**

  - Disable loyalty program
  - Complete a booking
  - ❌ Verify: No points awarded
  - Enable and verify points accrue

- [ ] **Birthday Rewards**

  - Enable birthday rewards
  - Set customer birthday to today
  - ✅ Verify: Birthday reward triggered
  - ✅ Verify: Customer notified

- [ ] **Referral Rewards**
  - Enable referral rewards
  - Process a referral
  - ✅ Verify: Referrer receives bonus points
  - ✅ Verify: New customer tagged as referral

## 🔔 Notifications Tab

### Customer Notifications

- [ ] **Booking Confirmations**

  - Enable email confirmations
  - Create a booking
  - ✅ Verify: Confirmation email sent
  - ✅ Verify: Email contains correct details
  - Disable and verify no email sent

- [ ] **Appointment Reminders**

  - Enable SMS reminders
  - Set reminder to 24 hours
  - ✅ Verify: SMS sent 24 hours before appointment
  - ✅ Verify: Customer can confirm via SMS
  - Test email reminders similarly

- [ ] **Loyalty Updates**
  - Enable loyalty notifications
  - Award points to customer
  - ✅ Verify: Customer receives notification
  - ✅ Verify: Points balance included

### Staff Notifications

- [ ] **New Bookings**

  - Enable new booking alerts
  - Create a booking for a staff member
  - ✅ Verify: Staff receives notification
  - ✅ Verify: Can view booking details

- [ ] **Cancellations**

  - Enable cancellation alerts
  - Cancel a booking
  - ✅ Verify: Assigned staff notified
  - ✅ Verify: Calendar updates immediately

- [ ] **Daily Summary**
  - Enable daily summary
  - ✅ Verify: Email sent at configured time
  - ✅ Verify: Includes all bookings for next day
  - ✅ Verify: Shows staff assignments

## 🧪 Integration Testing

### Cross-Feature Validation

- [ ] **Timezone + Bookings**

  - Book appointment in one timezone
  - Change timezone setting
  - ✅ Verify: Booking time adjusts correctly
  - ✅ Verify: No double-bookings created

- [ ] **Business Hours + Online Booking**

  - Set specific business hours
  - Try online booking outside hours
  - ❌ Verify: Cannot book outside hours
  - ✅ Verify: Available slots match business hours

- [ ] **Deposits + Cancellations**

  - Book with deposit
  - Cancel within notice period
  - ✅ Verify: Deposit refunded
  - Cancel late
  - ❌ Verify: Deposit forfeited (or partial refund)

- [ ] **Loyalty + Payment**
  - Complete payment for service
  - ✅ Verify: Points awarded immediately
  - ✅ Verify: Points show in transaction
  - ✅ Verify: Customer balance updated

## 📊 Verification Methods

### API Testing

```bash
# Test settings endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/merchant/settings

# Update a setting
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookingAdvanceHours": 48}' \
  http://localhost:3000/api/v1/merchant/settings
```

### Database Verification

```sql
-- Check merchant settings
SELECT * FROM merchant_settings WHERE merchant_id = 'YOUR_MERCHANT_ID';

-- Verify timezone is applied
SELECT created_at AT TIME ZONE 'Australia/Sydney' as sydney_time,
       created_at AT TIME ZONE 'Australia/Perth' as perth_time
FROM bookings LIMIT 1;
```

### UI Verification

1. Open Developer Tools > Application > Local Storage
2. Check for cached settings
3. Clear cache and verify settings reload from API
4. Check Network tab for correct API calls

## 🚨 Common Issues to Check

1. **Settings Not Persisting**

   - Check API returns 200 status
   - Verify database write permissions
   - Check for JavaScript errors

2. **Timezone Issues**

   - Verify server timezone configuration
   - Check date serialization format
   - Ensure consistent timezone handling

3. **Permission Errors**

   - Verify user role has settings permission
   - Check JWT token includes correct role
   - Verify API endpoint authorization

4. **Validation Failures**
   - Test boundary values (0, negative, very large)
   - Check required field validation
   - Verify data type constraints

## 📝 Test Recording Template

```
Setting: [Setting Name]
Test Date: [Date]
Tester: [Name]
Previous Value: [Value]
New Value: [Value]
Expected Result: [Description]
Actual Result: [Description]
Status: ✅ PASS / ❌ FAIL
Notes: [Any additional observations]
```

## 🎯 Success Criteria

A setting is considered fully functional when:

1. ✅ Value can be changed through UI
2. ✅ Change persists after page refresh
3. ✅ Change persists after logout/login
4. ✅ Business logic respects the setting
5. ✅ Related features update accordingly
6. ✅ No errors in console or network
7. ✅ Audit trail shows setting change

## 🔄 Regression Testing

After any code changes, re-test:

1. Critical settings (timezone, business hours, payment)
2. Security settings (PINs, permissions)
3. Integration points (booking rules, notifications)
4. Recently changed settings
5. Settings that depend on changed code

---

**Remember**: A setting that saves but doesn't affect behavior is broken! Always verify the business logic respects the setting value.
