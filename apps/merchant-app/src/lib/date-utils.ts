import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

// Australian Eastern Time Zone
export const MERCHANT_TIMEZONE = 'Australia/Sydney';

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

const ensureSecondsInTime = (time: string): string => {
  if (time.includes(':')) {
    const parts = time.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    if (parts.length === 3) {
      return time;
    }
  }
  // Fallback for unexpected formats like "0930"
  if (time.length === 4) {
    return `${time.slice(0, 2)}:${time.slice(2)}:00`;
  }
  return `${time}:00`;
};

/**
 * Format a date & time (assumed to be in the merchant timezone) as ISO-8601 with offset.
 */
export function formatMerchantDateTimeISO(date: string, time: string): string {
  const normalizedTime = ensureSecondsInTime(time);
  const utcDate = zonedTimeToUtc(`${date}T${normalizedTime}`, MERCHANT_TIMEZONE);
  return formatInTimeZone(utcDate, MERCHANT_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssxxx");
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
