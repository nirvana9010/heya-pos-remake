"use client"

import * as React from "react"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { ScrollArea } from "./scroll-area"

export interface TimeSlot {
  id: string
  time: string
  available: boolean
  duration?: number // in minutes
}

export interface TimeSlotPickerProps {
  slots: TimeSlot[]
  value?: string
  onChange?: (slotId: string) => void
  className?: string
  disabled?: boolean
}

const TimeSlotPicker = React.forwardRef<HTMLDivElement, TimeSlotPickerProps>(
  ({ slots, value, onChange, className, disabled = false }, ref) => {
    const morningSlots = slots.filter((slot) => {
      const hour = parseInt(slot.time.split(":")[0])
      return hour < 12
    })

    const afternoonSlots = slots.filter((slot) => {
      const hour = parseInt(slot.time.split(":")[0])
      return hour >= 12 && hour < 17
    })

    const eveningSlots = slots.filter((slot) => {
      const hour = parseInt(slot.time.split(":")[0])
      return hour >= 17
    })

    const renderSlotGroup = (title: string, groupSlots: TimeSlot[]) => {
      if (groupSlots.length === 0) return null

      return (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          <div className="grid grid-cols-3 gap-2">
            {groupSlots.map((slot) => (
              <Button
                key={slot.id}
                variant={value === slot.id ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-full",
                  !slot.available && "opacity-50 cursor-not-allowed"
                )}
                disabled={disabled || !slot.available}
                onClick={() => onChange?.(slot.id)}
              >
                {slot.time}
                {slot.duration && (
                  <span className="ml-1 text-xs opacity-70">
                    ({slot.duration}m)
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("w-full", className)}>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="space-y-6">
            {renderSlotGroup("Morning", morningSlots)}
            {renderSlotGroup("Afternoon", afternoonSlots)}
            {renderSlotGroup("Evening", eveningSlots)}
          </div>
        </ScrollArea>
      </div>
    )
  }
)

TimeSlotPicker.displayName = "TimeSlotPicker"

export { TimeSlotPicker }