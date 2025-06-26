'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../CalendarProvider';
import { useTimeGrid } from '../hooks';
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@heya-pos/ui';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, pointerWithin, useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { DraggableBooking } from '@/components/calendar/DraggableBooking';
import { CalendarDragOverlay } from '@/components/calendar/DragOverlay';
import { useDroppable } from '@dnd-kit/core';
import type { Booking } from '../types';
import { Check } from 'lucide-react';

// Calculate layout for overlapping bookings
interface BookingLayout {
  left: number;
  width: number;
}

function calculateBookingLayout(bookings: Booking[]): Map<string, BookingLayout> {
  const layoutMap = new Map<string, BookingLayout>();
  
  // Sort bookings by start time
  const sortedBookings = [...bookings].sort((a, b) => {
    const timeA = a.time.localeCompare(b.time);
    if (timeA !== 0) return timeA;
    // If same start time, longer duration goes first
    return b.duration - a.duration;
  });
  
  // First pass: assign columns
  const bookingColumns = new Map<string, number>();
  const columns: Array<{ bookingId: string; endMinutes: number }> = [];
  
  sortedBookings.forEach(booking => {
    const [hours, minutes] = booking.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + booking.duration;
    
    // Find available column
    let columnIndex = -1;
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].endMinutes <= startMinutes) {
        columnIndex = i;
        break;
      }
    }
    
    // If no available column found, add a new one
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push({ bookingId: booking.id, endMinutes });
    } else {
      // Reuse existing column
      columns[columnIndex] = { bookingId: booking.id, endMinutes };
    }
    
    bookingColumns.set(booking.id, columnIndex);
  });
  
  // Second pass: determine max columns for each booking's time range
  sortedBookings.forEach(booking => {
    const [hours, minutes] = booking.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + booking.duration;
    
    // Find all bookings that overlap with this one
    let maxColumns = 1;
    sortedBookings.forEach(other => {
      if (other.id === booking.id) return;
      
      const [otherHours, otherMinutes] = other.time.split(':').map(Number);
      const otherStart = otherHours * 60 + otherMinutes;
      const otherEnd = otherStart + other.duration;
      
      // Check for overlap
      if (otherStart < endMinutes && otherEnd > startMinutes) {
        const otherColumn = bookingColumns.get(other.id) || 0;
        maxColumns = Math.max(maxColumns, otherColumn + 1);
      }
    });
    
    const columnIndex = bookingColumns.get(booking.id) || 0;
    const width = 100 / maxColumns;
    const left = columnIndex * width;
    
    layoutMap.set(booking.id, { left, width });
  });
  
  return layoutMap;
}

interface WeeklyViewProps {
  onBookingClick: (booking: Booking) => void;
  onTimeSlotClick: (date: Date, time: string, staffId: string | null) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeBooking: Booking | null;
  dragOverSlot: {
    staffId: string;
    staffName: string;
    startTime: Date;
    endTime: Date;
  } | null;
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

export function WeeklyView({ 
  onBookingClick, 
  onTimeSlotClick, 
  onDragStart,
  onDragOver,
  onDragEnd,
  activeBooking,
  dragOverSlot 
}: WeeklyViewProps) {
  const { state, filteredBookings } = useCalendar();
  const { timeSlots } = useTimeGrid();
  
  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Small distance to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );
  
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
      <DndContext 
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
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
                        {/* Only show bookings that start at this exact time slot */}
                        {(() => {
                          const startingBookings = slotBookings.filter(booking => booking.time === slot.time);
                          
                          if (startingBookings.length === 0) return null;
                          
                          // Get ALL bookings for this day to check for overlaps
                          const allDayBookings = bookingsByDayAndTime.get(key) || [];
                          
                          return startingBookings.map((booking) => {
                            // Check for any bookings that overlap with this booking's time range
                            const [bookingHour, bookingMin] = booking.time.split(':').map(Number);
                            const bookingStart = bookingHour * 60 + bookingMin;
                            const bookingEnd = bookingStart + booking.duration;
                            
                            const overlappingBookings = allDayBookings.filter(other => {
                              const [otherHour, otherMin] = other.time.split(':').map(Number);
                              const otherStart = otherHour * 60 + otherMin;
                              const otherEnd = otherStart + other.duration;
                              
                              // Check if they overlap
                              return otherStart < bookingEnd && otherEnd > bookingStart;
                            });
                            
                            const hasOverlaps = overlappingBookings.length > 1;
                            const layoutMap = hasOverlaps ? calculateBookingLayout(overlappingBookings) : new Map();
                            const layout = layoutMap.get(booking.id) || { left: 0, width: 100 };
                            
                            // Calculate how many time slots this booking spans
                            const slotsSpanned = Math.ceil(booking.duration / 30); // Weekly view uses 30min slots
                            
                            const bgColor = state.staff.find(s => s.id === booking.staffId)?.color || '#7C3AED';
                            
                            return (
                              <DraggableBooking
                                key={booking.id}
                                id={booking.id}
                                booking={booking}
                                onClick={() => onBookingClick(booking)}
                                className={hasOverlaps ? "absolute" : "absolute inset-x-0.5"}
                                style={hasOverlaps ? { 
                                  top: '1px',
                                  left: `${layout.left}%`,
                                  width: `calc(${layout.width}% - 2px)`,
                                  marginLeft: '1px',
                                  height: `${slotsSpanned * 30 - 2}px`,
                                  maxWidth: '100%'
                                } : { 
                                  top: '1px',
                                  height: `${slotsSpanned * 30 - 2}px`,
                                  maxWidth: '100%'
                                }}
                              >
                                <div 
                                  className="text-xs px-1 py-0.5 rounded cursor-pointer overflow-hidden relative flex items-center gap-1"
                                  style={{
                                    backgroundColor: bgColor,
                                    opacity: 0.9,
                                    height: '100%'
                                  }}
                                >
                                  {/* Completed indicator */}
                                  {booking.status === 'completed' && (
                                    <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Check className="w-2 h-2 text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                  <div className="text-white truncate pr-2 relative flex-1">
                                    {format(parseISO(`2000-01-01T${booking.time}`), 'h:mma')} - {booking.customerName}
                                    {/* Fade out gradient for long text */}
                                    <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[inherit] to-transparent pointer-events-none" />
                                  </div>
                                </div>
                              </DraggableBooking>
                            );
                          });
                        })()}
                      </DroppableTimeSlot>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Drag Overlay */}
        <CalendarDragOverlay 
          activeBooking={activeBooking} 
          dragOverSlot={dragOverSlot}
        />
      </DndContext>
    </div>
  );
}