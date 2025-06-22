# Testing Guide - Heya POS System

## Quick Links
1. [Getting Started](#getting-started)
2. [Business Owner Tests](#business-owner-tests)
3. [Customer Booking Tests](#customer-booking-tests)
4. [Making Sure Everything Works Together](#making-sure-everything-works-together)
5. [Speed Tests](#speed-tests)
6. [Security Checks](#security-checks)
7. [Mobile Phone Testing](#mobile-phone-testing)
8. [Final Checks](#final-checks)

---

## Getting Started

### What You'll Need
This guide helps you test the Heya POS system to make sure everything works properly for your beauty salon.

### Website Links & Login Details
```
For Business Owners:
- Website: https://heya-pos-remake-merchant-app.vercel.app/login
- Username: HAMILTON
- Password: demo123

Staff PIN Numbers:
- Sarah Johnson (Owner): 1234
- Emma Williams (Manager): 5678
- Olivia Brown (Employee): 9012

For Customers:
- Website: https://heya-pos-remake-booking-app.vercel.app/hamilton
- Test Phone: +61 400 000 001
- Test Email: test@example.com
```

### How to Mark Your Tests
- ✅ **WORKS**: Everything works perfectly
- ⚠️ **MOSTLY WORKS**: Works but has small issues
- ❌ **DOESN'T WORK**: Has problems that need fixing

### Before You Start
Make sure you have some test data ready:
- A few test services (like "Facial" or "Massage")
- Some test customers
- A few bookings for this week
- At least 3 staff members set up

---

## Getting Ready to Test

### Things to Do First
- [ ] Open the business owner website in your browser
- [ ] Use a modern browser like Chrome, Firefox, or Safari
- [ ] Clear your browser history (ask for help if needed)
- [ ] Have a notepad ready to write down any issues

### Making Sure Everything is Working
1. **Check the Business Website**
   - [ ] Go to the business owner website
   - [ ] The login page should appear quickly
   - [ ] No error messages should show up

2. **Check the Customer Website**
   - [ ] Go to the customer booking website
   - [ ] You should see Hamilton Beauty Spa's page
   - [ ] Services and booking options should be visible

---

## Business Owner Tests

### 1. Logging In and Out

#### 1.1 How to Log In
**What to do:**
1. Go to https://heya-pos-remake-merchant-app.vercel.app/login
2. First, try typing wrong username or password
3. You should see an error message
4. Now type the correct username: HAMILTON and password: demo123
5. Click the login button

**What should happen:**
- [ ] Wrong password shows an error message
- [ ] Correct login takes you to the calendar page
- [ ] Your business name appears at the top right
- [ ] If you refresh the page, you stay logged in
- [ ] The "Remember me" box keeps you logged in longer

#### 1.2 How to Log Out
**What to do:**
1. Click on your profile circle (top right, says "HB")
2. Click "Log out"
3. You should go back to the login page
4. Try to go back to the calendar without logging in

**What should happen:**
- [ ] Clicking logout takes you to the login page
- [ ] You can't see the calendar without logging in again
- [ ] You need to log in again to use the system

#### 1.3 Different Staff Access
**Check what each staff member can see:**
- [ ] Owner (Sarah) - Can see and change everything
- [ ] Manager (Emma) - Can't change important settings
- [ ] Employee (Olivia) - Can only see bookings and customers

---

### 2. Notifications

#### 2.1 Checking Your Notifications
**What to do:**
1. Look for the bell icon at the top of the page
2. Click on the bell
3. Look at the notifications that appear
4. Click on a notification to mark it as read
5. Click "Clear all" to remove all notifications

**What should happen:**
- [ ] The bell shows a red number if you have new notifications
- [ ] You should only see these types of notifications:
  - New bookings from customers
  - Changes to existing bookings  
  - Cancelled bookings
  - Refunds given to customers
- [ ] Clicking a notification removes the red dot
- [ ] "Clear all" removes all notifications
- [ ] Notifications stay even if you refresh the page

#### 2.2 Getting New Notifications
**What to do:**
1. Create a new booking for a customer
2. Change an existing booking time
3. Cancel a booking
4. Give a customer a refund

**What should happen:**
- [ ] New booking creates a notification
- [ ] Changing a booking creates a notification
- [ ] Cancelling creates a notification
- [ ] Refund creates a notification (needs PIN)
- [ ] Notifications appear instantly

---

### 3. Using the Calendar

#### 3.1 Looking at Your Calendar
**What to do:**
1. Click on "Calendar" in the menu
2. Try the different view buttons: Day, Week, Month
3. Use the arrow buttons to go to different dates
4. Click the "Today" button

**What should happen:**
- [ ] You can see all three calendar views
- [ ] Arrow buttons move to previous/next dates
- [ ] "Today" button takes you back to today
- [ ] You can see all your bookings
- [ ] You can filter by staff member

#### 3.2 Making a New Booking
**What to do:**
1. Click on an empty time slot or "New Booking" button
2. Type a customer name or phone to find them (or add new)
3. Pick which service they want
4. Choose the date and time
5. Pick which staff member
6. Add any special notes
7. Click "Save"

**What should happen:**
- [ ] You can search customers by name or phone
- [ ] Picking a service shows the price and how long it takes
- [ ] Only available times are shown
- [ ] Only available staff are shown
- [ ] The booking appears on the calendar after saving
- [ ] You see a success message

#### 3.3 Changing a Booking
**What to do:**
1. Click on an existing booking
2. Change the service, time, or staff member
3. Click "Save changes"
4. Check the calendar updated

**What should happen:**
- [ ] All booking details appear correctly
- [ ] You can change any detail
- [ ] System prevents double-booking
- [ ] Calendar shows the changes right away
- [ ] System keeps track of who made changes

#### 3.4 Cancelling a Booking
**What to do:**
1. Click on a booking
2. Click "Cancel Booking"
3. Pick a reason for cancelling
4. Click "Confirm"

**What should happen:**
- [ ] You must give a reason to cancel
- [ ] Booking shows as "Cancelled"
- [ ] That time becomes available again
- [ ] Customer gets notified (if turned on)
- [ ] You can't cancel bookings that already happened

#### 3.5 Moving Bookings by Dragging
**What to do:**
1. Click and drag a booking to a new time
2. Try dragging to a different staff member
3. Try dragging to a time that's not available

**What should happen:**
- [ ] Booking moves smoothly when you drag
- [ ] Available times light up green
- [ ] Unavailable times show red
- [ ] Booking moves when you let go
- [ ] You can undo if you make a mistake

---

### 4. Managing Customers

#### 4.1 Finding Customers
**What to do:**
1. Click "Customers" in the menu
2. Look at your customer list
3. Type a name or phone number in the search box
4. Look for the crown icon on VIP customers
5. Check the loyalty points shown

**What should happen:**
- [ ] Customer list loads quickly
- [ ] Search finds customers as you type
- [ ] VIP customers have a crown icon
- [ ] Each customer shows their loyalty points
- [ ] List updates when you add or change customers

#### 4.2 Looking at Customer Details
**What to do:**
1. Click on any customer's name
2. Look at their information
3. Check their past bookings
4. Look at their loyalty points
5. Read any notes about them

**What should happen:**
- [ ] All customer info is shown
- [ ] Past bookings are listed newest first
- [ ] Loyalty points are calculated correctly
- [ ] You can add notes about the customer
- [ ] You can update their phone or email

#### 4.3 Adding a New Customer
**What to do:**
1. Click "Add Customer" button
2. Fill in their name and phone number
3. Add their email (optional)
4. Click "Save"

**What should happen:**
- [ ] Form tells you if something is missing
- [ ] Email format is checked (needs @ symbol)
- [ ] Phone number looks correct
- [ ] Warning if customer already exists
- [ ] Success message when saved

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

## Customer Booking Tests

### 10. How Customers Book Online

#### 10.1 Opening the Booking Website
**What to do:**
1. Go to https://heya-pos-remake-booking-app.vercel.app/hamilton
2. Look at the page that loads
3. Check the business name and colors

**What should happen:**
- [ ] You see "Hamilton Beauty Spa"
- [ ] The colors are pink and purple
- [ ] Business information is correct
- [ ] Everything looks professional
- [ ] Page loads without errors

#### 10.2 Choosing Services
**What to do:**
1. Click "Book Appointment" 
2. Look through the service categories
3. Click on a service to select it
4. Try selecting multiple services
5. Check the total price

**What should happen:**
- [ ] All services are shown with pictures
- [ ] Services are organized by type
- [ ] Each service shows price and time
- [ ] You can pick multiple services
- [ ] Total price adds up correctly

#### 10.3 Picking a Date and Time
**What to do:**
1. Look at the calendar
2. Click on a future date
3. Look at available times
4. Try clicking a time that's taken

**What should happen:**
- [ ] Can't pick dates in the past
- [ ] Available times are clearly shown
- [ ] Busy times are grayed out
- [ ] Can't book too far in advance
- [ ] Time slots are the right length for your service

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

## Speed Tests

### 12. Making Sure Everything is Fast

#### 12.1 How Fast Pages Should Load
**Check each page loads quickly:**
- [ ] Login page: Opens in 2 seconds or less
- [ ] Calendar: Opens in 3 seconds or less
- [ ] Customer list: Opens in 2 seconds or less
- [ ] Reports: Opens in 4 seconds or less
- [ ] Settings: Opens in 2 seconds or less
- [ ] Customer booking site: Opens in 2 seconds or less

#### 12.2 How Fast Things Should Work
**Time these actions:**
- [ ] Logging in: Takes less than 1 second
- [ ] Creating a booking: Takes less than 1 second
- [ ] Searching for customers: Results appear instantly
- [ ] Creating reports: Takes less than 3 seconds
- [ ] Loading the calendar: Takes less than 1 second

#### 12.3 Multiple People Using at Once
**Test with several people:**
- [ ] 5 staff using the system at once
- [ ] 10 customers booking at the same time
- [ ] Everything still works fast
- [ ] No bookings get mixed up
- [ ] No error messages appear

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

## Mobile Phone Testing

### 14. Testing on Phones and Tablets

#### 14.1 Business Owner App on Mobile
**Test on your phone:**
- [ ] You can log in on your phone
- [ ] Calendar looks good and works properly
- [ ] You can drag bookings with your finger
- [ ] Forms are easy to fill out
- [ ] Menu buttons are easy to tap

#### 14.2 Customer Booking on Mobile
**Most customers book on phones:**
- [ ] Website looks good on phones
- [ ] Easy to pick services with fingers
- [ ] Calendar is easy to use by touch
- [ ] Forms are simple to complete
- [ ] Booking confirmation is clear

#### 14.3 Important Mobile Features
- [ ] Phone number keypad pops up automatically
- [ ] Date picker is finger-friendly
- [ ] Buttons are big enough to tap easily
- [ ] Text is readable without zooming
- [ ] No need to scroll sideways

---

## Final Checks

### 15. After Everything is Live

#### 15.1 Making Sure It's Working
**Check these things:**
- [ ] Real customers can book appointments
- [ ] Staff can log in and see bookings
- [ ] Payments work correctly
- [ ] Email confirmations are sent
- [ ] Everything loads quickly

#### 15.2 First Real Customer Test
**Do a complete test:**
- [ ] Have someone book online
- [ ] Check it appears in your calendar
- [ ] Process their payment
- [ ] Send them a receipt
- [ ] Make sure they're happy

---

## Test Results

### How Did It Go?
Write down your results here:

**What Worked Well:**
_____________________________________________________
_____________________________________________________

**What Had Problems:**
_____________________________________________________
_____________________________________________________

**What Needs Fixing:**
_____________________________________________________
_____________________________________________________

### Important Notes

#### Recent Changes:
1. **Calendar is now the home page** (not Dashboard)
2. **Light/dark mode is hidden** (coming later)
3. **Loyalty program has its own page** (not in Settings)
4. **Simpler notifications** - only 4 types now
5. **Cleaner navigation menu**

#### Tips:
- Test on different web browsers (Chrome, Safari, Firefox)
- Test on both computers and phones
- Ask a friend to try booking as a customer
- Write down any confusing parts

### Getting Help
If something doesn't work, write down:
1. What you were trying to do
2. What went wrong
3. Any error messages you saw

Then contact support with this information.