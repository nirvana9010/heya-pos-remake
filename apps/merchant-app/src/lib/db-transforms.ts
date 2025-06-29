/**
 * Database transformation utilities for PostgreSQL migration
 * Handles conversion of PostgreSQL types to JavaScript types
 */

/**
 * Transform decimal/numeric values from PostgreSQL (returned as strings) to numbers
 */
export function transformDecimal(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return Number(value) || 0;
}

/**
 * Transform boolean values from PostgreSQL
 */
export function transformBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === true;
}

/**
 * Transform date values to proper Date objects with timezone handling
 */
export function transformDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * Transform API response recursively to handle all decimal fields
 */
export function transformApiResponse(data: any): any {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => transformApiResponse(item));
  }
  
  // Handle objects
  if (typeof data === 'object' && data !== null) {
    const transformed: any = {};
    
    for (const key in data) {
      const value = data[key];
      
      // Transform known decimal/money fields
      if (isMoneyField(key)) {
        transformed[key] = transformDecimal(value);
      }
      // Transform known boolean fields
      else if (isBooleanField(key)) {
        transformed[key] = transformBoolean(value);
      }
      // Transform known date fields - but keep as strings for React rendering safety
      else if (isDateField(key)) {
        // Don't transform to Date objects - keep as ISO strings to avoid React rendering errors
        transformed[key] = value;
      }
      // Recursively transform nested objects/arrays
      else if (typeof value === 'object' && value !== null) {
        transformed[key] = transformApiResponse(value);
      }
      // Keep other values as-is
      else {
        transformed[key] = value;
      }
    }
    
    return transformed;
  }
  
  return data;
}

/**
 * Check if a field name represents a money/decimal field
 */
function isMoneyField(fieldName: string): boolean {
  const moneyFields = [
    'price',
    'amount',
    'totalAmount',
    'total',
    'cost',
    'revenue',
    'balance',
    'balanceDue',
    'paidAmount',
    'discount',
    'tax',
    'taxAmount',
    'subtotal',
    'fee',
    'value',
    // 'payment', // REMOVED: This was causing 'payments' array to be treated as money!
    'refund',
    'credit',
    'debit',
    'spent',
    'earnings',
    'salary',
    'wage',
    'todayRevenue',
    'weeklyRevenue',
    'monthlyRevenue',
    'yearlyRevenue',
    'avgServiceValue',
    'unitPrice',
    'tipAmount'
  ];
  
  const fieldLower = fieldName.toLowerCase();
  
  // CRITICAL FIX: Exclude plural forms that are likely arrays
  if (fieldLower === 'payments' || fieldLower === 'refunds' || fieldLower === 'credits') {
    return false;
  }
  
  return moneyFields.some(field => 
    fieldLower.includes(field.toLowerCase()) ||
    fieldLower.endsWith('price') ||
    fieldLower.endsWith('amount') ||
    fieldLower.endsWith('total') ||
    fieldLower.endsWith('cost') ||
    fieldLower.endsWith('revenue') ||
    fieldLower.endsWith('fee')
  );
}

/**
 * Check if a field name represents a boolean field
 */
function isBooleanField(fieldName: string): boolean {
  const booleanFields = [
    'isActive',
    'isDeleted',
    'isEnabled',
    'isDisabled',
    'isPaid',
    'isRefunded',
    'isCancelled',
    'isCompleted',
    'isPublished',
    'isPrivate',
    'isPublic',
    'hasLoyalty',
    'allowBooking',
    'requireDeposit',
    'active',
    'enabled',
    'disabled',
    'paid',
    'refunded',
    'cancelled',
    'completed',
    'published'
  ];
  
  const fieldLower = fieldName.toLowerCase();
  return booleanFields.some(field => 
    fieldLower === field.toLowerCase() ||
    fieldLower.startsWith('is') ||
    fieldLower.startsWith('has') ||
    fieldLower.startsWith('allow') ||
    fieldLower.startsWith('require') ||
    fieldLower.startsWith('enable') ||
    fieldLower.startsWith('disable')
  );
}

/**
 * Check if a field name represents a date/time field
 */
function isDateField(fieldName: string): boolean {
  const dateFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'date',
    'time',
    'datetime',
    'timestamp',
    'startTime',
    'endTime',
    'startDate',
    'endDate',
    'bookingDate',
    'appointmentDate',
    'expiresAt',
    'lastLogin',
    'processedAt',
    'scheduledAt',
    'cancelledAt',
    'completedAt',
    'paidAt'
  ];
  
  const fieldLower = fieldName.toLowerCase();
  return dateFields.some(field => 
    fieldLower === field.toLowerCase() ||
    fieldLower.endsWith('at') ||
    fieldLower.endsWith('date') ||
    fieldLower.endsWith('time') ||
    fieldLower.includes('timestamp')
  );
}

/**
 * Format a decimal value for display (e.g., currency)
 */
export function formatCurrency(value: any, decimals: number = 2): string {
  const numValue = transformDecimal(value);
  return numValue.toFixed(decimals);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: any, decimals: number = 1): string {
  const numValue = transformDecimal(value);
  return numValue.toFixed(decimals);
}