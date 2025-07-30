# Location Management - Architecture Disconnect Documentation

## Overview

The Heya POS system has a significant architectural disconnect between its database design and application features regarding location management. While the database fully supports multi-location merchants with location-specific settings, the UI and API endpoints provide only minimal location support.

## Current State Analysis

### ✅ Database Support (Complete)

The `Location` table in Prisma schema includes:
- **Basic Information**
  - `id` (UUID)
  - `merchantId` (foreign key)
  - `name` (location name)
  - `isActive` (boolean)

- **Address Fields**
  - `address` (street address)
  - `suburb`
  - `city`
  - `state`
  - `postalCode`
  - `country`

- **Contact Information**
  - `phone`
  - `email`

- **Operational Data**
  - `timezone` (e.g., "Australia/Sydney")
  - `businessHours` (JSON - per day open/close times)
  - `settings` (JSON - location-specific settings)

### ⚠️ API Support (Partial)

**Existing Endpoints:**
- `GET /api/v1/merchant/profile` - Returns merchant with locations array
- `PUT /api/v1/merchant/location/:locationId` - Updates location address fields only (added July 2025)
- `GET /api/v1/public/merchant-info` - Returns primary location data

**Missing Endpoints:**
- Create new location
- List all locations for a merchant
- Get specific location details
- Update all location fields (not just address)
- Delete/deactivate location
- Set primary location

### ❌ UI Support (Minimal)

**Current UI Limitations:**
1. **Profile Page** (`/profile`)
   - Shows only primary location address
   - Can edit address fields only
   - No access to other location data

2. **Settings Page** (`/settings`)
   - Business hours are stored at merchant level, not location level
   - Timezone is stored at merchant level, not location level
   - No location-specific settings UI

3. **Missing Features:**
   - No location management page
   - No multi-location selector
   - No location-specific business hours
   - No location-specific settings
   - No way to add/remove locations
   - No location status management (active/inactive)

## The Disconnect Problem

### 1. Business Hours Confusion

**Current State:**
- Business hours are stored in TWO places:
  - `location.businessHours` (in database, never updated from UI)
  - `merchant.settings.businessHours` (updated from Settings page)
- Public API now reads from merchant settings first, falls back to location
- This creates data inconsistency

**Impact:**
- Location-specific hours are not possible
- Old data in location.businessHours is ignored
- Confusion about source of truth

### 2. Multi-Location Architecture Not Utilized

**Database Design Indicates:**
- One merchant can have multiple locations
- Each location can have different settings, hours, contact info
- Locations can be activated/deactivated

**Reality:**
- UI assumes single location
- No way to manage multiple locations
- Multi-location businesses cannot use the system properly

### 3. Data Duplication and Inconsistency

**Examples:**
- Phone/email stored at both merchant and location level
- Business hours in both location and merchant settings
- Timezone in both places
- No clear rules about which takes precedence

## Required Fixes

### Phase 1: API Completion
1. Create comprehensive Location API endpoints:
   ```
   GET    /api/v1/merchant/locations
   GET    /api/v1/merchant/locations/:id
   POST   /api/v1/merchant/locations
   PUT    /api/v1/merchant/locations/:id
   DELETE /api/v1/merchant/locations/:id
   PUT    /api/v1/merchant/locations/:id/set-primary
   ```

2. Update DTOs to include all location fields

3. Add validation for location-specific data

### Phase 2: UI Implementation
1. **Location Management Page** (`/locations`)
   - List all locations
   - Add/edit/delete locations
   - Set primary location
   - Toggle active/inactive

2. **Update Existing Pages**
   - Settings: Add location selector for location-specific settings
   - Profile: Show all locations, not just primary
   - Dashboard: Add location selector/filter

3. **Location-Specific Features**
   - Business hours per location
   - Staff assignment per location
   - Services available per location
   - Reports filtered by location

### Phase 3: Data Migration
1. Decide on single source of truth for shared data
2. Migrate business hours from merchant settings to location
3. Clean up duplicate data
4. Add proper cascade rules

## Technical Considerations

### 1. Breaking Changes
- Moving business hours to location level will break existing integrations
- Need migration strategy for existing merchants

### 2. Performance
- Multiple locations will increase data complexity
- Need efficient queries for location-based filtering
- Consider caching strategies

### 3. Permissions
- Need location-based access control
- Staff may only access certain locations
- Reports should respect location permissions

## Recommendations

1. **Immediate Actions:**
   - Add clear comments in code about this disconnect
   - Document which fields are actually used vs ignored
   - Add TODO comments where location features should be

2. **Short Term:**
   - Complete location API endpoints
   - Add basic location listing UI
   - Allow switching primary location

3. **Long Term:**
   - Full multi-location support
   - Location-based permissions
   - Location-specific everything (hours, services, staff, etc.)

## Impact on Current Features

- **Bookings**: Currently assume single location
- **Staff Management**: No location assignment
- **Reporting**: No location filtering
- **Services**: Global, not location-specific
- **Inventory**: Would need location awareness
- **Payments**: Need location context

## Conclusion

The database is well-designed for multi-location support, but the application hasn't caught up. This creates confusion, data inconsistency, and prevents multi-location businesses from using the system effectively. A phased approach to implementing location management would resolve these issues and unlock the full potential of the existing database design.

---
*Document created: July 2025*
*Last updated: July 2025*