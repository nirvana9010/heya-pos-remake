export class TimezoneUtils {
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (e) {
      return false;
    }
  }

  static convertToTimezone(date: Date, timezone: string): Date {
    const dateString = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(dateString);
  }
}