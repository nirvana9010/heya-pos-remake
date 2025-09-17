# Heya POS Merchant App - Complete Feature Guide & Test Cases

## 🎯 Executive Summary
Heya POS is a comprehensive business management platform for service-based businesses (spas, salons, wellness centers). The merchant app provides staff with tools for appointment scheduling, customer management, payment processing, and business analytics.

---

## 📱 Module 1: Authentication & Access Control

### Features
- **Multi-tenant Architecture**: Each business operates in isolation
- **Role-Based Access**: Employee, Manager, Owner permission levels
- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **PIN Protection**: Additional security layer for sensitive operations

### Test Cases
```
✅ BASIC AUTHENTICATION
□ Login with valid email/password (lukas.tn90@gmail.com / demo456)
□ Login with invalid credentials (should fail with error message)
□ Login with non-existent user (should show appropriate error)
□ Verify session persists across page refreshes
□ Verify token refresh works after 15-minute expiry
□ Test logout clears all session data

✅ ROLE-BASED ACCESS
□ Employee can't access Settings > Security tab
□ Employee can't process refunds without Manager PIN
□ Manager can access all features except owner-only settings
□ Owner has unrestricted access to all features
□ PIN protection triggers for configured sensitive operations
```

---

## 🏠 Module 2: Dashboard & Home

### Features
- **Real-time Statistics**: Today's bookings, revenue, new customers, pending items
- **Quick Actions**: One-click access to common tasks
- **Today's Schedule**: Live view of upcoming appointments
- **Performance Indicators**: Growth metrics and trend visualization

### Test Cases
```
✅ DASHBOARD METRICS
□ Today's bookings count matches actual bookings list
□ Revenue calculation includes all completed payments
□ New customers shows registrations from midnight
□ Pending bookings filters correctly by status
□ Growth percentages calculate correctly vs yesterday

✅ QUICK ACTIONS
□ "New Booking" navigates to booking creation
□ "View Calendar" opens calendar view
□ "Customers" opens customer list
□ "Reports" opens reports section

✅ TODAY'S SCHEDULE
□ Shows only today's bookings in chronological order
□ Displays customer name, service, time, and staff
□ Status badges show correct colors (pending=yellow, confirmed=green)
□ Clicking booking opens detail view
□ Empty state shows when no bookings exist
```

---

## 📅 Module 3: Booking Management

### Features
- **Multi-Service Bookings**: Add multiple services to single appointment
- **Drag-Drop Calendar**: Visual scheduling with conflict prevention
- **Status Workflow**: Pending → Confirmed → In Progress → Completed → Paid
- **Bulk Operations**: Select multiple bookings for mass updates
- **Advanced Filtering**: By status, date, staff, payment, customer

### Test Cases
```
✅ BOOKING CREATION
□ Create single-service booking with all required fields
□ Create multi-service booking (2+ services)
□ Verify total duration calculates correctly
□ Test staff availability validation
□ Create walk-in booking (no pre-selected customer)
□ Add booking notes and special requests
□ Verify price adjustments work per service

✅ BOOKING MANAGEMENT
□ Change booking status through workflow
□ Reschedule to different time (drag-drop)
□ Reassign to different staff member
□ Edit services within existing booking
□ Cancel booking with reason
□ Mark as no-show with notes

✅ FILTERING & SEARCH
□ Filter by status (pending, confirmed, completed)
□ Filter by date range (today, this week, custom)
□ Filter by staff member
□ Filter by payment status (paid, unpaid, partial)
□ Search by customer name
□ Search by booking ID
□ Combined filters work correctly

✅ EDGE CASES
□ Prevent double-booking same staff/time
□ Handle booking across day boundary (11pm-1am)
□ Validate minimum 15-minute duration
□ Test maximum services per booking (10+)
□ Handle timezone changes correctly
```

---

## ✅ Module 4: Check-Ins & Walk-Ins

### Features
- **QR Code Check-in**: Customers scan to check in
- **Manual Check-in**: Search and check in customers
- **Walk-in Creation**: Create blank bookings for walk-in customers
- **Service Assignment**: Assign services after arrival
- **Real-time Updates**: Live check-in status updates

