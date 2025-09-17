"use client";

import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";

interface FifteenMinuteTimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  showPeriod?: boolean;
}

const MINUTE_OPTIONS = [0, 15, 30, 45];

export function FifteenMinuteTimeSelect({
  value,
  onChange,
  className,
  disabled,
  showPeriod = true,
}: FifteenMinuteTimeSelectProps) {
  const { hourValue, minuteValue, periodLabel } = useMemo(() => {
    if (!value) {
      return {
        hourValue: undefined,
        minuteValue: undefined,
        periodLabel: "--",
      };
    }

    const [rawHour, rawMinute] = value.split(":");
    const parsedHour = Number.parseInt(rawHour, 10);
    const parsedMinute = Number.parseInt(rawMinute, 10);

    const safeHour = Number.isNaN(parsedHour) ? undefined : parsedHour;
    const safeMinute = Number.isNaN(parsedMinute) ? undefined : parsedMinute;
    const period = typeof safeHour === "number" ? (safeHour >= 12 ? "PM" : "AM") : "--";

    return {
      hourValue: typeof safeHour === "number" ? safeHour : undefined,
      minuteValue: typeof safeMinute === "number" ? safeMinute : undefined,
      periodLabel: period,
    };
  }, [value]);

  const applyChange = (hour: number | undefined, minute: number | undefined) => {
    const safeHour = typeof hour === "number" && !Number.isNaN(hour) ? hour : 0;
    const safeMinute = typeof minute === "number" && !Number.isNaN(minute) ? minute : 0;

    const formatted = `${safeHour.toString().padStart(2, "0")}:${safeMinute
      .toString()
      .padStart(2, "0")}`;

    onChange(formatted);
  };

  const handleHourChange = (hourString: string) => {
    const hour = Number.parseInt(hourString, 10);
    applyChange(hour, minuteValue);
  };

  const handleMinuteChange = (minuteString: string) => {
    const minute = Number.parseInt(minuteString, 10);
    applyChange(hourValue, minute);
  };

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-2",
        className
      )}
    >
      <Select
        value={typeof hourValue === "number" ? hourValue.toString() : undefined}
        onValueChange={handleHourChange}
        disabled={disabled}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0 h-9 px-3">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 24 }, (_, hour) => {
            return (
              <SelectItem key={hour} value={hour.toString()}>
                {hour.toString().padStart(2, "0")}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <span className="text-gray-400">:</span>

      <Select
        value={typeof minuteValue === "number" ? minuteValue.toString() : undefined}
        onValueChange={handleMinuteChange}
        disabled={disabled}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0 h-9 px-3">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {MINUTE_OPTIONS.map((minutes) => (
            <SelectItem key={minutes} value={minutes.toString()}>
              {minutes.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showPeriod && (
        <div className="px-3 text-sm text-gray-600 border-l">
          {periodLabel}
        </div>
      )}
    </div>
  );
}
