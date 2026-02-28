# Heya POS Booking App - Customer Interface Feature Guide & Test Cases

## 🎯 Executive Summary

The Booking App is the customer-facing interface for Heya POS, providing a multi-tenant booking platform where customers can discover services, book appointments, manage their bookings, and check in for their appointments. Each merchant has their own customized booking interface accessible via subdomain paths.

---

## 🌐 Module 1: Multi-Tenant Architecture

### Features

- **Subdomain-Based Access**: Each merchant has unique URL path (e.g., `/zen-wellness/`)
- **Dynamic Branding**: Merchant-specific colors, logos, and themes
- **Business Information**: Location, hours, contact details
- **Timezone Support**: All times displayed in merchant's timezone

### Test Cases

```
✅ MERCHANT ACCESS
□ Access merchant via correct subdomain path
□ Verify merchant branding loads correctly
□ Confirm business hours display accurately
□ Check timezone conversion works properly
□ Test non-existent merchant shows 404
□ Verify merchant logo and colors applied

✅ RESPONSIVE DESIGN
□ Mobile layout (320px - 768px)
□ Tablet layout (768px - 1024px)
□ Desktop layout (1024px+)
□ Touch interactions work on mobile
□ Horizontal scrolling prevented
□ Forms are mobile-optimized
```

---

## 🏠 Module 2: Landing Page

### Features

- **Business Showcase**: Welcome message, description, photos
- **Popular Services**: Featured services with pricing
- **Operating Hours**: Daily schedule with current status
- **Contact Information**: Phone, email, address with maps
- **Customer Reviews**: Testimonials and ratings
- **Call-to-Actions**: Book Now, View Services, Contact Us

### Test Cases

```
✅ CONTENT DISPLAY
□ Business name and description visible
□ Operating hours show correctly for each day
□ Current day is highlighted
□ "Open Now" / "Closed" status accurate
□ Contact information is clickable (phone/email)
□ Map shows correct location

✅ NAVIGATION
□ "Book Now" button navigates to booking flow
□ "View Services" shows service catalog
□ "My Bookings" accessible (if logged in)
□ Social media links work
□ Contact form submission works
```

---

## 📅 Module 3: Online Booking System

### Step 1: Service Selection

#### Features

- **Service Categories**: Organized by type (Massage, Facial, etc.)
- **Search & Filter**: Find services quickly
- **Multi-Service Selection**: Book multiple services at once
- **Pricing Display**: Clear pricing and duration info
- **Service Details**: Descriptions and benefits

#### Test Cases

```
✅ SERVICE BROWSING
□ All active services display
□ Categories filter correctly
□ Search finds services by name
□ Search finds services by partial match
□ Inactive services are hidden
□ Prices display in correct currency

✅ SERVICE SELECTION
□ Select single service
□ Select multiple services
□ Deselect services
□ Running total updates correctly
□ Duration calculates properly
□ Maximum services limit enforced (if any)
```

### Step 2: Staff Selection

#### Features

- **Staff Profiles**: Photos, names, experience
- **"Any Available" Option**: System assigns best match
- **Service Compatibility**: Only shows qualified staff
- **Availability Preview**: Basic availability indicator

#### Test Cases

```
✅ STAFF DISPLAY
□ Only qualified staff shown for selected services
□ "Any Available" option always present
□ Staff photos load correctly
□ Experience/bio displays if available
□ Inactive staff are hidden

✅ STAFF SELECTION
□ Select specific staff member
□ Select "Any Available"
□ Change staff selection
□ Selection persists to next step
□ Multi-service booking uses same staff
```

### Step 3: Date & Time Selection

#### Features

- **Calendar View**: Horizontal date picker
- **Availability Checking**: Real-time slot availability
- **Time Grouping**: Morning, Afternoon, Evening slots
- **Business Hours**: Only show valid operating times
- **Advance Booking Limits**: Enforce merchant policies

#### Test Cases

