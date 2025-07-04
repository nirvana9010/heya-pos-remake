# Services Management Features

## Overview

The services management system provides comprehensive functionality for creating, managing, and organizing the services that merchants offer to their customers. The system supports flexible service configuration, category-based organization, bulk operations, and advanced import/export capabilities with intelligent duplicate handling.

## Architecture

### Key Components

1. **ServicesPageContent** (`/app/(dashboard)/services/ServicesPageContent.tsx`)
   - Main service management interface
   - Server-side pagination and filtering
   - Inline editing capabilities
   - Bulk operations support

2. **ServiceFormDialog** (`/components/services/ServiceFormDialog.tsx`)
   - Service creation and editing
   - Comprehensive form validation
   - Category management integration

3. **ServiceImportDialog** (`/components/services/ServiceImportDialog.tsx`)
   - Multi-step CSV import wizard
   - Flexible column mapping
   - Preview and validation
   - Duplicate handling strategies

4. **ServicesClient** (`/lib/clients/services-client.ts`)
   - API client for service operations
   - TypeScript-first with full type safety
   - Pagination and filtering support

5. **Services Hooks** (`/hooks/use-services.ts`)
   - React Query integration
   - Optimistic updates
   - Cache management
   - Real-time data synchronization

## Service Management

### CRUD Operations

1. **Create Service**
   - Name, description, and category
   - Duration in flexible formats (minutes, hours)
   - Price with currency support
   - Tax rate configuration
   - Deposit requirements
   - Booking window constraints
   - Active/inactive status

2. **Read/List Services**
   - Server-side pagination with configurable page size
   - Real-time search with debouncing
   - Category-based filtering
   - Sort by display order
   - Staff count indicators
   - Visual category color coding

3. **Update Service**
   - Inline editing for price and duration
   - Full edit dialog for all properties
   - Maintain booking history integrity
   - Automatic cache updates

4. **Delete Service**
   - Soft delete for services with bookings
   - Hard delete for unused services
   - Cascade handling for related data
   - Bulk delete with confirmation

### Advanced Features

1. **Display Order Management**
   - Drag-and-drop reordering (planned)
   - Manual order adjustment
   - Category-based grouping

2. **Bulk Operations**
   - Select multiple services
   - Bulk delete with confirmation
   - Bulk status updates (activate/deactivate)
   - Export selected services

3. **Service Dependencies**
   - Link related services
   - Package deal support (planned)
   - Service prerequisites

## Category Management

### Category Features

1. **Category CRUD**
   - Create categories with custom colors
   - Icon support for visual identification
   - Sort order management
   - Active/inactive status

2. **Category Integration**
   - Filter services by category
   - Category-based service counts
   - Visual category badges
   - Automatic category assignment

3. **Smart Category Handling**
   - Auto-create categories during import
   - Category-based duplicate naming
   - Preserve category relationships

## Import/Export System

### CSV Import Features

1. **Flexible Column Mapping**
   - Auto-detect column headers
   - Support multiple naming conventions
   - Map any CSV structure
   - Required vs optional fields

2. **Multi-Step Import Workflow**
   ```
   Upload CSV → Map Columns → Preview & Validate → Execute Import
   ```

3. **Import Intelligence**
   - **Service ID Support**: Maintain consistent IDs across imports
   - **Auto ID Generation**: Generate IDs for manually created services
   - **Duration Parsing**: Supports "60", "1h", "1h30m" formats
   - **Price-to-Duration**: Auto-calculate duration from price ratio
   - **Smart Defaults**: Use merchant settings for missing values

4. **Duplicate Handling Strategies**
   - **Skip**: Ignore duplicate entries
   - **Update**: Modify existing services
   - **Create New**: Add with category-based naming

5. **Action-Based Import**
   - Add new services
   - Edit existing services
   - Delete services (soft delete)
   - Mixed operations in single import

### CSV Export Features

1. **Export Formats**
   - Full service details
   - Filtered exports
   - Category-grouped exports
   - Template generation

2. **Export Use Cases**
   - Backup service catalog
   - Share with other locations
   - External analysis
   - Bulk editing workflow

## API Endpoints

### Services Endpoints (v1)

