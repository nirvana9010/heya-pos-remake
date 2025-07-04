import { Injectable, BadRequestException } from '@nestjs/common';
import { ServiceCsvRowDto, ImportValidation, ImportAction } from './dto/import-services.dto';

@Injectable()
export class CsvParserService {
  /**
   * Parse CSV buffer and return array of objects
   */
  async parseCsvFile(buffer: Buffer, columnMappings?: Record<string, string>): Promise<any[]> {
    const { parse } = await import('csv-parse/sync');
    
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true,
        skipRecordsWithError: false,
      });

      // If column mappings are provided, transform the records
      if (columnMappings && Object.keys(columnMappings).length > 0) {
        return records.map(record => {
          const mappedRecord: any = {};
          
          // Map CSV columns to service fields
          Object.entries(columnMappings).forEach(([csvColumn, serviceField]) => {
            if (record[csvColumn] !== undefined) {
              mappedRecord[serviceField] = record[csvColumn];
            }
          });
          
          return mappedRecord;
        });
      }

      return records;
    } catch (error) {
      throw new BadRequestException('Invalid CSV file format');
    }
  }

  /**
   * Parse CSV headers and preview rows for column mapping
   */
  async parseCsvForMapping(buffer: Buffer): Promise<{ headers: string[]; rows: string[][] }> {
    const { parse } = await import('csv-parse/sync');
    
    try {
      const allRows = parse(buffer, {
        columns: false, // Return as array of arrays
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true,
        to: 11, // Get headers + up to 10 preview rows
      });

      if (allRows.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      const headers = allRows[0];
      const rows = allRows.slice(1); // Preview rows without headers

      return { headers, rows };
    } catch (error) {
      throw new BadRequestException('Invalid CSV file format');
    }
  }

  /**
   * Parse duration string to minutes
   * Supports: "60", "90", "1h", "1.5h", "1h30m", "90 min", "1 hour"
   */
  parseDuration(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    const str = value.toString().toLowerCase().trim();
    
    // Direct number (e.g., "60")
    if (/^\d+$/.test(str)) {
      return parseInt(str);
    }

    // Hours format (e.g., "1h", "1.5h", "2.5 h")
    const hoursMatch = str.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
    if (hoursMatch) {
      return parseFloat(hoursMatch[1]) * 60;
    }

    // Hours and minutes (e.g., "1h30m", "2h 15m")
    const hoursMinMatch = str.match(/^(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:ins?)?$/);
    if (hoursMinMatch) {
      return parseInt(hoursMinMatch[1]) * 60 + parseInt(hoursMinMatch[2]);
    }

    // Minutes format (e.g., "90 min", "120 minutes")
    const minsMatch = str.match(/^(\d+)\s*m(?:ins?|inutes?)?$/);
    if (minsMatch) {
      return parseInt(minsMatch[1]);
    }

    throw new Error(`Invalid duration format: "${value}"`);
  }

  /**
   * Validate a single row
   */
  validateRow(row: any, rowNumber: number, merchantSettings?: any): ImportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse action first
    const action = row.action?.toString().toLowerCase().trim();
    const isDelete = action === 'delete' || action === 'remove' || action === 'del';

    // Required fields
    if (!row.name || row.name.trim() === '') {
      errors.push('Name is required');
    }

    // For delete actions, only name is required
    if (isDelete) {
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }

    // For add/edit actions, validate other fields
    // Duration is not required if we have price and priceToDurationRatio
    if (!row.duration || row.duration === '') {
      if (row.price && merchantSettings?.priceToDurationRatio) {
        warnings.push(`Duration will be calculated from price: $${row.price} → ${Math.round(parseFloat(row.price) * merchantSettings.priceToDurationRatio)} minutes`);
      } else {
        errors.push('Duration is required (or enable auto-duration in Import settings)');
      }
    } else {
      try {
        this.parseDuration(row.duration);
      } catch (e) {
        errors.push(`Invalid duration format: ${row.duration}`);
      }
    }

    if (row.price === undefined || row.price === null || row.price === '') {
      errors.push('Price is required');
    } else {
      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) {
        errors.push('Price must be a positive number');
      }
    }

    // Note: Removed validation for deposit, tax, and booking rules as these now come from merchant settings

    // Warnings
    if (!row.category) {
      warnings.push('No category specified - service will be uncategorized');
    }

    if (row.name && row.name.length > 100) {
      warnings.push('Service name is very long and may be truncated');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate duration from price using merchant's ratio
   */
  calculateDurationFromPrice(price: number, priceToDurationRatio: number = 1.0): number {
    return Math.round(price * priceToDurationRatio);
  }

  /**
   * Transform CSV row to ServiceCsvRowDto
   */
  transformRow(row: any, merchantSettings?: any): ServiceCsvRowDto {
    // Parse boolean values
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'active';
      }
      return false;
    };

    // Parse numeric values
    const parseNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    };

    // Parse action value
    const parseAction = (value: any): ImportAction | undefined => {
      if (!value) return undefined;
      const lower = value.toString().toLowerCase().trim();
      if (lower === 'add' || lower === 'create' || lower === 'new') return ImportAction.ADD;
      if (lower === 'edit' || lower === 'update' || lower === 'modify') return ImportAction.EDIT;
      if (lower === 'delete' || lower === 'remove' || lower === 'del') return ImportAction.DELETE;
      return undefined;
    };

    const price = parseNumber(row.price) || 0;
    let duration = row.duration;
    
    // If duration is empty but we have price and settings, calculate duration
    if ((!duration || duration === '') && price > 0 && merchantSettings?.priceToDurationRatio) {
      duration = this.calculateDurationFromPrice(price, merchantSettings.priceToDurationRatio);
    }

    return {
      id: row.id?.trim() || undefined, // Support for unique service identifier
      name: row.name?.trim() || '',
      category: row.category?.trim() || undefined,
      description: row.description?.trim() || undefined,
      duration: duration, // Will be either provided value or calculated from price
      price: price,
      active: row.active !== undefined ? parseBoolean(row.active) : true,
      action: row.action ? parseAction(row.action) : undefined,
      // Legacy fields - only included if present in CSV for backwards compatibility
      deposit_required: row.deposit_required ? parseBoolean(row.deposit_required) : undefined,
      deposit_amount: row.deposit_amount ? parseNumber(row.deposit_amount) : undefined,
      tax_rate: row.tax_rate ? parseNumber(row.tax_rate) : undefined,
      min_advance_hours: row.min_advance_hours ? parseNumber(row.min_advance_hours) : undefined,
      max_advance_days: row.max_advance_days ? parseNumber(row.max_advance_days) : undefined,
    };
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    const headers = [
      'id',
      'action',
      'name',
      'category',
      'description',
      'duration',
      'price',
      'active'
    ];

    const exampleRows = [
      [
        'SVC001',
        'add',
        'Classic Facial',
        'Facials',
        'Deep cleansing facial with extractions',
        '60',
        '120',
        'true'
      ],
      [
        'SVC002',
        'add',
        'Deluxe Facial',
        'Facials',
        'Premium facial with LED therapy',
        '90',
        '180',
        'true'
      ],
      [
        'SVC003',
        'add',
        'Express Manicure',
        'Nails',
        'Quick nail shaping and polish',
        '30',
        '45',
        'true'
      ],
      [
        'SVC004',
        'edit',
        'Full Body Massage',
        'Massage',
        'Updated description for existing service',
        '1h',
        '160',
        'true'
      ],
      [
        'SVC005',
        'add',
        'Hair Cut & Style',
        'Hair',
        'Professional cut and styling',
        '45',
        '85',
        'true'
      ],
      [
        'SVC006',
        'add',
        'Premium Package',
        'Packages',
        'Luxury treatment package',
        '',  // Empty duration to demonstrate auto-calculation
        '300',
        'true'
      ],
      [
        'SVC007',
        'delete',
        'Old Service',
        '',
        '',
        '',
        '',
        ''
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}