### Test Cases
```
✅ CHECK-IN PROCESS
□ QR code check-in updates booking status
□ Manual search finds customer bookings
□ Check-in changes status to "Arrived"
□ Multiple bookings for same customer handled correctly
□ Check-in triggers staff notification

✅ WALK-IN MANAGEMENT
□ Create blank booking for new walk-in
□ Blank booking defaults to 15-minute duration
□ Service selection available after creation
□ Staff assignment works for walk-ins
□ Convert walk-in to regular booking

✅ SERVICE WORKFLOW
□ "Start Service" changes status to In Progress
□ Timer begins counting service duration
□ "Complete Service" marks as completed
□ Completion triggers payment prompt
□ No-show option available with reason
```

---

## 👥 Module 5: Customer Management

### Features
- **Customer Profiles**: Complete contact and preference management
- **Booking History**: Full appointment and service history
- **Loyalty Program**: Points accumulation and redemption
- **VIP Status**: Special customer designation
- **Communication Tools**: Direct phone/email contact
- **Import/Export**: Bulk customer data management

### Test Cases
```
✅ CUSTOMER CREATION
□ Add new customer with all fields
□ Validate email format
□ Validate phone number format
□ Optional fields can be left blank
□ Duplicate email prevention works
□ Profile photo upload works

✅ CUSTOMER MANAGEMENT
□ Edit existing customer details
□ View complete booking history
□ See total spend and visit count
□ Loyalty points display correctly
□ VIP status can be toggled
□ Add/edit customer notes

✅ BULK OPERATIONS
□ Import customers from CSV template
□ Export customer list to CSV
□ Merge duplicate customers
□ Bulk delete inactive customers
□ Mass email/SMS capabilities

✅ SEARCH & FILTER
□ Search by name (partial match)
□ Search by phone number
□ Search by email
□ Filter by VIP status
□ Filter by visit frequency
□ Filter by last visit date
```

---

## 👨‍💼 Module 6: Staff Management

### Features
- **Staff Profiles**: Complete employee information management
- **Role Assignment**: Employee, Manager, Owner permissions
- **PIN Security**: Individual PINs for secure operations
- **Schedule Management**: Availability and shift planning
- **Performance Tracking**: Revenue and utilization metrics
- **Color Coding**: Visual identification in calendar

### Test Cases
```
✅ STAFF CREATION
□ Add staff with all required fields
□ Upload staff photo
□ Set unique PIN (4-6 digits)
□ Assign permission level
□ Select calendar color
□ Set contact information

✅ STAFF MANAGEMENT
□ Edit staff details
□ Change permission level
□ Reset PIN with authorization
□ Deactivate staff (bookings retained)
□ Reactivate inactive staff
□ Delete staff with booking warning

✅ SCHEDULE MANAGEMENT
□ Set weekly availability
□ Add special dates/holidays
□ Block time slots
□ View staff calendar
□ Check booking conflicts

✅ PERFORMANCE METRICS
□ View revenue per staff member
□ Service count tracking
□ Average service duration
□ Customer satisfaction ratings
□ Commission calculations
```

---

## 🛍️ Module 7: Service Management

### Features
- **Service Catalog**: Complete service offerings management
- **Category Organization**: Logical service groupings
- **Pricing Control**: Flexible pricing and duration settings
- **Bulk Import**: CSV-based service import
- **Status Management**: Enable/disable services
- **Description Management**: Detailed service information

### Test Cases
```
✅ SERVICE CREATION
□ Add service with name, price, duration
□ Assign to category
□ Set description and benefits
□ Upload service image
□ Assign eligible staff
□ Set active/inactive status

✅ SERVICE MANAGEMENT
□ Edit service details
□ Change pricing (verify bookings unaffected)
□ Adjust duration
□ Move between categories
□ Bulk price adjustment (percentage/fixed)
□ Deactivate service (hidden from booking)

✅ CATEGORY MANAGEMENT
□ Create new category
□ Edit category name and description
□ Reorder categories
□ Delete empty category
□ Merge categories

✅ IMPORT/EXPORT
□ Download CSV template
□ Import services from CSV
□ Validate import data
□ Handle duplicate services
□ Export service catalog
```