```typescript
// Service CRUD
GET    /api/v1/services          // List with pagination
POST   /api/v1/services          // Create service
GET    /api/v1/services/:id      // Get service details
PATCH  /api/v1/services/:id      // Update service
DELETE /api/v1/services/:id      // Delete service

// Bulk Operations
PATCH  /api/v1/services/reorder       // Update display order
PATCH  /api/v1/services/bulk/status   // Bulk activate/deactivate

// Import/Export
POST   /api/v1/services/import/mapping   // Parse CSV headers
POST   /api/v1/services/import/preview   // Preview with validation
POST   /api/v1/services/import/execute   // Execute import
GET    /api/v1/services/import/template  // Download CSV template
```

### Category Endpoints (v1)

```typescript
GET    /api/v1/service-categories      // List categories
POST   /api/v1/service-categories      // Create category
PATCH  /api/v1/service-categories/:id  // Update category
DELETE /api/v1/service-categories/:id  // Delete category
```

## Database Schema

### Service Model

```typescript
interface Service {
  id: string;
  merchantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  duration: number;        // Minutes
  price: number;
  currency: string;
  taxRate: number;        // GST inclusive
  isActive: boolean;
  requiresDeposit: boolean;
  depositAmount?: number;
  maxAdvanceBooking?: number;  // Days
  minAdvanceBooking?: number;  // Hours
  displayOrder: number;
  metadata?: {
    importId?: string;    // For import tracking
  };
  paddingBefore?: number;  // Minutes
  paddingAfter?: number;   // Minutes
  createdAt: Date;
  updatedAt: Date;
}
```

### ServiceCategory Model

```typescript
interface ServiceCategory {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Integration Points

### Booking System Integration

1. **Service Selection**
   - Available in booking creation flow
   - Price/duration snapshot at booking time
   - Service details preserved in booking history

2. **Availability Checking**
   - Service duration affects slot availability
   - Padding time considerations
   - Staff assignment requirements

3. **Booking Modifications**
   - Service changes update booking duration
   - Price adjustments with history tracking
   - Maintain service reference integrity

### Order System Integration

1. **Service as Order Items**
   - Add services to orders
   - Apply service-specific pricing
   - Track service delivery status

2. **Tax Calculations**
   - Service-level tax rates
   - GST-inclusive pricing
   - Tax reporting integration

### Staff Management Integration

1. **Staff Assignment** (Planned)
   - Link services to qualified staff
   - Staff availability per service
   - Skill-based routing

2. **Performance Tracking**
   - Services per staff member
   - Revenue by service/staff
   - Utilization metrics

## Best Practices

### Service Configuration

1. **Naming Conventions**
   - Clear, customer-friendly names
   - Consistent formatting
   - Category-based organization

2. **Duration Settings**
   - Include setup/cleanup time
   - Consider padding requirements
   - Realistic time estimates

3. **Pricing Strategy**
   - Market-competitive rates
   - Clear deposit policies
   - Appropriate tax configuration

### Import Management

1. **Data Preparation**
   - Consistent CSV formatting
   - Include service IDs for updates
   - Validate data before import

2. **Import Strategy**
   - Test with small batches
   - Use preview to verify
   - Backup before major imports

3. **Duplicate Prevention**
   - Maintain unique service IDs
   - Use category differentiation
   - Regular data cleanup

## Performance Considerations

1. **Pagination**
   - Server-side pagination for large catalogs
   - Configurable page sizes
   - Efficient query optimization

2. **Search Optimization**
   - Debounced search input
   - Indexed search fields
   - Category-based filtering

3. **Cache Management**
   - React Query caching
   - Optimistic updates
   - Background refetching

## Security Considerations

1. **Access Control**
   - Merchant-scoped data access
   - Role-based permissions
   - Audit trail for changes

2. **Data Validation**
   - Input sanitization
   - Price range validation
   - Required field enforcement

3. **Import Security**
   - File size limits
   - CSV format validation
   - Malicious content prevention

## Future Enhancements

1. **Service Packages**
   - Bundle multiple services
   - Package pricing
   - Dependency management

2. **Advanced Scheduling**
   - Service-specific availability
   - Seasonal pricing
   - Dynamic duration

3. **Analytics Integration**
   - Service popularity metrics
   - Revenue analysis
   - Utilization reports

4. **Multi-location Support**
   - Location-specific services
   - Centralized catalog management
   - Location-based pricing