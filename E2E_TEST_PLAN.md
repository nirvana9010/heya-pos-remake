# Heya POS E2E Test Plan

## Overview
This document outlines all user flows that need to be tested before switching from mockApi to the real API backend.

## Test Environment
- API URL: http://localhost:3001
- Merchant App URL: http://localhost:3002
- Test Credentials: luxeadmin / testpassword123

## Critical User Flows to Test

### 1. Authentication Flow
- [ ] Merchant login with valid credentials
- [ ] Token storage in localStorage
- [ ] Token refresh mechanism
- [ ] Logout functionality
- [ ] Protected route access with valid token
- [ ] Redirect to login when token is invalid/expired

### 2. Customer Management
- [ ] List all customers with pagination
- [ ] Search customers by name/phone/email
- [ ] Create new customer with all fields
- [ ] Update existing customer information
- [ ] View customer details
- [ ] View customer booking history
- [ ] Delete customer (if supported)

### 3. Service Management
- [ ] List all services
- [ ] Filter services by category
- [ ] View service details (name, price, duration)
- [ ] Search services
- [ ] Check service availability

### 4. Booking Management
- [ ] Create new booking with:
  - [ ] Customer selection
  - [ ] Service selection
  - [ ] Staff selection (optional)
  - [ ] Date and time selection
  - [ ] Notes addition
- [ ] View booking list
- [ ] Filter bookings by date/status
- [ ] View booking details
- [ ] Update booking (reschedule)
- [ ] Cancel booking
- [ ] Check booking conflicts

### 5. Calendar View
- [ ] View daily calendar
- [ ] View weekly calendar
- [ ] View monthly calendar
- [ ] See all bookings on calendar
- [ ] Filter by staff member
- [ ] Check availability slots

### 6. Real-time Updates
- [ ] WebSocket connection establishment
- [ ] Receive booking creation notifications
- [ ] Receive booking update notifications
- [ ] Receive booking cancellation notifications
- [ ] Handle connection failures gracefully

### 7. Dashboard
- [ ] Load dashboard statistics
- [ ] Today's bookings count
- [ ] Revenue metrics
- [ ] Customer counts
- [ ] Recent bookings list

### 8. Reports (if implemented)
- [ ] Generate daily reports
- [ ] Generate revenue reports
- [ ] Export reports

### 9. Settings
- [ ] View merchant profile
- [ ] Update business hours
- [ ] Manage staff members

## API Endpoints to Test

### Auth Endpoints
- POST /auth/merchant/login
- POST /auth/refresh
- POST /auth/logout

### Customer Endpoints
- GET /customers
- GET /customers/search
- GET /customers/:id
- POST /customers
- PATCH /customers/:id
- DELETE /customers/:id

### Service Endpoints
- GET /services
- GET /services/categories
- GET /services/:id

### Booking Endpoints
- GET /bookings
- GET /bookings/:id
- POST /bookings
- PATCH /bookings/:id
- DELETE /bookings/:id
- POST /bookings/check-availability

### WebSocket Events
- connection
- booking:created
- booking:updated
- booking:cancelled

## Expected Issues to Watch For

1. **Authentication**
   - JWT token format differences
   - Token expiration handling
   - Guard execution order

2. **Data Format**
   - Date/time format differences
   - ID format (string vs number)
   - Pagination response structure

3. **Error Handling**
   - Different error response formats
   - Status codes
   - Validation error messages

4. **WebSocket**
   - Connection authentication
   - Event payload formats
   - Reconnection logic

## Test Execution Steps

1. Start the API server
2. Ensure database is seeded with test data
3. Start the merchant app
4. Execute each test flow manually
5. Document any issues found
6. Create automated tests for regression

## Success Criteria

- All critical flows work without errors
- Data persists correctly in the database
- Real-time updates work across multiple clients
- Error messages are user-friendly
- Performance is acceptable (< 2s response times)