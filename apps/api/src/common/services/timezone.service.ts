import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";

@Injectable()
export class TimezoneService {
  private readonly DEFAULT_TIMEZONE = "Australia/Sydney";

  /**
   * Convert a UTC date to the merchant's timezone
   */
  toMerchantTime(date: Date | string, timezone?: string): DateTime {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    return DateTime.fromJSDate(new Date(date)).setZone(tz);
  }

  /**
   * Convert a merchant timezone date to UTC
   */
  toUTC(date: Date | string, timezone?: string): Date {
    const tz = timezone || this.DEFAULT_TIMEZONE;

    if (typeof date === "string") {
      // If it's just a date string without time info
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return DateTime.fromISO(date, { zone: tz }).toUTC().toJSDate();
      }
      // If it's a full ISO string, assume it has timezone info
      return DateTime.fromISO(date).toUTC().toJSDate();
    }

    return DateTime.fromJSDate(date, { zone: tz }).toUTC().toJSDate();
  }

  /**
   * Get the start of day in merchant timezone as UTC
   */
  getStartOfDay(date: Date | string, timezone?: string): Date {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    return DateTime.fromJSDate(new Date(date))
      .setZone(tz)
      .startOf("day")
      .toUTC()
      .toJSDate();
  }

  /**
   * Get the end of day in merchant timezone as UTC
   */
  getEndOfDay(date: Date | string, timezone?: string): Date {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    return DateTime.fromJSDate(new Date(date))
      .setZone(tz)
      .endOf("day")
      .toUTC()
      .toJSDate();
  }

  /**
   * Format a date for display in merchant timezone
   */
  formatDate(date: Date | string, format: string, timezone?: string): string {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    return DateTime.fromJSDate(new Date(date)).setZone(tz).toFormat(format);
  }

  /**
   * Get business hours for a specific day
   */
  getBusinessHoursForDate(
    date: Date,
    businessHours: any,
    timezone?: string,
  ): { openTime: Date; closeTime: Date } | null {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    const dateTime = DateTime.fromJSDate(date).setZone(tz);
    const dayOfWeek = dateTime.weekday % 7; // Convert to 0-6 (Sunday-Saturday)

    const dayHours = businessHours[dayOfWeek];
    if (!dayHours || !dayHours.isOpen) {
      return null;
    }

    const [openHour, openMinute] = dayHours.openTime.split(":").map(Number);
    const [closeHour, closeMinute] = dayHours.closeTime.split(":").map(Number);

    const openTime = dateTime
      .set({ hour: openHour, minute: openMinute, second: 0, millisecond: 0 })
      .toUTC()
      .toJSDate();

    const closeTime = dateTime
      .set({ hour: closeHour, minute: closeMinute, second: 0, millisecond: 0 })
      .toUTC()
      .toJSDate();

    return { openTime, closeTime };
  }

  /**
   * Check if a date/time falls within business hours
   */
  isWithinBusinessHours(
    date: Date,
    businessHours: any,
    timezone?: string,
  ): boolean {
    const hours = this.getBusinessHoursForDate(date, businessHours, timezone);
    if (!hours) return false;

    const time = date.getTime();
    return (
      time >= hours.openTime.getTime() && time <= hours.closeTime.getTime()
    );
  }

  /**
   * Get the next available business day
   */
  getNextBusinessDay(
    startDate: Date,
    businessHours: any,
    timezone?: string,
  ): Date | null {
    const tz = timezone || this.DEFAULT_TIMEZONE;
    let currentDate = DateTime.fromJSDate(startDate).setZone(tz);

    for (let i = 0; i < 7; i++) {
      currentDate = currentDate.plus({ days: i === 0 ? 0 : 1 });
      const dayOfWeek = currentDate.weekday % 7;
      const dayHours = businessHours[dayOfWeek];

      if (dayHours && dayHours.isOpen) {
        const [openHour, openMinute] = dayHours.openTime.split(":").map(Number);
        return currentDate
          .set({
            hour: openHour,
            minute: openMinute,
            second: 0,
            millisecond: 0,
          })
          .toUTC()
          .toJSDate();
      }
    }

    return null;
  }
}
