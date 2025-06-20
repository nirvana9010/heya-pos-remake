# Owner PIN System UI Test Guide

## Overview
This guide provides step-by-step instructions for manually testing the Owner PIN system through the UI.

## Prerequisites
1. API running on http://localhost:3000
2. Merchant app running on http://localhost:3002
3. Logged in as merchant (HAMILTON/demo123)

## Test Scenarios

### Scenario 1: First-Time Setup (No Owner Exists)
1. Navigate to Reports page (`/reports`)
2. **Expected**: "Create Owner Account" form appears
3. Fill in the form:
   - First Name: Test
   - Last Name: Owner
   - Email: owner@test.com
   - Username: testowner
4. Click "Create Owner Account"
5. **Expected**: "Set Owner PIN" form appears
6. Enter PIN: 5678
7. Confirm PIN: 5678
8. Click "Set Owner PIN"
9. **Expected**: Reports page loads

### Scenario 2: PIN Entry (Owner Already Exists)
1. Navigate away from Reports (e.g., go to Dashboard)
2. Navigate back to Reports page
3. **Expected**: PIN entry screen appears
4. Enter wrong PIN: 0000
5. **Expected**: Error message "Invalid PIN. Please try again."
6. Enter correct PIN: 5678
7. **Expected**: Reports page loads

### Scenario 3: No Session Storage Test
1. After unlocking Reports with PIN
2. Navigate to another page
3. Immediately return to Reports
4. **Expected**: PIN prompt appears again (no 15-minute memory)
5. Enter PIN: 5678
6. **Expected**: Reports page loads

### Scenario 4: Settings Toggle Test
1. Go to Settings → Security
2. Find "Require PIN for Reports" toggle
3. Turn it OFF
4. Navigate to Reports
5. **Expected**: Direct access, no PIN prompt
6. Return to Settings → Security
7. Turn "Require PIN for Reports" back ON
8. Navigate to Reports
9. **Expected**: PIN prompt appears

### Scenario 5: Environment Check
1. On the PIN entry screen
2. **Expected**: NO demo PIN hints (like "Demo PIN: 1234")
3. Try entering demo PIN: 1234
4. **Expected**: Error - demo PIN should not work
5. Only the owner PIN (5678 in our test) should work

### Scenario 6: Error Handling
1. On PIN entry screen
2. Enter wrong PIN 3 times in a row
3. **Expected**: After 3rd attempt, lockout message appears
4. **Expected**: PIN input field disabled

### Scenario 7: Different Features Test
If implemented, test these features:
- Refunds (Settings → Security → "Require PIN for Refunds")
- Cancellations (Settings → Security → "Require PIN for Cancellations")

Each should have independent PIN requirements based on their settings.

## What to Look For

### ✅ Success Indicators
- Owner setup flow appears when no owner exists
- PIN setup requires 4-8 digit numeric PIN
- PIN required EVERY time (no session memory)
- Settings correctly enable/disable PIN protection
- No demo PIN references in UI
- Proper error messages for wrong PIN

### ❌ Failure Indicators
- Demo PIN (1234) works
- PIN remembered between visits
- Direct access when PIN should be required
- Demo hints visible in production mode
- Can bypass PIN with role-based access

## Debugging Tips

1. **Check Console**: Open browser console for any errors
2. **Check Network**: Monitor API calls in Network tab
3. **Clear Storage**: If issues, clear localStorage/sessionStorage
4. **API Health**: Verify API is running and responding

## API Endpoints Being Used
- `GET /api/v1/staff` - Check for owner existence
- `POST /api/v1/staff` - Create owner account
- `GET /api/v1/auth/pin-status` - Check if PIN is set
- `POST /api/v1/auth/set-pin` - Set owner PIN
- `POST /api/v1/auth/verify-pin` - Verify entered PIN
- `GET /api/v1/merchant/settings` - Check PIN requirements

## Known Issues
1. Some PIN API endpoints may not be implemented yet
2. System uses mock implementation in development
3. Staff creation requires specific fields (pin, accessLevel, locationIds)

## Production Checklist
Before going to production:
- [ ] Remove all mock PIN implementations
- [ ] Implement real PIN API endpoints
- [ ] Add PIN hashing/encryption
- [ ] Implement lockout after failed attempts
- [ ] Add audit logging for PIN usage
- [ ] Remove any development-only code