```
✅ DATE SELECTION
□ Current date is highlighted
□ Past dates are disabled
□ Advance booking limit enforced (e.g., 30 days)
□ Weekends/holidays marked appropriately
□ Can navigate between months
□ Selected date persists

✅ TIME SLOT AVAILABILITY
□ Available slots show in green
□ Booked slots show as unavailable
□ Slots respect business hours
□ Slots respect staff schedule
□ Minimum booking notice enforced (e.g., 2 hours)
□ Multi-service duration considered

✅ TIME SELECTION
□ Morning slots (6am-12pm) grouped correctly
□ Afternoon slots (12pm-6pm) grouped correctly
□ Evening slots (6pm-close) grouped correctly
□ Selected time highlights
□ Cannot select unavailable slots
□ Time selection updates total duration display
```

### Step 4: Customer Information

#### Features

- **Returning Customer Check**: Phone/email lookup
- **Auto-Population**: Previous customer data fills
- **New Customer Registration**: Required fields validation
- **Special Requests**: Notes and preferences
- **Contact Preferences**: SMS/Email opt-in

#### Test Cases

```
✅ RETURNING CUSTOMER
□ Phone number lookup works
□ Email lookup works
□ Customer data auto-populates
□ Can update existing information
□ Previous preferences loaded

✅ NEW CUSTOMER
□ All required fields marked with *
□ Email validation (format)
□ Phone validation (format)
□ Name fields required
□ Error messages clear and helpful
□ Form prevents submission with errors

✅ DATA VALIDATION
□ Email format validated
□ Phone number format validated
□ Special characters handled
□ Maximum field lengths enforced
□ XSS prevention (no script injection)
```

### Step 5: Payment (Optional)

#### Features

- **Deposit Collection**: If required by merchant
- **Full Payment Option**: Pay entire amount upfront
- **Secure Processing**: PCI-compliant payment
- **Multiple Methods**: Card, digital wallets
- **Receipt Generation**: Email confirmation

#### Test Cases

```
✅ PAYMENT REQUIREMENTS
□ Deposit amount calculates correctly
□ Full payment option available
□ Payment methods display properly
□ Terms and conditions shown

✅ PAYMENT PROCESSING
□ Card validation works
□ Secure payment form (HTTPS)
□ Processing indicators show
□ Success message displays
□ Failure handling with clear errors
□ Receipt sent to email
```

### Step 6: Confirmation

#### Features

- **Booking Summary**: All details displayed
- **Confirmation Number**: Unique booking reference
- **Calendar Integration**: Add to Google/Apple Calendar
- **Email Confirmation**: Automatic sending
- **Print Option**: Printable confirmation

#### Test Cases

```
✅ CONFIRMATION DISPLAY
□ Booking ID shown prominently
□ All service details correct
□ Staff assignment shown
□ Date and time accurate
□ Total price displayed
□ Cancellation policy visible

✅ CONFIRMATION ACTIONS
□ Email sent automatically
□ "Add to Calendar" downloads .ics file
□ Print version opens correctly
□ "Book Another" returns to start
□ "View My Bookings" navigation works
```

---

## 📱 Module 4: Customer Check-In

### Features

- **Self-Service Check-In**: Customer-initiated arrival
- **Phone Number Entry**: Simple identification
- **Booking Display**: Show today's appointments
- **Walk-In Support**: Create blank bookings
- **Status Updates**: Real-time merchant notification

### Test Cases

```
✅ CHECK-IN FLOW
□ Phone number input formats correctly
□ Numeric keypad shows on mobile
□ Lookup finds customer bookings
□ Multiple bookings handled correctly
□ No bookings message for walk-ins

✅ BOOKING CHECK-IN
□ Today's bookings displayed
□ Past appointments hidden
□ Check-in button works
□ Status changes to "Checked In"
□ Merchant receives notification
□ Success message shows

✅ WALK-IN CREATION
□ "No bookings" offers walk-in option
□ Customer info form appears
□ Blank booking created
□ 15-minute default duration
□ Staff notified of walk-in
□ Success confirmation shown

✅ SESSION MANAGEMENT
□ Auto-reset after 30 seconds
□ Manual reset button works
□ Previous customer data cleared
□ Ready for next customer
```

---

## 👤 Module 5: My Bookings (Customer Portal)

### Features

