"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "@heya-pos/ui";
import { Button } from "@heya-pos/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@heya-pos/ui";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@heya-pos/ui";

interface DatePickerFieldProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  fromDate?: Date;
  toDate?: Date;
  disabled?: boolean;
  disableClear?: boolean;
  disabledDates?: React.ComponentProps<typeof Calendar>["disabled"];
}

/**
 * Consistent date picker trigger that always renders dates as DD/MM/YYYY.
 */
export function DatePickerField({
  value,
  onChange,
  id,
  placeholder = "Select date",
  className,
  fromDate,
  toDate,
  disabled = false,
  disableClear = false,
  disabledDates,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (selected: Date | undefined) => {
      if (disabled) {
        return;
      }
      if (!selected) {
        return;
      }
      onChange(selected);
      setOpen(false);
    },
    [disabled, onChange],
  );

  const label = value ? format(value, "dd/MM/yyyy") : placeholder;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            type="button"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
        >
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={handleSelect}
            fromDate={fromDate}
            toDate={toDate}
            disabled={disabledDates}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && !disableClear && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear date</span>
        </Button>
      )}
    </div>
  );
}
