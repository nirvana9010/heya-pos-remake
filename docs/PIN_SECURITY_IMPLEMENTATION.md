# PIN Security Implementation

## Overview

PIN security has been implemented to protect sensitive operations in the Heya POS system. This document explains how it works and how to test it.

## Current Implementation

### 1. Reports Page Protection ✅
- **Status**: IMPLEMENTED
- **Location**: `/reports`
- **Component**: `PinProtected` wrapper
- **Setting**: "Require PIN for Reports" in Settings → Security

### 2. How It Works

When PIN protection is enabled for reports:
1. User navigates to Reports page
2. PIN entry screen appears instead of reports
3. User must enter correct PIN to access
4. PIN required EVERY time (no session storage)
5. No role-based bypass - everyone needs PIN

### 3. PIN Validation

**Owner PIN System**:
- Uses the actual owner's PIN (not a demo PIN)
- If no owner exists, prompts to create owner account
- If owner has no PIN, prompts to set PIN
- PIN required for all users (no role bypass)
- PIN required every time (no session storage)

**Setup Flow**:
1. First access to protected feature
2. System checks for owner account
3. If no owner → Create owner account form
4. If no PIN → Set owner PIN form
5. Once set, PIN required for access

**API Endpoints**:
- `GET /api/v1/auth/pin-status` - Check if PIN is set
- `POST /api/v1/auth/set-pin` - Set owner PIN
- `POST /api/v1/auth/verify-pin` - Verify entered PIN

## Testing the PIN Security

### Test 1: First-Time Setup
1. Clear any existing owner/PIN data
2. Navigate to Reports page
3. **Expected**: "Create Owner Account" form appears
4. Fill in owner details and submit
5. **Expected**: "Set Owner PIN" form appears
6. Enter and confirm a PIN (e.g., 5678)
7. **Expected**: PIN is set, Reports page loads

### Test 2: Basic PIN Protection
1. Navigate away from Reports
2. Navigate back to Reports page
3. **Expected**: PIN entry screen appears
4. Enter wrong PIN (e.g., 0000)
5. **Expected**: Error message, stays on PIN screen
6. Enter correct PIN (the one you set)
7. **Expected**: Reports page loads

### Test 2: Session Persistence
1. After unlocking with PIN
2. Navigate away from Reports
3. Come back to Reports within 15 minutes
4. **Expected**: No PIN required (still unlocked)
5. Wait 15+ minutes or refresh page
6. **Expected**: PIN required again

### Test 3: Role-Based Bypass
1. Login as owner/manager (MERCHANT role)
2. Enable PIN requirement
3. Go to Reports
4. **Expected**: Auto-bypasses PIN screen

### Test 4: Settings Toggle
1. Disable "Require PIN for Reports"
2. Go to Reports page
3. **Expected**: Direct access, no PIN screen
4. Re-enable setting
5. **Expected**: PIN required again

## Implementation Details

### PinProtected Component
```tsx
<PinProtected 
  feature="reports"           // reports | refunds | cancellations
  title="Custom Title"        // Optional
  description="Custom desc"   // Optional
>
  {/* Protected content */}
</PinProtected>
```

### Features Supported
- `reports` - Business reports and analytics
- `refunds` - Payment refunds (not yet wrapped)
- `cancellations` - Late booking cancellations (not yet wrapped)

### Security Considerations
1. PIN stored in session storage (not localStorage)
2. Auto-clears after 15 minutes
3. Clears on logout
4. Maximum 3 attempts before lockout
5. Owner/managers can always bypass

## Extending PIN Protection

To add PIN protection to other features:

### 1. Wrap the Component
```tsx
import { PinProtected } from "@/components/PinProtected";

export default function SensitiveFeature() {
  return (
    <PinProtected feature="refunds">
      {/* Your sensitive content */}
    </PinProtected>
  );
}
```

### 2. Add Setting Check
The component automatically checks the appropriate setting:
- `requirePinForReports` → reports feature
- `requirePinForRefunds` → refunds feature
- `requirePinForCancellations` → cancellations feature

### 3. Test Thoroughly
- Enable/disable setting
- Test PIN entry
- Verify session persistence
- Check role bypasses

## PIN Best Practices

### For Development
- Use 1234 as demo PIN
- Test all scenarios
- Verify settings integration

### For Production
1. Implement real PIN verification endpoint
2. Store PINs securely (hashed)
3. Implement attempt limiting
4. Add PIN reset functionality
5. Audit PIN usage

## Troubleshooting

### PIN Screen Not Appearing
1. Check setting is enabled
2. Clear browser cache
3. Check console for errors
4. Verify component wrapping

### PIN Not Accepted
1. Demo mode: Use 1234
2. Check if logged in as owner
3. Verify attempts not exceeded
4. Check session storage

### Settings Not Saving
1. Check API response
2. Verify merchant settings endpoint
3. Check network tab for errors

## Future Enhancements

1. **Real PIN Management**
   - Set/change PIN UI
   - Forgot PIN flow
   - PIN complexity rules

2. **Additional Protection**
   - Void transactions
   - Discount overrides
   - Employee termination

3. **Enhanced Security**
   - Biometric support
   - 2FA integration
   - Time-based restrictions

4. **Audit Trail**
   - Log PIN usage
   - Track failed attempts
   - Report access history