- **Booking History**: Past and upcoming appointments
- **Booking Management**: View, cancel, reschedule
- **Quick Rebook**: Repeat previous services
- **Loyalty Points**: View accumulated points
- **Profile Management**: Update contact information

### Test Cases

```
✅ AUTHENTICATION
□ Login with phone number
□ Login with email
□ OTP/password verification
□ Session persistence
□ Logout functionality

✅ BOOKING DISPLAY
□ Upcoming bookings shown first
□ Past bookings in history
□ Booking details expandable
□ Status badges accurate
□ Chronological ordering

✅ BOOKING ACTIONS
□ Cancel upcoming booking (with policy check)
□ Reschedule to new time
□ View full booking details
□ Add to calendar
□ Rebook same service

✅ PROFILE MANAGEMENT
□ Update contact information
□ Change communication preferences
□ View loyalty points balance
□ Update password/PIN
□ Delete account option
```

---

## 🔄 Integration Points

### With Merchant App

- **Real-Time Updates**: Check-ins appear instantly
- **Availability Sync**: Live calendar updates
- **Booking Notifications**: New booking alerts
- **Status Changes**: Cancellations, modifications

### With Admin Dashboard

- **Multi-Tenant Config**: Merchant settings applied
- **Package Limits**: Booking restrictions enforced
- **Analytics Tracking**: Customer behavior data

---

## 🧪 Comprehensive Testing Scenarios

### Scenario 1: Complete Customer Journey

```
1. Discovery
   □ Find merchant via search/link
   □ Browse business information
   □ Read reviews and testimonials

2. Booking Process
   □ Select 2 services
   □ Choose specific staff member
   □ Pick date 3 days ahead
   □ Select morning time slot
   □ Enter customer information
   □ Complete payment (if required)
   □ Receive confirmation

3. Appointment Day
   □ Receive reminder (24h and 2h)
   □ Use check-in kiosk on arrival
   □ Service completed
   □ Receive thank you email
   □ Leave review
```

### Scenario 2: Edge Cases

```
□ Book appointment at day boundary (11:45 PM)
□ Book with "Any Available" staff
□ Walk-in when fully booked
□ Cancel within cancellation window
□ Reschedule to different service
□ Network interruption during booking
□ Payment failure and retry
```

### Scenario 3: Performance Testing

```
□ Load landing page < 2 seconds
□ Service search returns < 500ms
□ Calendar loads < 1 second
□ 10 concurrent bookings
□ 50 services displayed smoothly
□ Mobile performance on 3G
```

---

## 🚨 Critical Test Points

### Data Validation

- Email formats validated
- Phone numbers formatted correctly
- No SQL injection possible
- XSS protection active
- CSRF tokens present

### User Experience

- Mobile-first responsive design
- Accessible forms (ARIA labels)
- Clear error messages
- Loading states visible
- Success confirmations clear

### Business Logic

- Availability accurately calculated
- Pricing matches merchant settings
- Timezone conversions correct
- Booking limits enforced
- Cancellation policies applied

---

## 📋 Test Accounts & URLs

### Test Merchants

```
Zen Wellness:
- URL: http://localhost:3001/zen-wellness
- Features: Full service catalog, multiple staff

Hamilton Beauty Spa:
- URL: http://localhost:3001/hamilton
- Features: Deposit requirements, limited hours
```

### Test Customers

```
New Customer Test:
- Use any unregistered phone number
- Test validation and registration

Returning Customer:
- Phone: 0400000000
- Has booking history
```

---

## 🔑 Key Testing Checklist

### Mobile Testing (Priority)

- [ ] Complete booking on iPhone Safari
- [ ] Complete booking on Android Chrome
- [ ] Check-in process on tablet
- [ ] Responsive layout at all breakpoints
- [ ] Touch interactions work smoothly

### Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

### Accessibility Testing

- [ ] Keyboard navigation
- [ ] Screen reader compatible
- [ ] Color contrast ratios
- [ ] Focus indicators visible
- [ ] Form labels present

### Performance Testing

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No memory leaks
- [ ] Smooth scrolling

---

_Last Updated: 2025-01-09_
_Version: 1.0_
