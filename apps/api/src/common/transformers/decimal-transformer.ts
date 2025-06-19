import { Transform, TransformFnParams } from 'class-transformer';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Transform string or number to Decimal for Prisma input
 */
export function ToDecimal() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    
    if (value instanceof Decimal) return value;
    
    if (typeof value === 'string' || typeof value === 'number') {
      try {
        return new Decimal(value);
      } catch {
        return new Decimal(0);
      }
    }
    
    return new Decimal(0);
  });
}

/**
 * Transform Decimal to number for API output
 */
export function FromDecimal() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    
    return value;
  });
}

/**
 * Transform money values (ensure 2 decimal places)
 */
export function MoneyTransform() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    
    let num: number;
    
    if (value instanceof Decimal) {
      num = value.toNumber();
    } else if (typeof value === 'string') {
      num = parseFloat(value);
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return 0;
    }
    
    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
  });
}

/**
 * Transform percentage values (ensure 4 decimal places)
 */
export function PercentageTransform() {
  return Transform(({ value }: TransformFnParams) => {
    if (value === null || value === undefined) return value;
    
    let num: number;
    
    if (value instanceof Decimal) {
      num = value.toNumber();
    } else if (typeof value === 'string') {
      num = parseFloat(value);
    } else if (typeof value === 'number') {
      num = value;
    } else {
      return 0;
    }
    
    // Round to 4 decimal places
    return Math.round(num * 10000) / 10000;
  });
}

/**
 * Utility functions for decimal operations
 */
export class DecimalUtils {
  static add(a: Decimal | number, b: Decimal | number): Decimal {
    const decA = a instanceof Decimal ? a : new Decimal(a);
    const decB = b instanceof Decimal ? b : new Decimal(b);
    return decA.add(decB);
  }

  static subtract(a: Decimal | number, b: Decimal | number): Decimal {
    const decA = a instanceof Decimal ? a : new Decimal(a);
    const decB = b instanceof Decimal ? b : new Decimal(b);
    return decA.sub(decB);
  }

  static multiply(a: Decimal | number, b: Decimal | number): Decimal {
    const decA = a instanceof Decimal ? a : new Decimal(a);
    const decB = b instanceof Decimal ? b : new Decimal(b);
    return decA.mul(decB);
  }

  static divide(a: Decimal | number, b: Decimal | number): Decimal {
    const decA = a instanceof Decimal ? a : new Decimal(a);
    const decB = b instanceof Decimal ? b : new Decimal(b);
    
    if (decB.isZero()) {
      throw new Error('Division by zero');
    }
    
    return decA.div(decB);
  }

  static toMoney(value: Decimal | number): number {
    const dec = value instanceof Decimal ? value : new Decimal(value);
    return Math.round(dec.toNumber() * 100) / 100;
  }

  static toPercentage(value: Decimal | number): number {
    const dec = value instanceof Decimal ? value : new Decimal(value);
    return Math.round(dec.toNumber() * 10000) / 10000;
  }
}