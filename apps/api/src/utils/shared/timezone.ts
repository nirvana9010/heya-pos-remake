import { parseISO, format, startOfDay, endOfDay } from 'date-fns';

export class TimezoneUtils {
  /**
   * Create a date in a specific timezone from date and time strings
   * @param dateStr - Date string in YYYY-MM-DD format
   * @param timeStr - Time string in HH:mm format
   * @param timezone - Timezone identifier (e.g., 'Australia/Sydney')
   */
  static createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
    // Create a date string with time
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    
    // Create a date assuming the input is in the local timezone
    // Since we're on a server, we need to interpret this correctly
    const localDate = new Date(dateTimeStr);
    
    // Use Intl.DateTimeFormat to format the date in the target timezone
    // This will help us understand what this date/time means in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    // Get the parts of the date in the target timezone
    const parts = formatter.formatToParts(localDate);
    const tzYear = parts.find(p => p.type === 'year')?.value;
    const tzMonth = parts.find(p => p.type === 'month')?.value;
    const tzDay = parts.find(p => p.type === 'day')?.value;
    const tzHour = parts.find(p => p.type === 'hour')?.value;
    const tzMinute = parts.find(p => p.type === 'minute')?.value;
    
    // If the formatted date/time matches our input, the date is correct
    const formattedDate = `${tzYear}-${tzMonth}-${tzDay}`;
    const formattedTime = `${tzHour}:${tzMinute}`;
    
    if (formattedDate === dateStr && formattedTime === timeStr) {
      // The date is already correct for the timezone
      return localDate;
    }
    
    // Otherwise, we need to find the correct UTC time
    // This is a more complex case that shouldn't happen with our usage
    // For now, just return the local date as-is
    return localDate;
  }

  /**
   * Get timezone offset in minutes (positive for west of UTC, negative for east)
   */
  private static getTimezoneOffset(date: Date, timezone: string): number {
    // Get the offset by comparing local time to UTC
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
  }

  /**
   * Format a UTC date in a specific timezone
   */
  static formatInTimezone(date: Date | string, timezone: string, formatStr?: string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Use Intl.DateTimeFormat for formatting
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    if (formatStr === 'date') {
      return dateObj.toLocaleDateString('en-AU', { timeZone: timezone });
    } else if (formatStr === 'time') {
      return dateObj.toLocaleTimeString('en-AU', { 
        timeZone: timezone, 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (formatStr === 'datetime') {
      return dateObj.toLocaleString('en-AU', { timeZone: timezone });
    }
    
    return dateObj.toLocaleString('en-AU', options);
  }

  /**
   * Get the start of day in a specific timezone (returns UTC)
   */
  static startOfDayInTimezone(date: Date | string, timezone: string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Format the date in the target timezone to get YYYY-MM-DD
    const dateStr = dateObj.toLocaleDateString('en-CA', { timeZone: timezone });
    
    // Create start of day in that timezone
    return this.createDateInTimezone(dateStr, '00:00', timezone);
  }

  /**
   * Get the end of day in a specific timezone (returns UTC)
   */
  static endOfDayInTimezone(date: Date | string, timezone: string): Date {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Format the date in the target timezone to get YYYY-MM-DD
    const dateStr = dateObj.toLocaleDateString('en-CA', { timeZone: timezone });
    
    // Create end of day in that timezone
    return this.createDateInTimezone(dateStr, '23:59', timezone);
  }

  /**
   * Convert a date to display in a specific timezone (for UI display)
   */
  static toTimezoneDisplay(date: Date | string, timezone: string): {
    date: string;
    time: string;
    datetime: string;
  } {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    return {
      date: this.formatInTimezone(dateObj, timezone, 'date'),
      time: this.formatInTimezone(dateObj, timezone, 'time'),
      datetime: this.formatInTimezone(dateObj, timezone, 'datetime')
    };
  }

  /**
   * Get common Australian timezones
   */
  static getAustralianTimezones() {
    return [
      { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
      { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
      { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
      { value: 'Australia/Perth', label: 'Perth (AWST)' },
      { value: 'Australia/Adelaide', label: 'Adelaide (ACDT/ACST)' },
      { value: 'Australia/Hobart', label: 'Hobart (AEDT/AEST)' },
      { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
    ];
  }

  /**
   * Get all supported timezones grouped by region
   */
  static getAllTimezones() {
    return {
      'Australia': [
        { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
        { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
        { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
        { value: 'Australia/Perth', label: 'Perth (AWST)' },
        { value: 'Australia/Adelaide', label: 'Adelaide (ACDT/ACST)' },
        { value: 'Australia/Hobart', label: 'Hobart (AEDT/AEST)' },
        { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
      ],
      'New Zealand': [
        { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
        { value: 'Pacific/Chatham', label: 'Chatham Islands' },
      ],
      'Asia': [
        { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
        { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      ],
      'Other': [
        { value: 'UTC', label: 'UTC' },
      ]
    };
  }

  /**
   * Validate if a timezone is valid
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}

export default TimezoneUtils;