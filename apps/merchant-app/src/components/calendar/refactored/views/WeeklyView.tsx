'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../CalendarProvider';
import { useTimeGrid } from '../hooks';
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@heya-pos/ui';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { DraggableBooking } from '@/components/calendar/DraggableBooking';
import { useDroppable } from '@dnd-kit/core';
import type { Booking } from '../types';

interface WeeklyViewProps {
  onBookingClick: (booking: Booking) => void;
  onTimeSlotClick: (date: Date, time: string, staffId: string | null) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

// Simple DroppableTimeSlot component for the refactored calendar
function DroppableTimeSlot({
  id,
  date,
  time,
  staffId,
  className,
  onClick,
  children,
}: {
  id: string;
  date: string;
  time: string;
  staffId: string | null;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, time, staffId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && 'bg-blue-50')}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function WeeklyView({ onBookingClick, onTimeSlotClick, onDragEnd }: WeeklyViewProps) {
  const { state, filteredBookings } = useCalendar();
  const { timeSlots } = useTimeGrid();
  
  const weekStart = startOfWeek(state.currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Group bookings by day and time
  const bookingsByDayAndTime = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    
    filteredBookings.forEach(booking => {
      const date = parseISO(booking.date);
      const key = `${format(date, 'yyyy-MM-dd')}_${booking.time}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(booking);
    });
    
    return grouped;
  }, [filteredBookings]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header row - matching scrollable area structure */}
      <div className="h-20 border-b border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex h-full">
          <div className="w-20 flex-shrink-0 border-r border-gray-100 bg-gray-50 h-full" />
          <div className="flex flex-1 min-w-[860px]">
            {weekDays.map((day) => {
              const dayBookings = filteredBookings.filter(b => 
                isSameDay(parseISO(b.date), day)
              );
              const totalRevenue = dayBookings
                .filter(b => b.status !== 'cancelled' && b.status !== 'no-show')
                .reduce((sum, b) => sum + b.servicePrice, 0);

              return (
                <div key={day.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0 px-3 py-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <div className={cn(
                        "text-xs font-medium uppercase tracking-wider",
                        isToday(day) ? "text-teal-600" : "text-gray-500"
                      )}>
                        {format(day, "EEE")}
                      </div>
                      <div className={cn(
                        "text-2xl font-bold mt-0.5",
                        isToday(day) ? "text-teal-600" : "text-gray-900"
                      )}>
                        {format(day, "d")}
                      </div>
                    </div>
                    {dayBookings.length > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          ${totalRevenue}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dayBookings.length} bookings
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <DndContext onDragEnd={onDragEnd} collisionDetection={() => null}>
        <div className="flex-1 overflow-auto">
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-100">
              {timeSlots.map((slot) => (
                <div
                  key={slot.time}
                  className={cn(
                    "text-right pr-2 pt-1 text-xs text-gray-500",
                    slot.isHalfHour ? "h-[30px]" : "h-[30px] border-t border-gray-100"
                  )}
                >
                  {!slot.isHalfHour && slot.displayTime}
                </div>
              ))}
            </div>

            {/* Days columns */}
            <div className="flex flex-1 min-w-[860px]">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0">
                  {timeSlots.map((slot) => {
                    const key = `${format(day, 'yyyy-MM-dd')}_${slot.time}`;
                    const slotBookings = bookingsByDayAndTime.get(key) || [];
                    
                    return (
                      <DroppableTimeSlot
                        key={`${day.toISOString()}_${slot.time}`}
                        id={`week_${format(day, 'yyyy-MM-dd')}_${slot.time}_all`}
                        date={format(day, 'yyyy-MM-dd')}
                        time={slot.time}
                        staffId={null}
                        className={cn(
                          "border-b border-gray-100 hover:bg-gray-50 cursor-pointer relative",
                          slot.isHalfHour ? "h-[30px] border-dashed" : "h-[30px]"
                        )}
                        onClick={() => onTimeSlotClick(day, slot.time, null)}
                      >
                        {slotBookings.map((booking, index) => (
                          <DraggableBooking
                            key={booking.id}
                            id={booking.id}
                            booking={booking}
                            onClick={() => onBookingClick(booking)}
                            className={cn(
                              "absolute left-0 right-0 mx-0.5 text-xs px-1 py-0.5 rounded cursor-pointer truncate z-10",
                              index > 0 && `top-[${(index * 12)}px]`
                            )}
                            style={{
                              backgroundColor: state.staff.find(s => s.id === booking.staffId)?.color || '#7C3AED',
                              top: index > 0 ? `${index * 12}px` : '0px'
                            }}
                          >
                            <div className="text-white truncate">
                              {format(parseISO(`2000-01-01T${booking.time}`), 'h:mma')} - {booking.customerName}
                            </div>
                          </DraggableBooking>
                        ))}
                      </DroppableTimeSlot>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}