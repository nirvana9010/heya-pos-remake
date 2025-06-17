import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Australian Eastern Time Zone
const MERCHANT_TIMEZONE = 'Australia/Sydney';

/**
 * Convert a UTC date to merchant's local time (Australian Eastern Time)
 */
export function toMerchantTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return utcToZonedTime(dateObj, MERCHANT_TIMEZONE);
}

/**
 * Convert merchant's local time to UTC
 */
export function toUTC(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return zonedTimeToUtc(dateObj, MERCHANT_TIMEZONE);
}

/**
 * Format a date in merchant's timezone
 */
export function formatInMerchantTime(date: Date | string, formatStr: string): string {
  const merchantDate = toMerchantTime(date);
  return format(merchantDate, formatStr);
}

/**
 * Get timezone abbreviation (AEST/AEDT)
 */
export function getTimezoneAbbr(): string {
  const now = new Date();
  const merchantTime = toMerchantTime(now);
  // Check if daylight saving is active
  const month = merchantTime.getMonth();
  const isDST = month >= 9 || month <= 3; // Oct-Mar is DST in Australia
  return isDST ? 'AEDT' : 'AEST';
}

/**
 * Display helpers for common formats
 */
export const displayFormats = {
  time: (date: Date | string) => formatInMerchantTime(date, 'h:mm a'),
  timeWithZone: (date: Date | string) => `${formatInMerchantTime(date, 'h:mm a')} ${getTimezoneAbbr()}`,
  date: (date: Date | string) => formatInMerchantTime(date, 'MMM dd, yyyy'),
  dateTime: (date: Date | string) => formatInMerchantTime(date, 'MMM dd, yyyy h:mm a'),
  fullDateTime: (date: Date | string) => `${formatInMerchantTime(date, 'EEEE, MMMM d, yyyy h:mm a')} ${getTimezoneAbbr()}`,
};