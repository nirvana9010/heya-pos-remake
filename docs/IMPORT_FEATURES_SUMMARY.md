# Import Features Summary - Heya POS

## Overview
The Heya POS system supports bulk import functionality for both **Customers** and **Services** via CSV files. This document summarizes the current implementation status and plans.

## 📊 Customer Import

### Status: ✅ **IMPLEMENTED**

### API Endpoint
```
POST /api/v1/customers/import
Content-Type: multipart/form-data
```

### Features
- CSV file upload support
- Duplicate detection by email and mobile
- Update existing customers or create new ones
- Error tracking with row numbers
- PIN authentication required (owner/manager only)

### CSV Format
```csv
name,email,mobile,phone,address,notes,tags,loyaltyPoints,vip
"John Smith","john@email.com","+61412345678","0298765432","123 Main St, Sydney","Regular customer","vip,loyal",100,true
"Jane Doe","jane@email.com","+61423456789",,"456 Queen St, Melbourne","New customer","",0,false
```

### Implementation Details
- Located in `/apps/api/src/customers/customers.service.ts`
- Method: `importCustomers(merchantId: string, file: Express.Multer.File)`
- Parses CSV and processes each row
- Returns summary: imported, updated, skipped, errors

### Current Capabilities
- ✅ CSV parsing
- ✅ Duplicate handling (update existing)
- ✅ Error reporting with row numbers
- ✅ Batch processing
- ✅ Field validation

### Frontend Status
- ⚠️ **Not yet implemented** - Backend is ready but needs UI

---

## 🛠️ Service Import

### Status: 📋 **PLANNED** (Detailed specification exists)

### Planned API Endpoints
```
POST /api/v1/services/import/csv/preview
POST /api/v1/services/import/csv/execute
GET /api/v1/services/import/template
```

### Planned CSV Format
```csv
name,category,description,duration,price,deposit_required,deposit_amount,tax_rate,min_advance_hours,max_advance_days,active
"Classic Facial","Facials","Deep cleansing facial with extractions",60,120,false,,0.1,0,90,true
"Deluxe Facial","Facials","Premium facial with LED therapy",90,180,true,50,0.1,24,60,true
```

### Planned Features (from CSV_SERVICE_IMPORT_IMPLEMENTATION.md)
1. **Preview & Validation**
   - Upload CSV and preview before importing
   - Row-by-row validation with error messages
   - Fix errors inline before import

2. **Smart Duration Parsing**
   - Support multiple formats: `60`, `1h`, `1h30m`, `90 min`

3. **Category Management**
   - Auto-create categories if they don't exist
   - Match existing categories (case-insensitive)

4. **Duplicate Handling Options**
   - Skip duplicates
   - Update existing services
   - Create with modified name

5. **Import Tracking**
   - Track import history
   - Link imported services to import batch
   - Success/failure metrics

### Implementation Priority
- **Phase 1 (MVP)**: Basic CSV parser, validation, import endpoint
- **Phase 2**: Preview & editing, template download, duplicate handling
- **Phase 3**: Import history, undo capability, advanced features

---

## 🎯 Next Steps

### For Customer Import
1. **Create Frontend UI**
   - Import button on Customers page
   - File upload dialog
   - Progress indicator
   - Results summary
   - Error display

2. **Add CSV Template Download**
   - Provide example CSV format
   - Include all available fields
   - Add instructions

3. **Enhance Error Handling**
   - More detailed validation messages
   - Option to download error report

### For Service Import
1. **Implement Backend**
   - CSV parser service
   - Validation logic
   - Import endpoints
   - Category auto-creation

2. **Build Frontend**
   - Import dialog component
   - Preview table with validation
   - Progress tracking
   - Error handling UI

3. **Testing**
   - Various CSV formats
   - Edge cases
   - Performance with large files

---

## 🔒 Security Considerations

Both import features should include:
- File size limits (5MB recommended)
- File type validation (.csv only)
- Rate limiting on import endpoints
- Permission checks (require appropriate role)
- Input sanitization to prevent injection

---

## 📈 Benefits

1. **Time Saving**: Import hundreds of records in seconds vs manual entry
2. **Data Migration**: Easy transition from other systems
3. **Bulk Updates**: Update existing records en masse
4. **Error Reduction**: Validation catches issues before import
5. **Flexibility**: Support for various data formats

---

## 📚 Documentation Needed

1. User guides with screenshots
2. CSV format specifications
3. Video tutorials
4. Common error solutions
5. Best practices guide

---

## 🚀 Implementation Recommendation

1. **Complete Customer Import UI** (1-2 days)
   - High value, low effort since backend exists
   - Immediate benefit for onboarding

2. **Implement Service Import** (3-5 days)
   - Follow the detailed plan in CSV_SERVICE_IMPORT_IMPLEMENTATION.md
   - Start with MVP features
   - Add advanced features based on user feedback