---

## 💳 Module 8: Payment Processing

### Features
- **Multiple Payment Methods**: Cash, card (Tyro), split payments
- **Loyalty Integration**: Points redemption during payment
- **Discounts & Surcharges**: Flexible pricing adjustments
- **Tip Management**: Percentage or fixed amount tips
- **Receipt Generation**: Digital and printed receipts
- **Refund Processing**: Authorized refund management

### Test Cases
```
✅ PAYMENT METHODS
□ Process full cash payment with change
□ Process card payment via Tyro terminal
□ Split payment 50/50 cash/card
□ Custom split amounts
□ Loyalty points redemption
□ Gift card redemption

✅ ADJUSTMENTS
□ Apply percentage discount
□ Apply fixed amount discount
□ Add percentage surcharge
□ Add fixed surcharge
□ Apply tip (10%, 15%, 20%, custom)
□ Combine multiple adjustments

✅ TRANSACTION MANAGEMENT
□ Generate digital receipt
□ Email receipt to customer
□ Print physical receipt
□ Process refund with PIN
□ Partial refund processing
□ Void transaction

✅ EDGE CASES
□ Handle exact change scenarios
□ Prevent negative totals
□ Maximum discount limits
□ Network failure during card payment
□ Tyro terminal disconnection
□ Concurrent payment attempts
```

---

## 📊 Module 9: Reports & Analytics

### Features
- **Executive Dashboard**: Modern visualization with KPIs
- **Classic Reports**: Traditional detailed reporting
- **Time Range Analysis**: Daily, weekly, monthly, yearly
- **Revenue Analytics**: Income tracking and trends
- **Staff Performance**: Individual performance metrics
- **Service Analytics**: Service popularity and revenue

### Test Cases
```
✅ REPORT GENERATION
□ Daily sales summary accurate
□ Weekly revenue matches sum of daily
□ Monthly reports include all days
□ Year-to-date calculations correct
□ Previous period comparisons work

✅ DATA ACCURACY
□ Revenue totals match payment records
□ Booking counts match actual bookings
□ Staff revenue attribution correct
□ Service breakdown percentages = 100%
□ Customer metrics match database

✅ EXPORT FUNCTIONALITY
□ Export to CSV maintains formatting
□ Export includes all visible columns
□ Date ranges export correctly
□ Large datasets export successfully
□ Special characters handled properly

✅ VISUALIZATION
□ Charts render correctly
□ Trend lines calculate properly
□ Pie charts show percentages
□ Bar graphs scale appropriately
□ Tables sort correctly
```

---

## ⚙️ Module 10: Settings & Configuration

### Features
- **Business Settings**: Operating hours, timezone, information
- **Booking Rules**: Policies and restrictions
- **Security Configuration**: PIN requirements and permissions
- **Notification Preferences**: Email and SMS settings
- **Payment Integration**: Tyro terminal configuration
- **Import Tools**: Bulk data import capabilities

### Test Cases
```
✅ BUSINESS CONFIGURATION
□ Update operating hours per day
□ Set timezone (affects all times)
□ Configure booking advance limits
□ Set cancellation policies
□ Update business information

✅ SECURITY SETTINGS
□ Enable/disable PIN for refunds
□ Set PIN timeout duration
□ Configure role permissions
□ Test permission restrictions
□ PIN reset functionality

✅ NOTIFICATIONS
□ Configure email notifications
□ Set reminder timing (1hr, 24hr)
□ Test notification delivery
□ Customer opt-out respected
□ Staff alerts working

✅ INTEGRATIONS
□ Pair Tyro terminal
□ Test payment processing
□ Unpair and re-pair device
□ Handle connection failures
□ Backup payment methods
```

---

## 🔄 Module 11: Quick Sale (POS)

### Features
- **Rapid Transactions**: Streamlined service sales
- **No Appointment Required**: Direct service purchase
- **Multi-Service Sales**: Add multiple services to sale
- **Customer Association**: Link to customer or walk-in
- **Instant Payment**: Immediate payment processing

