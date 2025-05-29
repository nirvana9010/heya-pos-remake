# 🚨 CHECK THIS FIRST 🚨

## Before Making Any Changes

### 1. Authentication is FIXED
- **DO NOT** add PermissionsGuard as a global guard
- **DO NOT** change the guard order in controllers
- Guards must be: `@UseGuards(JwtAuthGuard, PermissionsGuard)`

### 2. Known Working State
- JWT authentication: ✅ Working
- User attachment: ✅ Working  
- Guard execution: ✅ Fixed
- PIN requirement: ✅ Removed

### 3. Known Issues
- Customer API: 500 errors (service layer)
- Booking API: 500 errors (service layer)

### 4. Test Credentials
```
Username: luxeadmin
Password: testpassword123
```

### 5. Quick Status Check
```bash
# Check if API is running correctly
curl http://localhost:3000/api/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "luxeadmin", "password": "testpassword123"}'
```

## File Locations
- Auth fix details: `/docs/testing/E2E_BOOKING_TEST.md`
- Test plan: `/docs/testing/E2E_TEST_PLAN.md`
- API scripts: `/docs/api/API_SCRIPTS.md`
- This file: `/docs/CHECK_FIRST.md`

## Last Updated
2025-05-27 - Fixed authentication guard order issue