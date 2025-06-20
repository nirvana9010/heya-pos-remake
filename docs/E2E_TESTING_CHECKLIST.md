# End-to-End Testing Checklist - Heya POS System

## Table of Contents
1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Merchant App Tests](#merchant-app-tests)
4. [Booking App Tests](#booking-app-tests)
5. [Integration Tests](#integration-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)
8. [Mobile Responsiveness](#mobile-responsiveness)
9. [Post-Deployment Verification](#post-deployment-verification)

---

## Overview

### Purpose
This comprehensive testing checklist ensures all critical workflows function correctly before production deployment. All tests will be performed using the Hamilton Beauty Spa test merchant.

### Test Credentials
```
Merchant Login:
- URL: http://localhost:3002 (Merchant App)
- Username: HAMILTON
- Password: demo123

Staff PINs:
- Sarah Johnson (Owner): 1234
- Emma Williams (Manager): 5678
- Olivia Brown (Employee): 9012

Booking App:
- URL: http://localhost:3001/hamilton
- Test Phone: +61 400 000 001
- Test Email: test@example.com
```

### Pass Criteria
- ✅ **PASS**: Feature works as expected with no errors
- ⚠️ **PARTIAL**: Feature works but with minor issues
- ❌ **FAIL**: Feature doesn't work or has critical issues

### Test Data Requirements
- At least 10 active services across different categories
- Minimum 5 test customers with booking history
- Current week should have some existing bookings
- At least 3 active staff members with different roles

---

## Test Environment Setup

### Pre-Test Checklist
- [ ] All services running (API, Merchant App, Booking App)
- [ ] Database seeded with test data
- [ ] Browser console open for error monitoring
- [ ] Network tab open for API monitoring
- [ ] Test in Chrome, Firefox, and Safari
- [ ] Clear browser cache before testing

### Environment Verification
1. **API Health Check**
   - [ ] Navigate to http://localhost:3000/api/v1/health
   - [ ] Response shows "OK" status
   - [ ] Response time < 500ms

2. **Database Connection**
   - [ ] Merchant app loads without database errors
   - [ ] Can retrieve merchant settings
   - [ ] Booking data loads correctly

---

## Merchant App Tests

### 1. Authentication & Authorization

#### 1.1 Login Flow
**Steps:**
1. Navigate to merchant app login page
2. Enter invalid credentials
3. Verify error message appears
4. Enter valid credentials (HAMILTON/demo123)
5. Verify redirect to calendar (not dashboard)

**Expected Results:**
- [ ] Invalid login shows "Invalid credentials" error
- [ ] Valid login redirects to calendar within 2 seconds
- [ ] User info displays in header
- [ ] Session persists on page refresh
- [ ] "Remember me" checkbox works correctly

#### 1.2 Logout Flow
**Steps:**
1. Click user menu in header
2. Select "Logout"
3. Verify redirect to login page
4. Try accessing dashboard directly via URL

**Expected Results:**
- [ ] Logout clears session immediately
- [ ] Direct URL access redirects to login
- [ ] No authenticated API calls after logout

#### 1.3 Role-Based Access
**Test each with different staff roles**
- [ ] Owner (Sarah) - Full access to all features
- [ ] Manager (Emma) - No access to critical settings
- [ ] Employee (Olivia) - Limited to bookings and customers

---

### 2. Notifications System

#### 2.1 Notification Bell
**Steps:**
1. Check notification bell in top navigation
2. Click bell to open dropdown
3. Verify notification types displayed
4. Mark notifications as read
5. Clear all notifications

**Expected Results:**
- [ ] Bell shows unread count badge
- [ ] Dropdown displays only valid notifications:
  - New bookings
  - Booking modifications  
  - Booking cancellations
  - Payment refunds
- [ ] No invalid notification types appear
- [ ] Mark as read updates badge count
- [ ] Clear all removes notifications
- [ ] Notifications persist on page refresh

#### 2.2 Real-time Notifications
**Steps:**
1. Create a new booking
2. Modify an existing booking
3. Cancel a booking
4. Process a refund

**Expected Results:**
- [ ] New booking triggers notification
- [ ] Booking modification triggers notification
- [ ] Cancellation triggers notification
- [ ] Refund triggers notification with PIN
- [ ] Notifications appear without page refresh

---

### 3. Calendar & Scheduling

#### 3.1 Calendar View
**Steps:**
1. Navigate to Calendar page
2. Switch between Day/Week/Month views
3. Navigate between dates using arrows
4. Click "Today" button

**Expected Results:**
- [ ] All views render correctly
- [ ] Navigation updates URL and view
- [ ] Today button returns to current date
- [ ] Existing bookings display in correct time slots
- [ ] Staff filter works correctly

#### 3.2 Create Booking (Walk-in)
**Steps:**
1. Click empty time slot or "New Booking" button
2. Search and select customer (or create new)
3. Select service(s)
4. Choose date and time
5. Select staff member
6. Add notes (optional)
7. Save booking

**Expected Results:**
- [ ] Customer search works (name, phone, email)
- [ ] Service selection updates duration and price
- [ ] Only available time slots shown
- [ ] Staff availability reflects schedule
- [ ] Booking saves and appears on calendar
- [ ] Confirmation message displays

#### 3.3 Edit Booking
**Steps:**
1. Click existing booking
2. Modify service, time, or staff
3. Save changes
4. Verify calendar updates

**Expected Results:**
- [ ] Booking details load correctly
- [ ] Can change all editable fields
- [ ] Validation prevents double-booking
- [ ] Changes reflect immediately on calendar
- [ ] Audit log shows modification

#### 3.4 Cancel Booking
**Steps:**
1. Open booking details
2. Click "Cancel Booking"
3. Select cancellation reason
4. Confirm cancellation

**Expected Results:**
- [ ] Cancellation reason required
- [ ] Booking status updates to "Cancelled"
- [ ] Time slot becomes available
- [ ] Customer receives notification (if enabled)
- [ ] Cannot cancel past bookings

#### 3.5 Drag & Drop Rescheduling
**Steps:**
1. Drag booking to new time slot
2. Drag to different staff column
3. Drag to unavailable slot

**Expected Results:**
- [ ] Smooth drag animation
- [ ] Valid slots highlighted
- [ ] Invalid slots show red indicator
- [ ] Booking updates on drop
- [ ] Undo option available

---

### 4. Customer Management

#### 4.1 Customer List
**Steps:**
1. Navigate to Customers page
2. View customer list
3. Use search functionality
4. Check VIP customer badges
5. View loyalty points display

**Expected Results:**
- [ ] List loads without pagination issues
- [ ] Search works for name and phone
- [ ] Real-time search updates as you type
- [ ] VIP badges (crown icon) display correctly
- [ ] Loyalty points show for each customer
- [ ] Customer list updates immediately on changes

#### 4.2 Customer Profile
**Steps:**
1. Click on customer name
2. View profile information
3. Check booking history
4. Review loyalty points
5. View notes and preferences

**Expected Results:**
- [ ] All customer data displays
- [ ] Booking history shows chronologically
- [ ] Loyalty points calculate correctly
- [ ] Can add/edit notes
- [ ] Contact information is editable

#### 4.3 Create New Customer
**Steps:**
1. Click "Add Customer" button
2. Fill in required fields
3. Add optional information
4. Save customer

**Expected Results:**
- [ ] Form validation works properly
- [ ] Email validation checks format
- [ ] Phone number formats correctly
- [ ] Duplicate email/phone warning
- [ ] Success message on save

---

### 5. Service Management

#### 5.1 Service List
**Steps:**
1. Navigate to Services page
2. View all services
3. Check category organization
4. Verify pricing display

**Expected Results:**
- [ ] Services grouped by category
- [ ] Prices display with currency
- [ ] Duration shows in minutes
- [ ] Active/inactive status visible
- [ ] Edit buttons accessible

#### 5.2 Add/Edit Service
**Steps:**
1. Click "Add Service"
2. Fill in service details
3. Set pricing and duration
4. Assign to category
5. Save service

**Expected Results:**
- [ ] Form validates required fields
- [ ] Price accepts decimal values
- [ ] Duration in minute increments
- [ ] Category selection works
- [ ] Service appears in list after save

---

### 6. Staff Management

#### 6.1 Staff List
**Steps:**
1. Navigate to Staff page
2. View all staff members
3. Check role indicators
4. Verify schedule display

**Expected Results:**
- [ ] Staff list shows all members
- [ ] Roles clearly indicated
- [ ] Active/inactive status visible
- [ ] Schedule summary accurate
- [ ] Contact info displayed

#### 6.2 Staff Schedule
**Steps:**
1. Click on staff member
2. View weekly schedule
3. Edit working hours
4. Add time off
5. Save changes

**Expected Results:**
- [ ] Schedule grid displays correctly
- [ ] Can toggle working days
- [ ] Time selection works properly
- [ ] Time off blocks bookings
- [ ] Changes save successfully

---

### 7. Payment Processing

#### 7.1 Process Payment
**Steps:**
1. Open completed booking
2. Click "Process Payment"
3. Select payment method
4. Enter amount (with tip if enabled)
5. Complete payment

**Expected Results:**
- [ ] Payment methods display correctly
- [ ] Amount calculations accurate
- [ ] Tip options work (if enabled)
- [ ] Receipt generation works
- [ ] Payment status updates

#### 7.2 Process Refund
**Steps:**
1. Open paid booking
2. Click "Refund"
3. Enter refund amount
4. Provide reason
5. Enter PIN (if required)
6. Process refund

**Expected Results:**
- [ ] PIN prompt appears (if enabled)
- [ ] Only owner/manager PIN accepted
- [ ] Partial refund option works
- [ ] Refund reason required
- [ ] Transaction record created

---

### 8. Reports & Analytics

#### 8.1 Access Reports (PIN Security)
**Steps:**
1. Navigate to Reports page
2. Enter incorrect PIN
3. Enter correct owner PIN (1234)
4. Access reports

**Expected Results:**
- [ ] PIN prompt appears immediately
- [ ] Wrong PIN shows error
- [ ] Correct PIN grants access
- [ ] No session storage (PIN required each time)
- [ ] Demo PIN hints only in dev mode

#### 8.2 Report Generation
**Steps:**
1. Select date range
2. View different report types
3. Export reports
4. Print reports

**Expected Results:**
- [ ] Date picker works correctly
- [ ] Reports load with accurate data
- [ ] Charts render properly
- [ ] Export generates PDF/CSV
- [ ] Print layout is correct

---

### 9. Settings Management

#### 9.1 Business Settings
**Steps:**
1. Navigate to Settings
2. Update business information
3. Change timezone
4. Modify business hours
5. Note: Loyalty settings removed (use dedicated Loyalty page)
6. Save changes

**Expected Results:**
- [ ] All fields editable
- [ ] Timezone affects booking display
- [ ] Business hours update availability
- [ ] Changes persist after refresh
- [ ] Validation prevents invalid data
- [ ] No loyalty tab appears in settings

#### 9.2 Booking Rules
**Steps:**
1. Change advance booking hours
2. Modify cancellation policy
3. Toggle online bookings
4. Set buffer times
5. Save settings

**Expected Results:**
- [ ] Settings apply to booking flow
- [ ] Validation prevents conflicts
- [ ] Changes affect customer booking app
- [ ] Buffer time blocks calendar
- [ ] Policies display to customers

#### 9.3 Security Settings
**Steps:**
1. Toggle PIN requirements
2. Test each PIN-protected feature
3. Verify PIN enforcement

**Expected Results:**
- [ ] PIN toggles work immediately
- [ ] Each feature respects its setting
- [ ] Owner PIN required where enabled
- [ ] No hardcoded demo PINs work
- [ ] Settings persist correctly

---

## Booking App Tests

### 10. Customer Booking Flow

#### 10.1 Merchant Access
**Steps:**
1. Navigate to http://localhost:3001/hamilton
2. Verify merchant theme loads
3. Check business information display

**Expected Results:**
- [ ] Hamilton branding appears
- [ ] Correct theme colors (pink/purple)
- [ ] Business info accurate
- [ ] Navigation links include /hamilton prefix
- [ ] No merchant detection errors

#### 10.2 Service Selection
**Steps:**
1. Click "Book Appointment"
2. Browse service categories
3. Select multiple services
4. View service details

**Expected Results:**
- [ ] All active services display
- [ ] Categories organize correctly
- [ ] Prices and duration visible
- [ ] Multiple selection works
- [ ] Total price calculates correctly

#### 10.3 Date & Time Selection
**Steps:**
1. View calendar
2. Select available date
3. Choose from available times
4. Try selecting unavailable slot

**Expected Results:**
- [ ] Only future dates selectable
- [ ] Available slots show clearly
- [ ] Unavailable times are disabled
- [ ] Advance booking rules apply
- [ ] Time slots match service duration

#### 10.4 Staff Selection
**Steps:**
1. View available staff
2. Select preferred staff
3. Try "Any Available" option

**Expected Results:**
- [ ] Only available staff shown
- [ ] Staff info displays correctly
- [ ] "Any Available" works
- [ ] Selection updates availability
- [ ] Staff images load (if present)

#### 10.5 Customer Identification
**Steps:**
1. Enter phone number
2. System finds existing customer
3. Try with new customer
4. Fill in required details

**Expected Results:**
- [ ] Phone lookup works instantly
- [ ] Existing customer data pre-fills
- [ ] New customer form appears
- [ ] Validation works properly
- [ ] Email format validated

#### 10.6 Booking Confirmation
**Steps:**
1. Review booking details
2. Accept terms (if required)
3. Process deposit (if required)
4. Complete booking

**Expected Results:**
- [ ] Summary shows all details
- [ ] Deposit amount correct
- [ ] Terms checkbox required
- [ ] Confirmation page displays
- [ ] Confirmation email sent

#### 10.7 Booking Management
**Steps:**
1. Use booking reference
2. View booking details
3. Try to cancel booking
4. Check cancellation policy

**Expected Results:**
- [ ] Lookup by phone/reference works
- [ ] Details match booking
- [ ] Cancellation respects policy
- [ ] Cannot cancel if too late
- [ ] Cancellation confirmation sent

### 10. Loyalty Program

#### 10.1 Loyalty Page Access
**Steps:**
1. Navigate to Loyalty page
2. View loyalty settings
3. Check customer loyalty stats

**Expected Results:**
- [ ] Loyalty page loads correctly
- [ ] Settings display current configuration
- [ ] Customer loyalty points visible
- [ ] Accrual rules clearly shown
- [ ] Redemption options available

#### 10.2 Loyalty Points Accrual
**Steps:**
1. Complete a booking payment
2. Check customer loyalty points update
3. Verify points calculation

**Expected Results:**
- [ ] Points accrue based on spend
- [ ] Points display immediately
- [ ] Calculation follows rules
- [ ] History shows transactions
- [ ] No duplicate accruals

---

## Integration Tests

### 11. Cross-App Workflows

#### 11.1 Real-time Sync
**Steps:**
1. Create booking in merchant app
2. Check it appears in calendar
3. Customer creates booking
4. Verify in merchant app

**Expected Results:**
- [ ] Updates appear within 5 seconds
- [ ] No duplicate bookings
- [ ] Status syncs correctly
- [ ] All details match
- [ ] No data inconsistencies

#### 11.2 Availability Management
**Steps:**
1. Block time in merchant calendar
2. Check customer app availability
3. Add staff time off
4. Verify slots removed

**Expected Results:**
- [ ] Blocked time unavailable immediately
- [ ] Staff time off reflects
- [ ] Service duration considered
- [ ] Buffer times apply
- [ ] No overbooking possible

#### 11.3 Customer Data Sync
**Steps:**
1. Update customer in merchant app
2. Customer books appointment
3. Verify updated data used

**Expected Results:**
- [ ] Customer data current
- [ ] Contact info syncs
- [ ] Preferences apply
- [ ] Notes visible to staff
- [ ] History accurate

---

## Performance Tests

### 12. Load Time Requirements

#### 12.1 Page Load Times
**Test each major page**
- [ ] Login page: < 2 seconds
- [ ] Calendar (default page): < 3 seconds
- [ ] Customer list: < 2 seconds
- [ ] Reports: < 4 seconds
- [ ] Settings: < 2 seconds
- [ ] Booking app home: < 2 seconds

#### 12.2 API Response Times
**Monitor network tab**
- [ ] Login: < 500ms
- [ ] Booking creation: < 1 second
- [ ] Search operations: < 500ms
- [ ] Report generation: < 3 seconds
- [ ] Calendar data: < 1 second

#### 12.3 Concurrent Users
**Test with multiple browsers**
- [ ] 5 concurrent merchant users
- [ ] 10 concurrent customers booking
- [ ] No performance degradation
- [ ] No data conflicts
- [ ] Proper error handling

---

## Security Tests

### 13. Security Validations

#### 13.1 Authentication Security
- [ ] Session expires after inactivity
- [ ] Cannot access API without token
- [ ] Token refresh works properly
- [ ] Password requirements enforced
- [ ] No sensitive data in localStorage

#### 13.2 Authorization Checks
- [ ] Role-based access enforced
- [ ] Cannot bypass PIN protection
- [ ] API endpoints check permissions
- [ ] No privilege escalation possible
- [ ] Audit logs capture actions

#### 13.3 Data Protection
- [ ] Customer data not exposed
- [ ] PINs not visible in requests
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection active
- [ ] CORS properly configured

---

## Mobile Responsiveness

### 14. Mobile Testing

#### 14.1 Merchant App Mobile
**Test on phone/tablet**
- [ ] Login works on mobile
- [ ] Calendar (default) responsive
- [ ] Calendar drag-drop works on touch
- [ ] Forms work properly
- [ ] Navigation accessible (4-column grid)

#### 14.2 Booking App Mobile
**Primary mobile flow**
- [ ] Homepage responsive
- [ ] Service selection works
- [ ] Calendar touch-friendly
- [ ] Forms easy to complete
- [ ] Confirmation displays well

#### 14.3 Critical Mobile Features
- [ ] Phone number input with keypad
- [ ] Date picker works on touch
- [ ] Buttons large enough to tap
- [ ] Text readable without zoom
- [ ] No horizontal scrolling

---

## Post-Deployment Verification

### 15. Production Checklist

#### 15.1 Environment Configuration
- [ ] Environment variables set
- [ ] Database migrations complete
- [ ] SSL certificates active
- [ ] Error logging configured
- [ ] Monitoring tools active

#### 15.2 First User Tests
- [ ] Create merchant account
- [ ] Complete full booking cycle
- [ ] Process payment
- [ ] Generate reports
- [ ] Test email notifications

#### 15.3 Production Monitoring
- [ ] Error rates < 0.1%
- [ ] Page load times normal
- [ ] Database queries optimized
- [ ] No memory leaks
- [ ] Backup systems working

---

## Test Result Summary

### Overall Results
- **Total Tests**: ___
- **Passed**: ___
- **Partial**: ___
- **Failed**: ___
- **Pass Rate**: ___%

### Critical Issues
1. _________________________________
2. _________________________________
3. _________________________________

### Non-Critical Issues
1. _________________________________
2. _________________________________
3. _________________________________

### Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Product Owner | | | |
| Tech Lead | | | |
| Business Owner | | | |

### Notes
_____________________________________________________
_____________________________________________________
_____________________________________________________

---

## Appendix

### A. Recent Changes & Known Issues

#### Recent MVP Changes:
1. **Dashboard Hidden**: Login now redirects to Calendar instead of Dashboard (not providing value for MVP)
2. **Theme Toggle Hidden**: Light/dark mode switch removed as non-functional
3. **Loyalty Moved**: Loyalty settings removed from Settings page, use dedicated Loyalty page
4. **Simplified Notifications**: Reduced from 13 types to 4 essential types:
   - New bookings
   - Booking modifications
   - Booking cancellations
   - Payment refunds
5. **Navigation Grid**: Sidebar reduced from 5 to 4 columns after Dashboard removal

#### Known Issues:
- Old notification types may appear until localStorage is cleared
- Console logs API may show occasional errors (non-critical)
- Include workarounds if available

### B. Browser Compatibility
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

### C. Device Testing
- Desktop (1920x1080) ✅
- Laptop (1366x768) ✅
- Tablet (768x1024) ✅
- Mobile (375x667) ✅

### D. Test Data Cleanup
- [ ] Remove test bookings
- [ ] Reset customer data
- [ ] Clear test payments
- [ ] Reset staff schedules
- [ ] Clean audit logs