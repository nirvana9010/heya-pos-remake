"use client";

import { 
  format, 
  subDays, 
  addDays, 
  subWeeks, 
  addWeeks, 
  subMonths, 
  addMonths, 
  startOfWeek 
} from "date-fns";

// Safe date formatting function that prevents React rendering errors
export function safeFormat(date: Date | null | undefined, formatString: string): string {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return format(date, formatString);
  } catch (error) {
    return '';
  }
}

// Safe date display component
export function SafeDateDisplay({ date, format: formatString = "PPP" }: { date: Date | null | undefined, format?: string }) {
  const formattedDate = safeFormat(date, formatString);
  return <>{formattedDate}</>;
}

// Validate date before operations
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

// Safe navigation label getter
export function getSafeNavigationLabel(
  currentDate: Date,
  viewType: "day" | "week" | "month",
  direction: "prev" | "next"
): string {
  try {
    if (!isValidDate(currentDate)) {
      return '';
    }

    switch (viewType) {
      case "day":
        const targetDay = direction === "prev" 
          ? subDays(currentDate, 1) 
          : addDays(currentDate, 1);
        return safeFormat(targetDay, "EEEE, MMM d");
      
      case "week":
        const targetWeek = direction === "prev" 
          ? subWeeks(currentDate, 1) 
          : addWeeks(currentDate, 1);
        const weekStart = startOfWeek(targetWeek);
        return `Week of ${safeFormat(weekStart, "MMM d")}`;
      
      case "month":
        const targetMonth = direction === "prev" 
          ? subMonths(currentDate, 1) 
          : addMonths(currentDate, 1);
        return safeFormat(targetMonth, "MMMM yyyy");
      
      default:
        return "";
    }
  } catch (error) {
    return '';
  }
}