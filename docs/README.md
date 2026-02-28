# Heya POS Documentation

## Quick Reference

### 🔐 Authentication Fix (CRITICAL)

- **Problem**: PermissionsGuard was global, running before JwtAuthGuard
- **Solution**: Removed from global, added to controllers after JwtAuthGuard
- **Details**: [testing/E2E_BOOKING_TEST.md](testing/E2E_BOOKING_TEST.md)

### 🧪 Testing

- [E2E Test Plan](testing/E2E_TEST_PLAN.md) - Comprehensive test scenarios
- [Testing Summary](testing/TESTING_SUMMARY.md) - Current status and issues
- [E2E Booking Test](testing/E2E_BOOKING_TEST.md) - Authentication fix details

### 🛠️ API

- [API Scripts](api/API_SCRIPTS.md) - Helper scripts for managing API server

### 📝 Test Credentials

- **Merchant**: `luxeadmin` / `testpassword123`
- **URL**: http://localhost:3002
- **API**: http://localhost:3000/api

### ⚠️ Known Issues

1. API endpoints return 500 errors (service layer issues)
2. PIN requirement has been removed from UI
3. Controllers had duplicate `/api` prefix (fixed)

### 🚀 Quick Start

```bash
# Start API
npm run api:dev

# Start Merchant App
npm run merchant:dev

# If issues, restart everything
npm run stop:all
npm run api:fix
```

## Project Status (Last Updated: 2025-05-27)

### ✅ Working

- Database with test data
- Authentication (JWT)
- API server structure
- Merchant app UI
- Guard execution order

### ❌ Not Working

- Customer service (500 error)
- Booking service (500 error)

### 🔧 Recent Changes

1. Removed PIN requirement after login
2. Fixed guard execution order
3. Fixed controller routing paths
4. Added API management scripts
