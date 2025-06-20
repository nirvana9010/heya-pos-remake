# CSV Service Import System Implementation Guide

## Overview
This document outlines the implementation plan for a CSV import system for services in the Heya POS system. The system will allow merchants to bulk import services via CSV files with validation, preview, and error handling capabilities.

## Service Data Model Reference

### Required Fields
- `name` (string) - Service name, must be unique per merchant
- `duration` (number) - Duration in minutes
- `price` (number) - Price amount

### Optional Fields
- `description` (string) - Service description
- `category` (string) - Category name (will create if doesn't exist)
- `categoryId` (string) - Category UUID (alternative to category name)
- `currency` (string) - Default: "AUD"
- `taxRate` (number) - Default: 0.1 (10% GST)
- `isActive` (boolean) - Default: true
- `requiresDeposit` (boolean) - Default: false
- `depositAmount` (number) - Required if requiresDeposit is true
- `maxAdvanceBooking` (number) - Default: 90 days
- `minAdvanceBooking` (number) - Default: 0 hours
- `displayOrder` (number) - Default: 0

## 1. CSV Format Specification

### Headers
```csv
name,category,description,duration,price,deposit_required,deposit_amount,tax_rate,min_advance_hours,max_advance_days,active
```

### Example CSV Content
```csv
name,category,description,duration,price,deposit_required,deposit_amount,tax_rate,min_advance_hours,max_advance_days,active
"Classic Facial","Facials","Deep cleansing facial with extractions",60,120,false,,0.1,0,90,true
"Deluxe Facial","Facials","Premium facial with LED therapy",90,180,true,50,0.1,24,60,true
"Express Manicure","Nails","Quick nail shaping and polish",30,45,false,,0.1,0,30,true
"Gel Manicure","Nails","Long-lasting gel polish application",45,65,false,,0.1,2,30,true
```

### Duration Format Support
The system should accept multiple duration formats:
- Minutes: `60`, `90`, `120`
- Hours: `1h`, `1.5h`, `2h`
- Hours and minutes: `1h30m`, `2h15m`
- Descriptive: `60 min`, `1 hour`, `1.5 hours`

## 2. Frontend Implementation

### 2.1 Import Dialog Component
**Location**: `/apps/merchant-app/src/components/services/ImportServicesDialog.tsx`

```tsx
interface ImportServicesDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

// Key features:
// - Drag & drop file upload
// - CSV validation preview
// - Error highlighting
// - Fix & retry capability
// - Progress tracking
```

### 2.2 CSV Template Download
**Location**: `/apps/merchant-app/src/components/services/DownloadCsvTemplate.tsx`

```tsx
// Generates and downloads a CSV template with:
// - Proper headers
// - Example data rows
// - Instructions as comments
// - Formatting guidelines
```

### 2.3 Import Preview Table
```tsx
interface ImportPreviewRow {
  rowNumber: number;
  data: ServiceImportData;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  action: 'create' | 'update' | 'skip';
}
```

## 3. Backend Implementation

### 3.1 CSV Parser Service
**Location**: `/apps/api/src/services/csv-import.service.ts`

```typescript
interface CsvImportResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  preview: ImportPreviewRow[];
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  value: any;
}

class CsvImportService {
  async parseCsv(file: Buffer, options: ImportOptions): Promise<CsvImportResult> {
    // 1. Parse CSV with encoding detection
    // 2. Validate headers
    // 3. Process each row
    // 4. Return validation results
  }

  async importServices(
    merchantId: string,
    rows: ImportPreviewRow[],
    options: ImportOptions
  ): Promise<ImportResult> {
    // 1. Begin transaction
    // 2. Process categories (create if needed)
    // 3. Create/update services
    // 4. Handle errors
    // 5. Commit or rollback
  }
}
```

### 3.2 Import Controller Endpoint
**Location**: `/apps/api/src/services/services.controller.ts`

```typescript
@Post('import/csv')
@UseInterceptors(FileInterceptor('file'))
async importCsv(
  @UploadedFile() file: Express.Multer.File,
  @Body() options: ImportOptionsDto,
  @CurrentUser() user: User
) {
  // 1. Validate file type and size
  // 2. Parse CSV
  // 3. Return preview if dry-run
  // 4. Execute import if confirmed
  // 5. Return results
}

@Get('import/template')
async downloadTemplate(@Res() response: Response) {
  // Generate and return CSV template
}
```

### 3.3 Validation Rules
```typescript
const validationRules = {
  name: {
    required: true,
    maxLength: 100,
    unique: true // per merchant
  },
  duration: {
    required: true,
    min: 0,
    parser: parseDuration // handles various formats
  },
  price: {
    required: true,
    min: 0,
    type: 'decimal'
  },
  taxRate: {
    min: 0,
    max: 1,
    default: 0.1
  }
};
```

## 4. Import Flow

### 4.1 Upload & Preview Flow
1. User uploads CSV file
2. System parses and validates
3. Shows preview with validation status
4. User can fix errors or proceed
5. System imports valid rows

### 4.2 Error Handling
- Row-level validation with specific error messages
- Option to skip invalid rows
- Download error report as CSV
- Inline editing for quick fixes

### 4.3 Duplicate Handling Options
```typescript
enum DuplicateAction {
  SKIP = 'skip',
  UPDATE = 'update', 
  CREATE_NEW = 'create_new' // adds suffix to name
}
```

## 5. API Endpoints

### Preview Import
```
POST /api/v1/services/import/csv/preview
Content-Type: multipart/form-data

{
  file: File,
  options: {
    duplicateAction: 'skip' | 'update' | 'create_new',
    createCategories: boolean,
    skipInvalidRows: boolean
  }
}

Response:
{
  preview: ImportPreviewRow[],
  summary: {
    total: number,
    valid: number,
    invalid: number,
    duplicates: number
  }
}
```

### Execute Import
```
POST /api/v1/services/import/csv/execute
Content-Type: application/json

{
  rows: ImportPreviewRow[],
  options: ImportOptions
}

Response:
{
  success: boolean,
  imported: number,
  skipped: number,
  errors: ImportError[]
}
```

## 6. Database Considerations

### Import Tracking
```prisma
model ServiceImport {
  id          String   @id @default(uuid())
  merchantId  String
  userId      String
  fileName    String
  totalRows   Int
  imported    Int
  skipped     Int
  failed      Int
  status      String   // 'pending', 'completed', 'failed'
  createdAt   DateTime @default(now())
  completedAt DateTime?
  
  services    Service[] // Track which services were imported
}
```

### Category Auto-Creation
- Check if category exists (case-insensitive)
- Create if doesn't exist
- Maintain category order
- Apply default color/icon

## 7. UI Mockups

### Import Dialog States
1. **Initial**: Drag & drop zone
2. **Uploading**: Progress indicator
3. **Preview**: Validation table with actions
4. **Importing**: Progress with real-time updates
5. **Complete**: Summary with next actions

### Validation Preview Table
```
| Row | Status | Name | Category | Duration | Price | Errors/Warnings | Action |
|-----|--------|------|----------|----------|-------|----------------|---------|
| 1   | ✓      | ... | ...      | ...      | ...   | -              | Create  |
| 2   | ⚠      | ... | ...      | ...      | ...   | Duplicate name | Update  |
| 3   | ✗      | ... | ...      | ...      | ...   | Invalid price  | Fix     |
```

## 8. Testing Scenarios

### Valid Import Cases
- All required fields present
- Various duration formats
- New and existing categories
- Different decimal formats for prices

### Error Cases
- Missing required fields
- Invalid data types
- Duplicate names
- Malformed CSV
- Encoding issues
- File size limits

### Edge Cases
- Empty CSV
- Only headers
- Special characters in names
- Very long descriptions
- Negative values
- Future booking limits

## 9. Security Considerations

- File size limits (e.g., 5MB max)
- File type validation (only .csv)
- Malicious content scanning
- SQL injection prevention
- Rate limiting on import endpoint
- Permission checks (service.create)

## 10. Performance Optimization

- Batch processing for large files
- Chunked parsing for memory efficiency
- Database transaction batching
- Progress streaming via WebSocket/SSE
- Caching for category lookups

## 11. Implementation Priority

### Phase 1 (MVP)
1. Basic CSV parser
2. Simple validation
3. Import endpoint
4. Basic UI dialog
5. Error reporting

### Phase 2 (Enhanced)
1. Advanced validation
2. Preview & editing
3. Template download
4. Duplicate handling
5. Progress tracking

### Phase 3 (Advanced)
1. Import history
2. Undo capability
3. Bulk operations
4. Advanced mapping
5. Custom field support

## 12. Success Metrics

- Import success rate > 95%
- Average time to import 100 services < 10 seconds
- User error rate < 5%
- Support ticket reduction for bulk service creation

## 13. Documentation Needed

- User guide with screenshots
- CSV format specification
- Common error solutions
- Video tutorial
- API documentation

## 14. Future Enhancements

- Excel file support
- Google Sheets integration
- Service image URLs in CSV
- Multi-language support
- Service variations/add-ons
- Scheduling rules import
- Price tier imports