import { Decimal } from "@prisma/client/runtime/library";

/**
 * Utility functions for working with Prisma Decimal types in PostgreSQL
 *
 * IMPORTANT: For financial calculations, we preserve precision by:
 * 1. Keeping calculations in Decimal type as long as possible
 * 2. Only converting to number for display or when absolutely necessary
 * 3. Using string representations for API responses to avoid precision loss
 */

/**
 * Convert value to number for display purposes only
 * WARNING: This loses precision - use only for UI display, not calculations
 */
export function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

/**
 * Convert value to string to preserve precision in API responses
 */
export function toDecimalString(
  value: Decimal | number | null | undefined,
): string {
  if (value === null || value === undefined) return "0";
  if (typeof value === "number") return value.toString();
  return value.toString();
}

/**
 * Convert to Decimal type for precise calculations
 */
export function toDecimal(
  value: number | string | Decimal | null | undefined,
): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (value instanceof Decimal) return value;
  return new Decimal(value);
}

/**
 * Add two decimal values with precision
 * Returns number for backward compatibility, but consider using addDecimalsPrecise
 */
export function addDecimals(a: Decimal | number, b: Decimal | number): number {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.add(decimalB).toNumber();
}

/**
 * Add two decimal values preserving precision
 */
export function addDecimalsPrecise(
  a: Decimal | number,
  b: Decimal | number,
): Decimal {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.add(decimalB);
}

/**
 * Subtract decimal values with precision
 * Returns number for backward compatibility, but consider using subtractDecimalsPrecise
 */
export function subtractDecimals(
  a: Decimal | number,
  b: Decimal | number,
): number {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.sub(decimalB).toNumber();
}

/**
 * Subtract decimal values preserving precision
 */
export function subtractDecimalsPrecise(
  a: Decimal | number,
  b: Decimal | number,
): Decimal {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.sub(decimalB);
}

/**
 * Multiply decimal values with precision
 * Returns number for backward compatibility, but consider using multiplyDecimalsPrecise
 */
export function multiplyDecimals(
  a: Decimal | number,
  b: Decimal | number,
): number {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.mul(decimalB).toNumber();
}

/**
 * Multiply decimal values preserving precision
 */
export function multiplyDecimalsPrecise(
  a: Decimal | number,
  b: Decimal | number,
): Decimal {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.mul(decimalB);
}

/**
 * Divide decimal values with precision
 * Returns number for backward compatibility, but consider using divideDecimalsPrecise
 */
export function divideDecimals(
  a: Decimal | number,
  b: Decimal | number,
): number {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  if (decimalB.isZero()) return 0;
  return decimalA.div(decimalB).toNumber();
}

/**
 * Divide decimal values preserving precision
 */
export function divideDecimalsPrecise(
  a: Decimal | number,
  b: Decimal | number,
): Decimal {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  if (decimalB.isZero()) return new Decimal(0);
  return decimalA.div(decimalB);
}

/**
 * Compare decimal values
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareDecimals(
  a: Decimal | number,
  b: Decimal | number,
): number {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.comparedTo(decimalB);
}

/**
 * Check if a > b
 */
export function isGreaterThan(
  a: Decimal | number,
  b: Decimal | number,
): boolean {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.greaterThan(decimalB);
}

/**
 * Check if a >= b
 */
export function isGreaterThanOrEqual(
  a: Decimal | number,
  b: Decimal | number,
): boolean {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.greaterThanOrEqualTo(decimalB);
}

/**
 * Check if a < b
 */
export function isLessThan(a: Decimal | number, b: Decimal | number): boolean {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.lessThan(decimalB);
}

/**
 * Check if a <= b
 */
export function isLessThanOrEqual(
  a: Decimal | number,
  b: Decimal | number,
): boolean {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.lessThanOrEqualTo(decimalB);
}

/**
 * Check if a equals b
 */
export function isEqual(a: Decimal | number, b: Decimal | number): boolean {
  const decimalA = toDecimal(a);
  const decimalB = toDecimal(b);
  return decimalA.equals(decimalB);
}

/**
 * Sum array of decimal values
 * Returns number for backward compatibility, but consider using sumDecimalsPrecise
 */
export function sumDecimals(
  values: (Decimal | number | null | undefined)[],
): number {
  return values.reduce<number>((sum, val) => sum + toNumber(val), 0);
}

/**
 * Sum array of decimal values preserving precision
 */
export function sumDecimalsPrecise(
  values: (Decimal | number | null | undefined)[],
): Decimal {
  return values.reduce<Decimal>(
    (sum, val) => sum.add(toDecimal(val)),
    new Decimal(0),
  );
}

/**
 * Round decimal to specified number of decimal places
 */
export function roundDecimal(
  value: Decimal | number,
  decimalPlaces: number = 2,
): Decimal {
  const decimal = toDecimal(value);
  return decimal.toDecimalPlaces(decimalPlaces);
}

/**
 * Format decimal as currency string
 */
export function formatCurrency(
  value: Decimal | number,
  currency: string = "AUD",
): string {
  const num = toNumber(value);
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency,
  }).format(num);
}
