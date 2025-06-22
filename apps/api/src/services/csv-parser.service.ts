import { Injectable, BadRequestException } from '@nestjs/common';
import { ServiceCsvRowDto, ImportValidation } from './dto/import-services.dto';

@Injectable()
export class CsvParserService {
  /**
   * Parse CSV buffer and return array of objects
   */
  async parseCsvFile(buffer: Buffer): Promise<any[]> {
    const { parse } = await import('csv-parse/sync');
    
    try {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true,
        skipRecordsWithError: false,
      });

      return records;
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
  validateRow(row: any, rowNumber: number): ImportValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!row.name || row.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!row.duration) {
      errors.push('Duration is required');
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

    // Optional fields validation
    if (row.deposit_required && row.deposit_required.toLowerCase() === 'true' && !row.deposit_amount) {
      errors.push('Deposit amount is required when deposit is required');
    }

    if (row.tax_rate) {
      const taxRate = parseFloat(row.tax_rate);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 1) {
        errors.push('Tax rate must be between 0 and 1 (e.g., 0.1 for 10%)');
      }
    }

    if (row.min_advance_hours) {
      const hours = parseFloat(row.min_advance_hours);
      if (isNaN(hours) || hours < 0) {
        errors.push('Minimum advance hours must be 0 or greater');
      }
    }

    if (row.max_advance_days) {
      const days = parseFloat(row.max_advance_days);
      if (isNaN(days) || days < 0) {
        errors.push('Maximum advance days must be 0 or greater');
      }
    }

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
   * Transform CSV row to ServiceCsvRowDto
   */
  transformRow(row: any): ServiceCsvRowDto {
    // Parse boolean values
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === 'yes' || lower === '1';
      }
      return false;
    };

    // Parse numeric values
    const parseNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    };

    return {
      name: row.name?.trim() || '',
      category: row.category?.trim() || undefined,
      description: row.description?.trim() || undefined,
      duration: row.duration, // Keep as string/number for flexible parsing
      price: parseNumber(row.price) || 0,
      deposit_required: parseBoolean(row.deposit_required),
      deposit_amount: parseNumber(row.deposit_amount),
      tax_rate: parseNumber(row.tax_rate) ?? 0.1, // Default 10% GST
      min_advance_hours: parseNumber(row.min_advance_hours) ?? 0,
      max_advance_days: parseNumber(row.max_advance_days) ?? 90,
      active: row.active !== undefined ? parseBoolean(row.active) : true,
    };
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    const headers = [
      'name',
      'category',
      'description',
      'duration',
      'price',
      'deposit_required',
      'deposit_amount',
      'tax_rate',
      'min_advance_hours',
      'max_advance_days',
      'active'
    ];

    const exampleRows = [
      [
        'Classic Facial',
        'Facials',
        'Deep cleansing facial with extractions',
        '60',
        '120',
        'false',
        '',
        '0.1',
        '0',
        '90',
        'true'
      ],
      [
        'Deluxe Facial',
        'Facials',
        'Premium facial with LED therapy',
        '90',
        '180',
        'true',
        '50',
        '0.1',
        '24',
        '60',
        'true'
      ],
      [
        'Express Manicure',
        'Nails',
        'Quick nail shaping and polish',
        '30',
        '45',
        'false',
        '',
        '0.1',
        '0',
        '30',
        'true'
      ],
      [
        'Full Body Massage',
        'Massage',
        'Relaxing full body massage',
        '1h',
        '150',
        'false',
        '',
        '0.1',
        '2',
        '14',
        'true'
      ],
      [
        'Hair Cut & Style',
        'Hair',
        'Professional cut and styling',
        '45',
        '85',
        'false',
        '',
        '0.1',
        '0',
        '30',
        'true'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}