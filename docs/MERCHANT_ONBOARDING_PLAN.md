# Merchant Onboarding Implementation Plan

## Overview
This document outlines the step-by-step plan to implement:
1. Admin portal merchant creation functionality
2. Competitor data import system for customers and services

## Task 1: Admin Portal Merchant Creation

### Current State
- ✅ UI exists with merchant listing and add form
- ✅ API endpoints exist with full creation logic
- ❌ UI and API are not connected
- ❌ Using mock data instead of real API

### Implementation Steps

#### Phase 1: API Client Setup (2-3 hours)
1. **Create API client for admin dashboard**
   ```typescript
   // apps/admin-dashboard/src/lib/api-client.ts
   - Copy pattern from booking-app
   - Add authentication token support
   - Configure base URL from environment
   ```

2. **Add authentication context**
   ```typescript
   // apps/admin-dashboard/src/contexts/auth-context.tsx
   - Store admin token
   - Handle login/logout
   - Protect routes
   ```

3. **Environment configuration**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

#### Phase 2: Update Merchant Creation Form (3-4 hours)
1. **Fix form fields to match API requirements**
   - Change `merchantCode` to `subdomain`
   - Add `username` field (required)
   - Add `password` field with generator
   - Add `packageId` dropdown (fetch packages from API)
   - Add `abn` field (optional)
   - Show default settings (timezone, currency)

2. **Add form validation**
   - Subdomain: lowercase, alphanumeric with hyphens
   - Username: uppercase, alphanumeric
   - Password: minimum 8 characters
   - Email: valid email format
   - Phone: valid phone format

3. **Implement real-time validation**
   - Check subdomain availability via API
   - Check username availability via API

#### Phase 3: Connect UI to API (2-3 hours)
1. **Replace mock API calls**
   ```typescript
   // Before (mock):
   const merchants = await mockApi.getMerchants();
   
   // After (real):
   const merchants = await apiClient.get('/admin/merchants');
   ```

