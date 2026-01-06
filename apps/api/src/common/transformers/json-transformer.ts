import { Transform, TransformFnParams } from "class-transformer";

/**
 * Transform JSON string to object
 */
export function JsonTransform() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  });
}

/**
 * Transform and validate business hours JSON
 */
export interface BusinessHours {
  [key: number]: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

export function BusinessHoursTransform() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return validateBusinessHours(parsed)
          ? parsed
          : getDefaultBusinessHours();
      } catch {
        return getDefaultBusinessHours();
      }
    }
    return validateBusinessHours(value) ? value : getDefaultBusinessHours();
  });
}

function validateBusinessHours(hours: any): hours is BusinessHours {
  if (!hours || typeof hours !== "object") return false;

  for (const day of Object.keys(hours)) {
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) return false;

    const dayHours = hours[day];
    if (typeof dayHours !== "object") return false;
    if (typeof dayHours.isOpen !== "boolean") return false;

    if (dayHours.isOpen) {
      if (!dayHours.openTime || !dayHours.closeTime) return false;
      if (
        !isValidTimeFormat(dayHours.openTime) ||
        !isValidTimeFormat(dayHours.closeTime)
      )
        return false;
    }
  }

  return true;
}

function isValidTimeFormat(time: string): boolean {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function getDefaultBusinessHours(): BusinessHours {
  return {
    0: { isOpen: false }, // Sunday
    1: { isOpen: true, openTime: "09:00", closeTime: "17:00" }, // Monday
    2: { isOpen: true, openTime: "09:00", closeTime: "17:00" }, // Tuesday
    3: { isOpen: true, openTime: "09:00", closeTime: "17:00" }, // Wednesday
    4: { isOpen: true, openTime: "09:00", closeTime: "17:00" }, // Thursday
    5: { isOpen: true, openTime: "09:00", closeTime: "17:00" }, // Friday
    6: { isOpen: false }, // Saturday
  };
}

/**
 * Transform and validate settings JSON
 */
export interface MerchantSettings {
  bookingRules?: {
    minAdvanceBooking?: number;
    maxAdvanceBooking?: number;
    allowCancellations?: boolean;
    cancellationDeadline?: number;
    requireDeposit?: boolean;
    depositPercentage?: number;
  };
  notifications?: {
    emailReminders?: boolean;
    smsReminders?: boolean;
    reminderAdvanceTime?: number;
  };
  display?: {
    primaryColor?: string;
    logoUrl?: string;
    coverImageUrl?: string;
  };
}

export function SettingsTransform() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return getDefaultSettings();
      }
    }
    return value || getDefaultSettings();
  });
}

function getDefaultSettings(): MerchantSettings {
  return {
    bookingRules: {
      minAdvanceBooking: 0,
      maxAdvanceBooking: 90,
      allowCancellations: true,
      cancellationDeadline: 24,
      requireDeposit: false,
      depositPercentage: 0,
    },
    notifications: {
      emailReminders: true,
      smsReminders: false,
      reminderAdvanceTime: 24,
    },
    display: {
      primaryColor: "#000000",
    },
  };
}
