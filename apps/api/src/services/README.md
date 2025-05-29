# Service Catalog API

This module handles the service catalog system including services, categories, pricing, and CSV imports.

## Features

- ✅ Full CRUD operations for services and categories
- ✅ Service search and filtering
- ✅ CSV import from Hamilton Beauty export format
- ✅ Bulk operations (reorder, status update)
- ✅ Category management with service counts
- ✅ Automatic GST (10%) tax calculation
- ✅ Deposit requirements for services
- ✅ Advance booking restrictions

## API Endpoints

### Services

#### Create Service
```bash
POST /api/services
Authorization: Bearer <token>
{
  "name": "Full Legs Waxing",
  "description": "Professional leg waxing service",
  "categoryId": "category_id", // or use "category": "Waxing"
  "duration": 30,
  "price": 50,
  "requiresDeposit": false,
  "maxAdvanceBooking": 90,
  "minAdvanceBooking": 2
}
```

#### List Services
```bash
GET /api/services?categoryId=xxx&isActive=true&minPrice=20&maxPrice=100
Authorization: Bearer <token>
```

Query parameters:
- `categoryId` - Filter by category
- `isActive` - Filter active/inactive
- `searchTerm` - Search in name, description, category
- `minPrice` / `maxPrice` - Price range
- `minDuration` / `maxDuration` - Duration range
- `page` / `limit` - Pagination
- `sortBy` / `sortOrder` - Sorting

#### Update Service
```bash
PATCH /api/services/:id
Authorization: Bearer <token>
{
  "price": 55,
  "duration": 35
}
```

#### Delete Service
```bash
DELETE /api/services/:id
Authorization: Bearer <token>
```
Note: Services used in bookings are soft-deleted (deactivated)

### Categories

#### Create Category
```bash
POST /api/service-categories
Authorization: Bearer <token>
{
  "name": "Waxing",
  "description": "Hair removal services",
  "color": "#FF6B6B",
  "sortOrder": 1
}
```

#### List Categories
```bash
GET /api/service-categories
Authorization: Bearer <token>
```
Returns categories with service counts

#### Update Category
```bash
PATCH /api/service-categories/:id
Authorization: Bearer <token>
{
  "name": "Waxing Services",
  "color": "#FF5555"
}
```

#### Delete Category
```bash
DELETE /api/service-categories/:id
Authorization: Bearer <token>
```
Note: Cannot delete categories with existing services

### Import Operations

#### Import from CSV
```bash
POST /api/services/import/csv?updateExisting=false&createCategories=true
Authorization: Bearer <token>
Content-Type: multipart/form-data
file: [CSV file]
```

CSV Format (Hamilton Beauty):
```csv
Service Name,Price,Duration (min),Category
Full Legs Waxing,50,30,Waxing
Eyebrow Tinting,20,15,Tinting
```

#### Import from JSON
```bash
POST /api/services/import
Authorization: Bearer <token>
{
  "services": [
    {
      "Service Name": "Full Legs Waxing",
      "Price": 50,
      "Duration (min)": 30,
      "Category": "Waxing"
    }
  ],
  "updateExisting": false,
  "createCategories": true
}
```

### Bulk Operations

#### Reorder Services
```bash
PATCH /api/services/reorder
Authorization: Bearer <token>
[
  { "id": "service1", "displayOrder": 0 },
  { "id": "service2", "displayOrder": 1 }
]
```

#### Bulk Status Update
```bash
PATCH /api/services/bulk/status
Authorization: Bearer <token>
{
  "serviceIds": ["service1", "service2"],
  "isActive": false
}
```

## Service Properties

- `name` - Service name (required, unique per merchant)
- `description` - Optional description
- `category` - Category name (for display/import)
- `categoryId` - Category reference
- `duration` - Duration in minutes
- `price` - Service price
- `currency` - Default: AUD
- `taxRate` - Default: 0.1 (10% GST)
- `isActive` - Active status
- `requiresDeposit` - If deposit required
- `depositAmount` - Deposit amount if required
- `maxAdvanceBooking` - Max days for advance booking (default: 90)
- `minAdvanceBooking` - Min hours for advance booking (default: 0)
- `displayOrder` - Display order in lists

## Import Results

Import operations return:
```json
{
  "imported": 45,
  "updated": 5,
  "skipped": 3,
  "errors": [
    {
      "row": 15,
      "error": "Invalid price"
    }
  ]
}
```

## Permissions Required

- `service.view` - View services and categories
- `service.create` - Create services, categories, import
- `service.update` - Update services and categories
- `service.delete` - Delete services and categories

## Notes

1. All prices include GST (10% tax rate by default)
2. Services are unique by name within a merchant
3. Categories are automatically created during import if `createCategories=true`
4. Deleted services that have bookings are soft-deleted (marked inactive)
5. Display order is used for custom sorting in UI