2. **Implement merchant creation**
   ```typescript
   const createMerchant = async (data) => {
     try {
       const response = await apiClient.post('/admin/merchants', {
         name: data.name,
         email: data.email,
         phone: data.phone,
         subdomain: data.subdomain,
         username: data.username,
         password: data.password,
         packageId: data.packageId,
         abn: data.abn
       });
       
       // Show success with credentials
       showSuccessDialog({
         merchantName: response.name,
         bookingUrl: `https://bookings.heya-pos.com/${response.subdomain}`,
         loginUrl: `https://merchant.heya-pos.com`,
         username: data.username,
         password: data.password
       });
       
       // Refresh merchant list
       await fetchMerchants();
     } catch (error) {
       showError(error.message);
     }
   };
   ```

3. **Add loading states and error handling**
   - Show spinner during API calls
   - Display API errors clearly
   - Handle network failures gracefully

#### Phase 4: Post-Creation Features (2-3 hours)
1. **Success dialog improvements**
   - Show all merchant details
   - Copy buttons for URLs and credentials
   - Send welcome email option
   - Download credentials as PDF

2. **Quick actions after creation**
   - View merchant button → opens merchant in new tab
   - Add first location
   - Configure services
   - Import data button → leads to import wizard

#### Phase 5: Testing & Polish (2-3 hours)
1. **End-to-end testing checklist**
   - [ ] Create merchant with all fields
   - [ ] Verify merchant appears in list
   - [ ] Login as new merchant works
   - [ ] Booking app shows new merchant
   - [ ] Services can be added
   - [ ] Bookings can be created

2. **Edge cases to test**
   - Duplicate subdomain
   - Duplicate username
   - Invalid email/phone
   - Network failures
   - Concurrent creation

3. **UI/UX improvements**
   - Keyboard navigation
   - Form field hints
   - Progress indication
   - Success animations

## Task 2: Competitor Data Import System

### Import Strategy
Build a flexible import system that can handle various competitor formats

### Implementation Steps

#### Phase 1: Import Infrastructure (3-4 hours)
1. **Create import service**
   ```typescript
   // apps/api/src/imports/import.service.ts
   - Parse CSV/Excel files
   - Validate data formats
   - Map competitor fields to our schema
   - Handle duplicates
   - Transaction-based imports
   ```

2. **Import controller endpoints**
   ```typescript
   POST /api/v1/imports/validate - Validate import file
   POST /api/v1/imports/preview - Preview import results
   POST /api/v1/imports/execute - Execute import
   GET /api/v1/imports/:id/status - Check import status
   ```

3. **Import models**
   ```prisma
   model Import {
     id          String   @id @default(uuid())
     merchantId  String
     type        String   // 'customers' | 'services'
     status      String   // 'pending' | 'processing' | 'completed' | 'failed'
     totalRows   Int
     processedRows Int
     errors      Json?
     mapping     Json     // Field mapping configuration
     createdAt   DateTime
     completedAt DateTime?
   }
   ```

#### Phase 2: Customer Import (4-5 hours)
1. **Customer import formats**
   ```typescript
   // Support common fields from competitors:
   interface CustomerImportRow {
     // Required
     firstName: string
     lastName: string
     email: string
     phone: string
     
     // Optional
     dateOfBirth?: string
     address?: string
     notes?: string
     tags?: string[]
     lastVisit?: string
     totalSpent?: number
     visitCount?: number
   }
   ```

2. **Import processing logic**
   ```typescript
   async processCustomerImport(file, merchantId) {
     // 1. Parse file (CSV/Excel)
     // 2. Validate required fields
     // 3. Normalize phone numbers
     // 4. Check for duplicates (by email/phone)
     // 5. Create customers in batches
     // 6. Handle errors gracefully
     // 7. Generate import report
   }
   ```

3. **Duplicate handling strategies**
   - Skip duplicates
   - Update existing
   - Create with suffix
   - Manual review

#### Phase 3: Service Import (4-5 hours)
1. **Service import formats**
   ```typescript
   interface ServiceImportRow {
     // Required
     name: string
     price: number
     duration: number  // in minutes
     
     // Optional
     category?: string
     description?: string
     isActive?: boolean
     order?: number
   }
   ```

2. **Category mapping**
   - Auto-create categories if not exist
   - Map competitor categories to ours
   - Default category for unmapped

3. **Price/duration normalization**
   - Handle different price formats ($, decimal)
   - Convert duration units (hours to minutes)
   - Validate reasonable ranges

#### Phase 4: Import UI Wizard (4-5 hours)
1. **Step 1: Upload file**
   - Drag & drop interface
   - Support CSV, Excel (.xlsx, .xls)
   - Show file preview
   - Auto-detect type (customers/services)

2. **Step 2: Field mapping**
   - Show source columns
   - Map to target fields
   - Preview mapped data
   - Save mapping templates

3. **Step 3: Review & options**
   - Show import summary
   - Duplicate handling options
   - Data validation warnings
   - Estimated import time

4. **Step 4: Import progress**
   - Real-time progress bar
   - Streaming results
   - Error details
   - Pause/resume capability

5. **Step 5: Import results**
   - Success/error counts
   - Download error report
   - View imported records
   - Undo option (soft delete)

#### Phase 5: Competitor-Specific Templates (3-4 hours)
1. **Create import templates for major competitors**
   ```typescript
   const COMPETITOR_TEMPLATES = {
     'square': {
       customers: {
         fieldMap: {
           'First Name': 'firstName',
           'Last Name': 'lastName',
           'Email Address': 'email',
           'Phone Number': 'phone'
         }
       }
     },
     'mindbody': { ... },
     'vagaro': { ... },
     'booker': { ... }
   };
   ```

2. **Template features**
   - Pre-configured field mappings
   - Custom transformations
   - Known quirks handling
   - Sample files for testing

### Testing Plan

#### Merchant Creation Testing
1. **Unit tests**
   - Form validation
   - API client methods
   - Error handling

2. **Integration tests**
   - Full creation flow
   - Duplicate detection
   - Transaction rollback

3. **E2E tests**
   - Create merchant → login → add service → create booking

#### Import System Testing
1. **Test data sets**
   - Small (10 records)
   - Medium (1,000 records)
   - Large (10,000+ records)
   - Edge cases (special characters, missing data)

2. **Performance benchmarks**
   - Import speed targets
   - Memory usage limits
   - Database optimization

3. **Error scenarios**
   - Malformed files
   - Network interruptions
   - Duplicate handling
   - Transaction failures

### Security Considerations

1. **Admin authentication**
   - Implement proper admin auth before production
   - Role-based permissions
   - Audit logging

2. **Import security**
   - File size limits
   - Virus scanning
   - Input sanitization
   - Rate limiting

3. **Data privacy**
   - Customer consent for imports
   - GDPR compliance
   - Data retention policies

### Success Metrics

1. **Merchant creation**
   - < 2 minutes to create new merchant
   - 100% success rate with valid data
   - Clear error messages for failures

2. **Data import**
   - Process 1,000 customers/minute
   - < 1% error rate on clean data
   - Support 90% of competitor formats

### Timeline Estimate

**Task 1: Admin Portal Merchant Creation**
- Total: 12-16 hours
- Can be completed in 2-3 days

**Task 2: Import System**
- Total: 18-24 hours  
- Can be completed in 3-4 days

**Total Project: 5-7 days**

### Next Immediate Steps

1. Start with admin API client setup
2. Update merchant creation form fields
3. Test merchant creation end-to-end
4. Then move to import system infrastructure