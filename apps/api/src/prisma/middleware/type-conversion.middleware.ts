import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export function typeConversionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const result = await next(params);
    
    // Handle query results
    if (result) {
      return transformPrismaResult(result);
    }
    
    return result;
  };
}

function transformPrismaResult(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(transformPrismaResult);
  }

  // Handle objects
  if (typeof obj === 'object') {
    const transformed: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Decimal) {
        // Convert Decimal to number for specific fields
        if (isMoneyField(key)) {
          transformed[key] = value.toNumber();
        } else if (isPercentageField(key)) {
          transformed[key] = value.toNumber();
        } else {
          transformed[key] = value.toNumber();
        }
      } else if (value instanceof Date) {
        // Ensure dates are properly serialized
        transformed[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively transform nested objects
        transformed[key] = transformPrismaResult(value);
      } else {
        transformed[key] = value;
      }
    }

    return transformed;
  }

  return obj;
}

function isMoneyField(fieldName: string): boolean {
  const moneyFields = [
    'price',
    'amount',
    'totalAmount',
    'subtotal',
    'taxAmount',
    'discountAmount',
    'paidAmount',
    'balanceDue',
    'depositAmount',
    'totalSpent',
    'monthlyPrice',
    'unitPrice',
    'tipAmount',
    'refundedAmount',
    'rewardValue',
  ];
  return moneyFields.includes(fieldName) || 
         fieldName.endsWith('Price') || 
         fieldName.endsWith('Amount') ||
         fieldName.endsWith('Cost');
}

function isPercentageField(fieldName: string): boolean {
  const percentageFields = [
    'taxRate',
    'percentage',
    'multiplier',
    'pointsValue',
  ];
  return percentageFields.includes(fieldName) || 
         fieldName.endsWith('Rate') || 
         fieldName.endsWith('Percentage');
}