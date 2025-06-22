# Session Handoff - June 21, 2025

## Overview
This session focused on implementing an Unassigned Column feature for the calendar, fixing critical authentication issues, and improving the development environment stability.

## Major Features Implemented

### 1. Unassigned Column Feature
Implemented a comprehensive "Unassigned" column in the calendar for bookings without specific staff assignments.

#### Backend Changes:
- **Database Schema Updates**:
  - Modified `Booking` model to allow nullable `providerId` (staff assignment)
  - Created and applied migration: `/prisma/migrations/20250620_make_provider_optional/migration.sql`
  - Updated Prisma schema and regenerated client

- **Domain Model Updates**:
  - Updated `Booking` entity to support optional `staffId`
  - Modified booking DTOs to accept optional staff assignments
  - Updated booking mapper to handle null provider relationships

- **Merchant Settings**:
  - Added `showUnassignedColumn: boolean` to `MerchantSettings` interface
  - Created `DEFAULT_MERCHANT_SETTINGS` constant with sensible defaults
  - Created migration script to add setting to existing merchants
  - Auto-enabled for merchants with ≤1 staff member

#### Frontend Changes:
- **Calendar UI**:
  - Added conditional "Unassigned" column as first column when enabled
  - Styled with gray header and Users icon
  - Shows count of unassigned bookings
  - Supports drag-and-drop to/from unassigned column

- **Booking Form**:
  - Added "Next Available" option in staff selection dropdown
  - Creates bookings with null staffId when selected
  - Shows Users icon for visual consistency

- **Settings Page**:
  - Added toggle in Booking Settings to enable/disable unassigned column
  - Persists setting through merchant settings API

### 2. Authentication System Fixes

#### Fixed Critical Logout Infinite Loop:
- **Root Cause**: Conflicting auth systems and race conditions between:
  - Old `useAuth` hook checking localStorage
  - New `AuthProvider` checking centralized state
  - Middleware checking cookies
  - Multiple components making independent auth decisions

- **Solutions Implemented**:
  1. Unified all components to use centralized `AuthProvider`
  2. Fixed circular dependencies in auth provider functions
  3. Synchronized cookie and localStorage clearing on logout
  4. Added proper loading states to prevent premature redirects

#### Fixed Authentication Redirects:
- **Problem**: After fixing loops, redirects stopped working entirely
- **Solution**: 
  - Created `(dashboard)` route group with shared authenticated layout
  - Moved all protected pages into dashboard layout
  - Added `AuthGuard` component to dashboard layout
  - Kept login page outside protected routes

#### New Folder Structure:
```
src/app/
├── (dashboard)/          # Protected routes
│   ├── layout.tsx       # Includes AuthGuard + UI
│   ├── calendar/
│   ├── customers/
│   ├── reports/
│   ├── settings/
│   └── ...
├── login/               # Public route
└── layout.tsx          # Root layout
```

### 3. Development Environment Improvements

#### Fixed Next.js Dev Server Stability:
- **Problem**: Dev server kept shutting down requiring manual restarts
- **Root Causes**:
  - Polling-based file watching causing false restarts
  - No auto-restart mechanism
  - Resource limits being hit

- **Solutions**:
  1. Created auto-restart script: `start-dev.sh`
  2. Disabled polling in `next.config.js`
  3. Added ignored paths for logs
  4. Updated npm scripts to use stable version by default

#### Fixed ChunkLoadError:
- Removed deprecated `swcMinify` option from Next.js config
- Added explicit webpack public path configuration
- Cleared Next.js build cache

## Key Files Modified/Created

### Backend:
- `/apps/api/prisma/schema.prisma` - Made providerId optional
- `/apps/api/src/types/models/merchant.ts` - Added showUnassignedColumn
- `/apps/api/src/merchant/merchant.constants.ts` - Default settings
- `/apps/api/src/contexts/bookings/domain/entities/booking.entity.ts` - Optional staffId
- `/apps/api/src/contexts/bookings/infrastructure/dto/create-booking-v2.dto.ts` - Optional staffId
- `/apps/api/src/scripts/add-unassigned-column-setting.ts` - Migration script

### Frontend:
- `/apps/merchant-app/src/app/calendar/CalendarPageContent.tsx` - Unassigned column UI
- `/apps/merchant-app/src/components/BookingSlideOut.tsx` - Next Available option
- `/apps/merchant-app/src/app/settings/page.tsx` - Toggle setting
- `/apps/merchant-app/src/lib/auth/auth-provider.tsx` - Fixed circular dependencies
- `/apps/merchant-app/src/components/AuthGuard.tsx` - Proper redirect logic
- `/apps/merchant-app/src/app/(dashboard)/layout.tsx` - Shared authenticated layout
- `/apps/merchant-app/start-dev.sh` - Auto-restart script
- `/apps/merchant-app/next.config.js` - Stability improvements

## Testing Notes

### Unassigned Column Testing:
1. Enable feature in Settings > Booking > Show Unassigned Column
2. Create booking with "Next Available" staff option
3. Verify booking appears in Unassigned column
4. Test drag-and-drop to assign staff
5. Verify data persists after refresh

### Auth Testing:
1. Clear all cookies and localStorage
2. Try accessing `/calendar` - should redirect to `/login`
3. Login with HAMILTON/demo123
4. Should redirect to `/calendar` after login
5. Logout should clear everything and redirect to login
6. No infinite loops should occur

## Known Issues Resolved
- ✅ Logout infinite redirect loop
- ✅ Auth redirects not working
- ✅ Dev server constantly shutting down
- ✅ ChunkLoadError on page load
- ✅ Circular dependency errors in auth provider

## Development Commands
```bash
# Start with auto-restart (recommended)
npm run dev

# Start without auto-restart
npm run dev:direct

# Clean start
npm run dev:clean

# If stuck in auth loop, navigate to:
http://localhost:3002/emergency-logout.html
```

## Database Migrations Applied
- `20250120_add_composite_indexes` - Performance indexes
- `20250620_make_provider_optional` - Support unassigned bookings

## Next Steps
1. Create comprehensive test suite for unassigned column feature
2. Add notification system for new unassigned bookings
3. Implement bulk assignment UI for multiple unassigned bookings
4. Add analytics for unassigned booking patterns