### Test Cases
```
✅ QUICK SALE FLOW
□ Add single service to sale
□ Add multiple services
□ Adjust quantities
□ Apply item discounts
□ Select customer
□ Process as walk-in

✅ PAYMENT COMPLETION
□ Complete cash sale
□ Complete card sale
□ Apply loyalty discount
□ Generate receipt
□ Update inventory/metrics
```

---

## 🧪 Comprehensive Testing Scenarios

### Scenario 1: Full Day Operations
```
1. Morning Setup
   □ Staff clock in with PIN
   □ Review today's bookings
   □ Check dashboard metrics

2. Customer Flow
   □ Process 3 check-ins
   □ Start services on time
   □ Handle 1 walk-in customer
   □ Complete and payment for each

3. Afternoon Rush
   □ Handle overlapping bookings
   □ Reassign staff for absence
   □ Process group booking
   □ Manage payment queue

4. End of Day
   □ Complete final services
   □ Process all payments
   □ Review daily report
   □ Close out register
```

### Scenario 2: Problem Resolution
```
□ Double-booking conflict (reschedule one)
□ Customer claims missing booking (check history)
□ Payment dispute (review transaction log)
□ Service complaint (apply compensation)
□ Staff no-show (reassign all bookings)
□ System offline (use offline mode)
```

### Scenario 3: Peak Performance Testing
```
□ Create 50 bookings in one day
□ Process 10 simultaneous check-ins
□ Handle 5 concurrent payments
□ Generate monthly report with 1000+ records
□ Import 500 customers via CSV
□ Manage calendar with 8 staff members
```

---

## 🚨 Critical Test Points

### Data Integrity
- Payments always match bookings
- No orphaned transactions
- Customer data consistency
- Booking status progression
- Timezone handling

### Security
- PIN protection enforced
- Role restrictions work
- Session timeout functions
- Secure payment processing
- Data encryption active

### Performance
- Page loads < 3 seconds
- Search returns < 1 second
- Reports generate < 5 seconds
- No memory leaks
- Smooth scrolling/navigation

### User Experience
- Error messages are helpful
- Loading states shown
- Confirmations for destructive actions
- Keyboard navigation works
- Mobile responsive design

---

## 📋 Onboarding Checklist for New Team Members

### Week 1: Foundation
- [ ] Complete authentication module testing
- [ ] Familiarize with dashboard navigation
- [ ] Create test bookings (single and multi-service)
- [ ] Process check-ins and walk-ins
- [ ] Complete basic payment transactions

### Week 2: Advanced Features
- [ ] Master customer management and loyalty
- [ ] Configure staff profiles and permissions
- [ ] Manage service catalog
- [ ] Generate and analyze reports
- [ ] Configure system settings

### Week 3: Real-World Scenarios
- [ ] Complete full day operation scenario
- [ ] Handle problem resolution cases
- [ ] Test edge cases and error handling
- [ ] Document any bugs or issues found
- [ ] Provide feedback on user experience

---

## 🔑 Key Information

### Test Account Credentials
- **Merchant**: Zen Wellness
- **Email**: lukas.tn90@gmail.com
- **Password**: demo456
- **URL**: http://localhost:3002 (Merchant App)
- **Customer Booking**: http://localhost:3001/zen-wellness

### Support Resources
- Report issues at: https://github.com/anthropics/claude-code/issues
- API Documentation: Available in `/docs` directory
- Database Schema: Check Prisma schema files
- Logs: Use PM2 for monitoring (`pm2 logs api`)

### Important Notes
- Always test in development environment first
- Use test data, never production customer data
- Document all issues with screenshots when possible
- Follow the test cases systematically
- Report critical bugs immediately

---

## 🎯 Success Metrics

Your onboarding is complete when you can:
1. Navigate all modules confidently
2. Create and manage complete customer journeys
3. Identify and report bugs effectively
4. Train merchants on system usage
5. Troubleshoot common issues independently
6. Understand the business logic behind each feature

---

*Last Updated: 2025-09-09*
*Version: 1.0*