# Merchant Onboarding & Data Import - Progress Update

## ✅ Completed Tasks

### 1. Admin Dashboard API Connection
- Created API client (`apps/admin-dashboard/src/lib/api-client.ts`)
- Created admin API service (`apps/admin-dashboard/src/lib/admin-api.ts`)
- Added authentication context (`apps/admin-dashboard/src/contexts/auth-context.tsx`)
- Created protected route wrapper (`apps/admin-dashboard/src/components/protected-route.tsx`)
- Added login page (`apps/admin-dashboard/src/app/login/page.tsx`)

### 2. Backend Admin Endpoints
- Added temporary admin login endpoint (`POST /api/admin/login`)
  - Credentials: `admin` / `admin123`
- Implemented all required merchant management endpoints:
  - `GET /api/admin/merchants` - List all merchants
  - `POST /api/admin/merchants` - Create new merchant
  - `GET /api/admin/merchants/:id` - Get merchant details
  - `PATCH /api/admin/merchants/:id` - Update merchant
  - `DELETE /api/admin/merchants/:id` - Soft delete merchant
  - `GET /api/admin/check-subdomain` - Check subdomain availability
  - `GET /api/admin/check-username` - Check username availability
  - `GET /api/admin/packages` - Get available packages

### 3. Merchant Creation Form Updates
- Updated form to match API requirements:
  - Changed `merchantCode` to `subdomain`
  - Added `username` field with real-time availability check
  - Added `password` field with generator
  - Added `packageId` dropdown (loads packages from API)
  - Added `abn` field (optional)
  - Real-time subdomain availability checking
  - Proper validation and error handling

### 4. Merchant List Page
- Connected to real API data
- Shows correct statistics (total, active, inactive, MRR)
- DataTable displays real merchant data
- Search and filter functionality
- Actions menu (view, edit, suspend)

## 🔄 Data Import Status

### Customer Import (Backend Ready)
- ✅ `POST /api/v1/customers/import` - CSV upload endpoint implemented
- ✅ Handles duplicates by email/phone
- ✅ Returns detailed import results
- ❌ No UI wizard yet

### Service Import (Backend Ready)
- ✅ `POST /api/v1/services/import` - JSON import endpoint
- ✅ `POST /api/v1/services/import/csv` - CSV upload endpoint
- ✅ Auto-creates categories if needed
- ✅ Configurable duplicate handling
- ❌ No UI wizard yet

## 🚀 How to Test

1. **Start the services:**
   ```bash
   # Terminal 1 - API
   cd apps/api && npm run start:dev
   
   # Terminal 2 - Admin Dashboard
   cd apps/admin-dashboard && npm run dev
   ```

2. **Access admin dashboard:**
   - URL: http://localhost:3003
   - Login: `admin` / `admin123`

3. **Test merchant creation:**
   - Click "Add Merchant" button
   - Fill in the form (all fields with * are required)
   - Subdomain and username will show availability in real-time
   - After creation, you'll see a success dialog with:
     - Booking URL
     - Merchant portal URL
     - Username and password
     - Copy buttons for each credential

## 📝 Next Steps

1. **Create Data Import UI Wizards:**
   - Customer import wizard with CSV upload
   - Service import wizard with CSV/JSON upload
   - Field mapping interface
   - Progress tracking
   - Error handling and reporting

2. **Implement Proper Admin Authentication:**
   - Create admin users table in database
   - Implement proper JWT-based admin auth
   - Add role-based permissions
   - Remove hardcoded credentials

3. **End-to-End Testing:**
   - Test full merchant creation flow
   - Verify merchant can login with provided credentials
   - Test booking app works with new merchant subdomain
   - Verify data import functionality

## ⚠️ Important Notes

1. **Temporary Admin Auth:** The admin login is hardcoded (`admin`/`admin123`) for testing. This MUST be replaced with proper authentication before production.

2. **API is Unprotected:** Admin endpoints currently have no authentication guards. In production, these should require admin JWT tokens.

3. **URLs are Hardcoded:** The success dialog shows hardcoded URLs. These should be configured based on environment.

## 🐛 Known Issues

- Admin endpoints need authentication guards
- No error recovery for failed merchant creation (transaction rollback works but UI doesn't handle partial failures)
- Package prices are shown as decimals in database but need to be numbers in frontend

## 📊 Database Schema Notes

- Merchants have a `status` field (not `isActive`) - values: ACTIVE, INACTIVE, DELETED
- Merchants have `package` relation (not `subscription`)
- Packages don't have an `isActive` field
- Trial period is tracked via `trialEndsAt` on merchant