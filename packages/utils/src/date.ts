import {
  format,
  parse,
  addMinutes,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  differenceInMinutes,
} from "date-fns";

export function formatDate(
  date: Date | string,
  formatStr: string = "yyyy-MM-dd",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr);
}

export function formatTime(
  date: Date | string,
  use24Hour: boolean = true,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, use24Hour ? "HH:mm" : "h:mm a");
}

export function formatDateTime(
  date: Date | string,
  use24Hour: boolean = true,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, use24Hour ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd h:mm a");
}

export function parseTime(
  timeStr: string,
  referenceDate: Date = new Date(),
): Date {
  return parse(timeStr, "HH:mm", referenceDate);
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

export function isTimeSlotAvailable(
  startTime: Date,
  endTime: Date,
  existingBookings: { startTime: Date; endTime: Date }[],
): boolean {
  return !existingBookings.some((booking) => {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);

    return (
      (isAfter(startTime, bookingStart) && isBefore(startTime, bookingEnd)) ||
      (isAfter(endTime, bookingStart) && isBefore(endTime, bookingEnd)) ||
      (isBefore(startTime, bookingStart) && isAfter(endTime, bookingEnd)) ||
      startTime.getTime() === bookingStart.getTime()
    );
  });
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  referenceDate: Date = new Date(),
): string[] {
  const slots: string[] = [];
  const start = parseTime(startTime, referenceDate);
  const end = parseTime(endTime, referenceDate);

  let current = start;
  while (isBefore(current, end)) {
    slots.push(format(current, "HH:mm"));
    current = addMinutes(current, slotDuration);
  }

  return slots;
}

// Timezone functions removed temporarily due to date-fns-tz incompatibility with date-fns v4
// These will need to be reimplemented with a different approach
export function convertToTimezone(date: Date, timezone: string): Date {
  // For now, just return the date as-is
  return date;
}

export function convertFromTimezone(date: Date, timezone: string): Date {
  // For now, just return the date as-is
  return date;
}

export function getBusinessWeek(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function isWithinBusinessHours(
  date: Date,
  businessHours: { open: string; close: string },
): boolean {
  const timeStr = format(date, "HH:mm");
  return timeStr >= businessHours.open && timeStr <= businessHours.close;
}

export function getDurationInMinutes(startTime: Date, endTime: Date): number {
  return differenceInMinutes(endTime, startTime);
}

export function getDateRange(days: number): { start: Date; end: Date } {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return { start, end };
}

export {
  format,
  parse,
  addMinutes,
  addDays,
  subDays,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
};
