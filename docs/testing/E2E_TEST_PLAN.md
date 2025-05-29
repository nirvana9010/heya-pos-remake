# End-to-End Testing Plan for Heya POS

## Overview
This document outlines comprehensive E2E tests for the most common workflows in the Heya POS system.

## Test Environment
- API: http://localhost:3000/api
- Merchant App: http://localhost:3002
- Test Merchant: Luxe Beauty & Wellness (luxeadmin/testpassword123)

## Core Workflows to Test

### 1. Authentication & Authorization
- [ ] Merchant login
- [ ] Logout
- [ ] Session persistence
- [ ] Invalid credentials handling

### 2. Booking Management
- [ ] Create new booking (walk-in)
- [ ] Create new booking (existing customer)
- [ ] View booking details
- [ ] Edit booking (reschedule)
- [ ] Cancel booking
- [ ] Check-in customer
- [ ] Complete booking
- [ ] View calendar/schedule

### 3. Customer Management
- [ ] Search customers
- [ ] Create new customer
- [ ] View customer profile
- [ ] Edit customer details
- [ ] View customer booking history
- [ ] Add customer notes

### 4. Service Management
- [ ] View service list
- [ ] Create new service
- [ ] Edit service details
- [ ] Manage service categories
- [ ] Update pricing
- [ ] Enable/disable services

### 5. Staff Management
- [ ] View staff list
- [ ] View staff schedule
- [ ] Assign services to staff
- [ ] View staff performance

### 6. Payment Processing
- [ ] Process payment for booking
- [ ] View payment history
- [ ] Generate invoice
- [ ] Handle refunds

### 7. Reporting
- [ ] View dashboard statistics
- [ ] Daily revenue report
- [ ] Booking reports
- [ ] Customer reports

## Test Execution Order
1. Authentication (prerequisite for all tests)
2. Service setup (needed for bookings)
3. Customer creation
4. Booking workflows
5. Payment processing
6. Reporting verification

## Test Data Requirements
- Existing test merchant with services
- Sample customers
- Various booking statuses
- Payment records

---

# Test Execution Log

## Test #1: Create New Booking

### Prerequisites
- [ ] API running on port 3000
- [ ] Merchant app running on port 3002
- [ ] Logged in as merchant

### Test Steps
1. Navigate to bookings page
2. Click "New Booking"
3. Select or create customer
4. Select service
5. Select staff member
6. Select date and time
7. Confirm booking
8. Verify booking created

### Expected Results
- Booking created successfully
- Booking appears in calendar
- Customer notified (if applicable)
- Booking status is "CONFIRMED"

### Actual Results

#### Authentication Issue Discovered
- **Problem**: API endpoints return 403 Forbidden despite valid JWT token
- **Root Cause**: Controllers have duplicate `/api` prefix (e.g., `/api/api/customers`)
- **Auth Status**: 
  - `/api/auth/me` endpoint works ✅
  - Protected endpoints fail with "User not authenticated" ❌
  
#### Findings:
1. JWT authentication is working (token validates correctly)
2. PermissionsGuard is not finding the user on the request
3. Controllers need path correction (remove 'api/' prefix)
4. Need to ensure JWT strategy properly attaches user to request

#### Next Steps:
1. Fix controller paths
2. Debug JWT strategy user attachment
3. Test booking creation via UI instead of API