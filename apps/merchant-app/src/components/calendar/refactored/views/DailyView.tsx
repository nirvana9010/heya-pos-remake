'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useCalendar } from '../CalendarProvider';
import { useTimeGrid } from '../hooks';
import { toMerchantTime, formatInMerchantTime } from '@/lib/date-utils';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { cn } from '@heya-pos/ui';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, pointerWithin, useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { DraggableBooking } from '@/components/calendar/DraggableBooking';
import { CalendarDragOverlay } from '@/components/calendar/DragOverlay';
import { useDroppable } from '@dnd-kit/core';
import type { Booking, Staff } from '../types';
import { Users, Check, X, AlertTriangle } from 'lucide-react';
import { BookingTooltip } from '../BookingTooltipSimple';
import { useAuth } from '@/lib/auth/auth-provider';
import { useBooking } from '@/contexts/booking-context';

interface DailyViewProps {
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

// Simple stacking for overlapping bookings - removed complex column layout


// Simple DroppableTimeSlot component for the refactored calendar
function DroppableTimeSlot({
  id,
  date,
  time,
  staffId,
  className,
  onClick,
  children,
  hasBooking,
}: {
  id: string;
  date: string;
  time: string;
  staffId: string | null;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  hasBooking?: boolean;
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

export function DailyView({ 
  onBookingClick, 
  onTimeSlotClick, 
  onDragStart,
  onDragOver,
  onDragEnd,
  activeBooking,
  dragOverSlot 
}: DailyViewProps) {
  const { state, filteredBookings } = useCalendar();
  const { merchant } = useAuth();
  const { loading: bookingContextLoading } = useBooking();
  const { timeSlots } = useTimeGrid();
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const [hoveredBookingId, setHoveredBookingId] = React.useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  
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
  
  // Get bookings for current day
  const todaysBookings = useMemo(() => {
    const result = filteredBookings.filter(booking =>
      isSameDay(parseISO(booking.date), state.currentDate)
    );

    return result;
  }, [filteredBookings, state.currentDate]);
  
  // Current time for determining if booking is past
  const currentTime = useMemo(() => toMerchantTime(new Date()), []);
  
  // Get visible staff - ONLY show active staff
  const activeStaff = state.staff.filter(s => s.isActive !== false);
  
  
  // Filter by roster if enabled
  const rosteredStaff = useMemo(() => {
    if (!state.showOnlyRosteredStaff) {
      return activeStaff;
    }
    
    const currentDayOfWeek = state.currentDate.getDay();
    // Default to false - don't show unscheduled staff unless explicitly enabled
    const includeUnscheduledStaff = merchant?.settings?.includeUnscheduledStaff ?? false;
    
    const filtered = activeStaff.filter(staff => {
      const hasSchedules = staff.schedules && staff.schedules.length > 0;
      
      if (hasSchedules) {
        const worksToday = staff.schedules.some(schedule => schedule.dayOfWeek === currentDayOfWeek);
        return worksToday;
      }
      
      // If no schedules defined, include based on setting
      return includeUnscheduledStaff;
    });
    
    return filtered;
  }, [activeStaff, state.showOnlyRosteredStaff, state.currentDate, merchant?.settings?.includeUnscheduledStaff]);
  
  const visibleStaff = state.selectedStaffIds.length > 0
    ? rosteredStaff.filter(s => state.selectedStaffIds.includes(s.id))
    : rosteredStaff;
  
  // Calculate grid columns
  const gridColumns = useMemo(() => {
    const columnCount = state.showUnassignedColumn ? visibleStaff.length + 1 : visibleStaff.length;
    return `80px repeat(${columnCount}, minmax(150px, 1fr))`;
  }, [visibleStaff.length, state.showUnassignedColumn]);
  
  // Group bookings by staff
  const bookingsByStaff = useMemo(() => {
    const grouped = new Map<string | null, Booking[]>();

    // Initialize with empty arrays for all staff + unassigned
    state.staff.forEach(staff => {
      grouped.set(staff.id, []);
    });

    if (state.showUnassignedColumn) {
      grouped.set(null, []);
    }

    // Group bookings - normalize falsy staffIds to null
    todaysBookings.forEach(booking => {
      const staffId = booking.staffId || null;
      if (grouped.has(staffId)) {
        grouped.get(staffId)!.push(booking);
      }
    });

    return grouped;
  }, [todaysBookings, state.staff, state.showUnassignedColumn]);
  
  
  // Use calendar hours from state
  const CALENDAR_START_HOUR = state.calendarStartHour;
  const CALENDAR_END_HOUR = state.calendarEndHour;
  
  // Calculate current time position
  const getCurrentTimePosition = () => {
    const now = toMerchantTime(new Date());
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Check if current time is outside calendar view hours
    if (hour < CALENDAR_START_HOUR || hour >= CALENDAR_END_HOUR) {
      return null; // Don't show indicator outside calendar hours
    }
    
    // Calculate position based on the time grid
    // We start at CALENDAR_START_HOUR
    const hoursFromStart = hour - CALENDAR_START_HOUR;
    const minutesFromStart = hoursFromStart * 60 + minute;
    
    // Each slot is 40px tall
    // Calculate pixels per minute based on the current time interval
    const pixelsPerMinute = 40 / state.timeInterval;
    const position = minutesFromStart * pixelsPerMinute;
    
    return { position, time: format(now, "h:mm a") };
  };
  
  const currentTimeInfo = getCurrentTimePosition();
  const isCurrentDateToday = isToday(state.currentDate);
  
  // Auto-scroll removed for performance - user requested removal of automatic scrolling feature
  
  // Find the hovered booking
  const hoveredBooking = hoveredBookingId 
    ? todaysBookings.find(b => b.id === hoveredBookingId) || null
    : null;
  
  // Show empty state if no staff are rostered
  // Count only staff with actual schedules for the current day
  const actuallyRosteredStaff = useMemo(() => {
    if (!state.showOnlyRosteredStaff) return visibleStaff;
    
    const currentDayOfWeek = state.currentDate.getDay();
    return visibleStaff.filter(staff => {
      // Only count staff who have schedules AND are working today
      const hasSchedules = staff.schedules && staff.schedules.length > 0;
      if (hasSchedules) {
        return staff.schedules.some(schedule => schedule.dayOfWeek === currentDayOfWeek);
      }
      return false; // Don't count unscheduled staff for empty state check
    });
  }, [visibleStaff, state.showOnlyRosteredStaff, state.currentDate]);
  
  // Show loading state while BookingContext is loading staff data
  if (bookingContextLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show empty state when no staff are rostered (only after data is loaded)
  if (actuallyRosteredStaff.length === 0 && state.showOnlyRosteredStaff) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Rostered</h3>
            <p className="text-gray-500 max-w-md">
              No staff members are scheduled to work on this day. 
              {visibleStaff.length > 0 && (
                <span className="block mt-2">
                  {visibleStaff.length} staff member{visibleStaff.length > 1 ? 's' : ''} without schedules {visibleStaff.length > 1 ? 'are' : 'is'} hidden.
                </span>
              )}
              You can disable the roster filter in settings to see all staff.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={calendarScrollRef} className="flex-1 overflow-x-auto">
        <div className="min-w-[600px]">
          <div 
            className="grid sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm"
            style={{ gridTemplateColumns: gridColumns }}
          >
            <div className="h-16 border-r border-gray-100 bg-gray-50" />

            {state.showUnassignedColumn && (
              <div className="h-16 px-4 flex items-center justify-between border-r border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm shadow-sm bg-gray-200">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-700">Unassigned</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 font-medium">
                        {todaysBookings.filter(b => !b.staffId).length} bookings
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {visibleStaff.map((staffMember) => {
              const staffBookings = todaysBookings.filter(b => b.staffId === staffMember.id);
              const confirmedCount = staffBookings.filter(b => 
                b.status === 'confirmed' || b.status === 'in-progress'
              ).length;

              return (
                <div key={staffMember.id} className="h-16 px-4 flex items-center justify-between border-r border-gray-100 last:border-r-0 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm" 
                           style={{ backgroundColor: staffMember.color }}>
                        {staffMember.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      {staffMember.isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-gray-900">{staffMember.name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600 font-medium">
                          {confirmedCount}
                        </span>
                        {staffBookings.length > confirmedCount && (
                          <span className="text-gray-500">
                            · {staffBookings.length - confirmedCount} other
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <div className="relative">
            {/* Current time indicator */}
            {isCurrentDateToday && currentTimeInfo && (
              <div 
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimeInfo.position}px` }}
              >
                <div className="relative">
                  <div className="absolute left-0 w-20 text-right pr-2">
                    <span className="text-xs font-bold text-red-600 bg-white px-1.5 py-0.5 rounded shadow-sm">
                      {currentTimeInfo.time}
                    </span>
                  </div>
                  <div className="absolute left-20 right-0 h-0.5 bg-red-600 shadow-sm" />
                  <div className="absolute left-20 w-3 h-3 bg-red-600 rounded-full -mt-[5px] shadow-sm animate-pulse" />
                </div>
              </div>
            )}
            
            <div 
              className="grid min-w-[600px]"
              style={{ gridTemplateColumns: gridColumns }}
            >
              {/* Time slots column */}
              <div className="bg-gray-50 border-r border-gray-100">
                {timeSlots.map((slot) => {
                  // Determine if we should show the time label based on interval
                  const shouldShowLabel = () => {
                    if (state.timeInterval === 60) {
                      return slot.minute === 0; // Only show hours
                    } else if (state.timeInterval === 30) {
                      return slot.minute === 0 || slot.minute === 30; // Show hours and half-hours
                    } else { // 15 minute intervals
                      return true; // Show all 15-minute marks
                    }
                  };
                  
                  // Determine border style based on interval
                  const getBorderStyle = () => {
                    if (state.timeInterval === 60) {
                      return slot.minute === 0 ? "shadow-[inset_0_1px_0_0_rgb(209,213,219)]" : ""; // Only hour lines
                    } else if (state.timeInterval === 30) {
                      if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]"; // Strong hour lines
                      if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]"; // Light half-hour lines
                      return "";
                    } else { // 15 minute intervals
                      if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]"; // Strong hour lines
                      if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]"; // Medium half-hour lines
                      return "shadow-[inset_0_1px_0_0_rgb(243,244,246)]"; // Light 15-minute lines
                    }
                  };
                  
                  // Determine text styling based on time
                  const getTextClass = () => {
                    if (slot.minute === 0) {
                      return "text-sm font-semibold text-gray-700"; // Larger, bolder for hours
                    } else if (slot.minute === 30) {
                      return "text-xs font-medium text-gray-500"; // Medium for half-hours
                    } else {
                      return "text-xs text-gray-400"; // Smaller, lighter for 15-min marks
                    }
                  };
                  
                  return (
                    <div
                      key={slot.time}
                      className={cn(
                        "h-[40px] text-right pr-3 pt-1 transition-all duration-200",
                        getBorderStyle(),
                        slot.minute === 0 && "bg-gradient-to-r from-gray-50 to-transparent", // Gradient for hour rows
                        !slot.isBusinessHours && "bg-gray-50/50" // Gray out non-business hours
                      )}
                    >
                      {shouldShowLabel() && (
                        <span className={cn(
                          getTextClass(),
                          "transition-all duration-200",
                          !slot.isBusinessHours && "text-gray-400"
                        )}>
                          {slot.displayTime}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Unassigned column */}
              {state.showUnassignedColumn && (
                <div className="border-r border-gray-100">
                  {timeSlots.map((slot, slotIndex) => {
                    const slotBookings = bookingsByStaff.get(null)?.filter(booking => 
                      booking.time === slot.time
                    ) || [];
                    
                    return (
                      <DroppableTimeSlot
                        key={`unassigned-${slot.time}`}
                        id={`day_${format(state.currentDate, 'yyyy-MM-dd')}_${slot.time}_unassigned`}
                        date={format(state.currentDate, 'yyyy-MM-dd')}
                        time={slot.time}
                        staffId={null}
                        className={cn(
                          "h-[40px] cursor-pointer relative border-r border-gray-100 transition-colors duration-100",
                          !slot.isBusinessHours ? "bg-gray-50/30" : "hover:bg-gray-50/30",
                          (() => {
                            // Match the border styling from time column using shadows
                            if (state.timeInterval === 60) {
                              return slot.minute === 0 ? "shadow-[inset_0_1px_0_0_rgb(209,213,219)]" : "";
                            } else if (state.timeInterval === 30) {
                              if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]";
                              if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]";
                              return "";
                            } else {
                              if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]";
                              if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]";
                              return "shadow-[inset_0_1px_0_0_rgb(243,244,246)]";
                            }
                          })()
                        )}
                        onClick={() => onTimeSlotClick(state.currentDate, slot.time, null)}
                      >
                        {/* Only show bookings that start at this exact time slot */}
                        {(() => {
                          const startingBookings = slotBookings.filter(booking => booking.time === slot.time);
                          
                          if (startingBookings.length === 0) return null;
                          
                          // Get ALL bookings for this staff member (unassigned) to check for overlaps
                          const allUnassignedBookings = bookingsByStaff.get(null) || [];
                          
                          return startingBookings.map((booking) => {
                            // Check for any bookings that overlap with this booking's time range
                            const [bookingHour, bookingMin] = booking.time.split(':').map(Number);
                            const bookingStart = bookingHour * 60 + bookingMin;
                            const bookingEnd = bookingStart + booking.duration;
                            
                            const overlappingBookings = allUnassignedBookings.filter(other => {
                              // Skip the booking itself
                              if (other.id === booking.id) return true;
                              
                              const [otherHour, otherMin] = other.time.split(':').map(Number);
                              const otherStart = otherHour * 60 + otherMin;
                              const otherEnd = otherStart + other.duration;
                              
                              // Check if they overlap
                              return otherStart < bookingEnd && otherEnd > bookingStart;
                            });
                            
                            // Only has overlaps if there are OTHER bookings overlapping (not counting itself)
                            const hasOverlaps = overlappingBookings.filter(b => b.id !== booking.id).length > 0;
                            
                            // Debug logging for overlap detection
                            if (overlappingBookings.length > 1) {
                            }
                            // Simple stacking: find this booking's index in the overlapping set
                            const overlapIndex = hasOverlaps ? overlappingBookings.findIndex(b => b.id === booking.id) : 0;
                            
                            // Calculate how many time slots this booking spans based in interval
                            const slotsSpanned = Math.ceil(booking.duration / state.timeInterval);
                            
                            // Determine if this is a short booking that needs compact layout
                            const isCompactBooking = booking.duration <= 30;
                            
                            // Debug duration calculation for walk-in
                            if (booking.customerName?.includes('Walk-in')) {
                            }
                          
                          // Determine if booking is in the past
                          const bookingStartTime = parseISO(`${booking.date}T${booking.time}`);
                          const isPast = bookingStartTime < currentTime && booking.status !== 'in-progress';
                          
                          // Style based on status and time
                          let bgColor = '#9CA3AF'; // Gray for unassigned
                          let bgOpacity = 0.9;
                          let borderWidth = 4;
                          let borderStyle = 'solid';
                          let textColor = 'text-white';
                          
                          // Check status first
                          if (booking.status === 'cancelled') {
                            bgColor = '#FEE2E2'; // Light red background
                            bgOpacity = 0.4;
                            borderWidth = 3;
                            textColor = 'text-red-700';
                          } else if (booking.status === 'no-show') {
                            bgOpacity = 0.2;
                            borderWidth = 3;
                            textColor = 'text-gray-500';
                          } else if ((booking.completedAt || booking.status === 'completed')) {
                            bgOpacity = 0.3;
                            borderWidth = 3;
                            textColor = 'text-gray-700';
                          } else if (booking.status === 'PENDING' || booking.status === 'pending') {
                            // Pending bookings have distinct visual style
                            bgOpacity = 0.65; // Reduced opacity
                            borderWidth = 4;
                            borderStyle = 'dashed'; // Dashed border
                          } else if (booking.status === 'optimistic') {
                            // Optimistic bookings show with subtle animation
                            bgOpacity = 0.7;
                            borderWidth = 3;
                            borderStyle = 'solid';
                          } else if (booking.status === 'in-progress') {
                            // In-progress bookings should be very prominent
                            bgOpacity = 1.0; // Full opacity
                            borderWidth = 6; // Thicker border
                            borderStyle = 'solid';
                            textColor = 'text-white';
                          } else if (isPast && booking.status !== 'in-progress') {
                            // Only fade confirmed bookings if they're in the past AND not in-progress
                            bgOpacity = 0.3;
                            borderWidth = 3;
                            textColor = 'text-gray-700';
                          }
                          // Otherwise keep default solid style for confirmed/in-progress bookings that are current/future
                          
                          // Helper to convert hex to rgba
                          const hexToRgba = (hex: string, opacity: number) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                          };
                          
                          return (
                            <DraggableBooking
                              key={booking.id}
                              id={booking.id}
                              className="absolute inset-x-1"
                              style={{ 
                                top: '2px',
                                zIndex: hasOverlaps ? overlapIndex + 10 : 1
                              }}
                            >
                              <div 
                                className={cn(
                                  "cursor-pointer rounded relative z-20 overflow-hidden",
                                  textColor,
                                  booking.status === 'cancelled' && 'cancelled-booking',
                                  booking.status === 'in-progress' && 'animate-[inProgressRing_3s_ease-in-out_infinite]',
                                  !isPast && booking.status !== 'completed' && booking.status !== 'cancelled' && 'cursor-grab active:cursor-grabbing'
                                )}
                                style={{
                                  height: `${Math.max(slotsSpanned * 40 - 4, 70)}px`,
                                  backgroundColor: hexToRgba(bgColor, bgOpacity),
                                  backgroundImage: (booking.status === 'PENDING' || booking.status === 'pending')
                                    ? 'linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))'
                                    : booking.status === 'optimistic'
                                    ? 'linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2))'
                                    : undefined,
                                  backgroundBlendMode: (booking.status === 'PENDING' || booking.status === 'pending') || booking.status === 'optimistic'
                                    ? 'overlay' as any
                                    : undefined,
                                  borderLeft: `${borderWidth}px ${borderStyle} ${bgColor}`,
                                  paddingLeft: `${borderWidth + 12}px`,
                                  paddingRight: '16px',
                                  paddingTop: isCompactBooking ? '8px' : '12px',
                                  paddingBottom: isCompactBooking ? '8px' : '12px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!activeBooking) {
                                    onBookingClick(booking);
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  setHoveredBookingId(booking.id);
                                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredBookingId(null)}
                                onMouseMove={(e) => {
                                  if (hoveredBookingId === booking.id) {
                                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                                  }
                                }}
                              >
                                {/* Overlap warning indicator */}
                                {hasOverlaps && booking.status !== 'cancelled' && booking.status !== 'optimistic' && (
                                  <div className="absolute top-1 right-1 z-30">
                                    <div className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                      <AlertTriangle className="w-3 h-3" />
                                    </div>
                                  </div>
                                )}
                                {/* Completed indicator */}
                                {(booking.completedAt || (booking.completedAt || booking.status === 'completed')) && (
                                  <div className="absolute top-1 left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  </div>
                                )}
                                {/* Cancelled indicator */}
                                {booking.status === 'cancelled' && (
                                  <div className="absolute top-2 right-2 flex items-center gap-1">
                                    <X className="w-5 h-5 text-red-600" strokeWidth={3} />
                                    <span className="text-sm font-bold text-red-600 uppercase">Cancelled</span>
                                  </div>
                                )}
                                {/* Status badges - bottom right - responsive */}
                                <div className="absolute bottom-1 sm:bottom-2 md:bottom-3 right-1 sm:right-2 md:right-3 flex gap-1 sm:gap-1.5 md:gap-2 max-w-[60%]">
                                  {(booking.status === 'PENDING' || booking.status === 'pending') && (
                                    <div className="bg-yellow-500 text-white text-[10px] sm:text-[11px] md:text-xs font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded min-w-0 overflow-hidden">
                                      <span className="block truncate">PENDING</span>
                                    </div>
                                  )}
                                  {booking.status === 'optimistic' && (
                                    <div className="bg-blue-500 text-white text-[10px] sm:text-[11px] md:text-xs font-medium px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded animate-pulse min-w-0 overflow-hidden">
                                      <span className="block truncate">Creating...</span>
                                    </div>
                                  )}
                                  {booking.status === 'in-progress' && (
                                    <div className="bg-teal-600 text-white text-[10px] sm:text-[11px] md:text-xs font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded shadow-sm sm:shadow md:shadow-lg min-w-0 overflow-hidden">
                                      <span className="block truncate whitespace-nowrap">IN PROGRESS</span>
                                    </div>
                                  )}
                                  {(booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid') && (
                                    <div className="bg-green-600 text-white text-[10px] sm:text-[11px] md:text-xs font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded min-w-0 overflow-hidden">
                                      <span className="block truncate">PAID</span>
                                    </div>
                                  )}
                                </div>
                                {/* Compact layout for short bookings */}
                                {isCompactBooking ? (
                                  <>
                                    {/* Inline time and duration for compact bookings */}
                                    {booking.status !== 'cancelled' && (
                                      <div className="text-[10px] sm:text-[11px] md:text-xs font-medium opacity-75 mb-0.5">
                                        {format(parseISO(`2000-01-01T${booking.time}`), 'h:mm a')} • {booking.duration}m
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <div 
                                        className={cn("font-semibold truncate text-xs sm:text-sm flex-1", isPast && "text-gray-900", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                        title={booking.customerName}
                                      >
                                        {booking.customerName}
                                      </div>
                                    </div>
                                    <div 
                                      className={cn("truncate text-[10px] sm:text-[11px] md:text-xs", isPast ? "text-gray-600" : "opacity-90", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                      title={`${booking.serviceName} (${booking.duration}min)`}
                                    >
                                      {booking.serviceName}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Regular layout for longer bookings */}
                                    {/* Time and duration - on its own row */}
                                    {booking.status !== 'cancelled' && (
                                      <div className="text-[11px] sm:text-xs md:text-sm font-medium opacity-75 mb-1">
                                        {format(parseISO(`2000-01-01T${booking.time}`), 'h:mm a')} • {booking.duration}m
                                      </div>
                                    )}
                                    <div 
                                      className={cn("font-bold truncate text-sm sm:text-base pr-2", isPast && "text-gray-900", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                      title={booking.customerName}
                                    >
                                      {booking.customerName}
                                    </div>
                                    <div 
                                      className={cn("truncate text-xs sm:text-sm mt-1", isPast ? "text-gray-600" : "opacity-90", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                      title={booking.serviceName}
                                    >
                                      {booking.serviceName}
                                    </div>
                                  </>
                                )}
                              </div>
                            </DraggableBooking>
                          );
                          });
                        })()}
                      </DroppableTimeSlot>
                    );
                  })}
                </div>
              )}
              
              {/* Staff columns */}
              {visibleStaff.map((staff, staffIndex) => (
                <div key={staff.id}>
                  {timeSlots.map((slot, slotIndex) => {
                    const slotBookings = bookingsByStaff.get(staff.id)?.filter(booking =>
                      booking.time === slot.time
                    ) || [];

                    return (
                      <DroppableTimeSlot
                        key={`${staff.id}-${slot.time}`}
                        id={`day_${format(state.currentDate, 'yyyy-MM-dd')}_${slot.time}_${staff.id}`}
                        date={format(state.currentDate, 'yyyy-MM-dd')}
                        time={slot.time}
                        staffId={staff.id}
                        className={cn(
                          "h-[40px] cursor-pointer relative transition-colors duration-100",
                          staffIndex < visibleStaff.length - 1 && "border-r border-gray-100",
                          !slot.isBusinessHours ? "bg-gray-50/30" : "hover:bg-gray-50/30",
                          (() => {
                            // Match the border styling from time column using shadows
                            if (state.timeInterval === 60) {
                              return slot.minute === 0 ? "shadow-[inset_0_1px_0_0_rgb(209,213,219)]" : "";
                            } else if (state.timeInterval === 30) {
                              if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]";
                              if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]";
                              return "";
                            } else {
                              if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]";
                              if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]";
                              return "shadow-[inset_0_1px_0_0_rgb(243,244,246)]";
                            }
                          })()
                        )}
                        onClick={() => onTimeSlotClick(state.currentDate, slot.time, staff.id)}
                      >
                        {/* Only show bookings that start at this exact time slot */}
                        {(() => {
                          const startingBookings = slotBookings.filter(booking => booking.time === slot.time);
                          
                          if (startingBookings.length === 0) return null;
                          
                          // Get ALL bookings for this staff member to check for overlaps
                          const allStaffBookings = bookingsByStaff.get(staff.id) || [];
                          
                          return startingBookings.map((booking) => {
                            // Check for any bookings that overlap with this booking's time range
                            const [bookingHour, bookingMin] = booking.time.split(':').map(Number);
                            const bookingStart = bookingHour * 60 + bookingMin;
                            const bookingEnd = bookingStart + booking.duration;
                            
                            const overlappingBookings = allStaffBookings.filter(other => {
                              // Skip the booking itself
                              if (other.id === booking.id) return true;
                              
                              const [otherHour, otherMin] = other.time.split(':').map(Number);
                              const otherStart = otherHour * 60 + otherMin;
                              const otherEnd = otherStart + other.duration;
                              
                              // Check if they overlap
                              return otherStart < bookingEnd && otherEnd > bookingStart;
                            });
                            
                            // Only has overlaps if there are OTHER bookings overlapping (not counting itself)
                            const hasOverlaps = overlappingBookings.filter(b => b.id !== booking.id).length > 0;
                            
                            // Debug logging for overlap detection
                            if (overlappingBookings.length > 1) {
                            }
                            // Simple stacking: find this booking's index in the overlapping set
                            const overlapIndex = hasOverlaps ? overlappingBookings.findIndex(b => b.id === booking.id) : 0;
                            
                            // Calculate how many time slots this booking spans based in interval
                            const slotsSpanned = Math.ceil(booking.duration / state.timeInterval);
                            
                            // Determine if this is a short booking that needs compact layout
                            const isCompactBooking = booking.duration <= 30;
                            
                            // Debug duration calculation for walk-in
                            if (booking.customerName?.includes('Walk-in')) {
                            }
                          
                          // Determine if booking is in the past
                          const bookingStartTime = parseISO(`${booking.date}T${booking.time}`);
                          const isPast = bookingStartTime < currentTime && booking.status !== 'in-progress';
                          
                          // Style based on status and time
                          let bgColor = staff.color;
                          let bgOpacity = 0.9;
                          let borderWidth = 4;
                          let borderStyle = 'solid';
                          let textColor = 'text-white';
                          
                          // Check status first
                          if (booking.status === 'cancelled') {
                            bgColor = '#FEE2E2'; // Light red background
                            bgOpacity = 0.4;
                            borderWidth = 3;
                            textColor = 'text-red-700';
                          } else if (booking.status === 'no-show') {
                            bgOpacity = 0.2;
                            borderWidth = 3;
                            textColor = 'text-gray-500';
                          } else if ((booking.completedAt || booking.status === 'completed')) {
                            bgOpacity = 0.3;
                            borderWidth = 3;
                            textColor = 'text-gray-700';
                          } else if (booking.status === 'PENDING' || booking.status === 'pending') {
                            // Pending bookings have distinct visual style
                            bgOpacity = 0.65; // Reduced opacity
                            borderWidth = 4;
                            borderStyle = 'dashed'; // Dashed border
                          } else if (booking.status === 'optimistic') {
                            // Optimistic bookings show with subtle animation
                            bgOpacity = 0.7;
                            borderWidth = 3;
                            borderStyle = 'solid';
                          } else if (booking.status === 'in-progress') {
                            // In-progress bookings should be very prominent
                            bgOpacity = 1.0; // Full opacity
                            borderWidth = 6; // Thicker border
                            borderStyle = 'solid';
                            textColor = 'text-white';
                          } else if (isPast && booking.status !== 'in-progress') {
                            // Only fade confirmed bookings if they're in the past AND not in-progress
                            bgOpacity = 0.3;
                            borderWidth = 3;
                            textColor = 'text-gray-700';
                          }
                          // Otherwise keep default solid style for confirmed/in-progress bookings that are current/future
                          
                          // Helper to convert hex to rgba
                          const hexToRgba = (hex: string, opacity: number) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                          };
                          
                          return (
                            <DraggableBooking
                              key={booking.id}
                              id={booking.id}
                              className="absolute inset-x-1"
                              style={{ 
                                top: '2px',
                                zIndex: hasOverlaps ? overlapIndex + 10 : 1
                              }}
                            >
                              <div 
                                className={cn(
                                  "cursor-pointer rounded relative z-20 overflow-hidden",
                                  textColor,
                                  booking.status === 'cancelled' && 'cancelled-booking',
                                  booking.status === 'in-progress' && 'animate-[inProgressRing_3s_ease-in-out_infinite]',
                                  !isPast && booking.status !== 'completed' && booking.status !== 'cancelled' && 'cursor-grab active:cursor-grabbing'
                                )}
                                style={{
                                  height: `${Math.max(slotsSpanned * 40 - 4, 70)}px`,
                                  backgroundColor: hexToRgba(bgColor, bgOpacity),
                                  backgroundImage: (booking.status === 'PENDING' || booking.status === 'pending')
                                    ? 'linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))'
                                    : booking.status === 'optimistic'
                                    ? 'linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2))'
                                    : undefined,
                                  backgroundBlendMode: (booking.status === 'PENDING' || booking.status === 'pending') || booking.status === 'optimistic'
                                    ? 'overlay' as any
                                    : undefined,
                                  borderLeft: `${borderWidth}px ${borderStyle} ${bgColor}`,
                                  paddingLeft: `${borderWidth + 12}px`,
                                  paddingRight: '16px',
                                  paddingTop: isCompactBooking ? '8px' : '12px',
                                  paddingBottom: isCompactBooking ? '8px' : '12px',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!activeBooking) {
                                    onBookingClick(booking);
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  setHoveredBookingId(booking.id);
                                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredBookingId(null)}
                                onMouseMove={(e) => {
                                  if (hoveredBookingId === booking.id) {
                                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                                  }
                                }}
                              >
                                {/* Overlap warning indicator */}
                                {hasOverlaps && booking.status !== 'cancelled' && booking.status !== 'optimistic' && (
                                  <div className="absolute top-1 right-1 z-30">
                                    <div className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                      <AlertTriangle className="w-3 h-3" />
                                    </div>
                                  </div>
                                )}
                                {/* Completed indicator */}
                                {(booking.completedAt || (booking.completedAt || booking.status === 'completed')) && (
                                  <div className="absolute top-1 left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                  </div>
                                )}
                                {/* Cancelled indicator */}
                                {booking.status === 'cancelled' && (
                                  <div className="absolute top-2 right-2 flex items-center gap-1">
                                    <X className="w-5 h-5 text-red-600" strokeWidth={3} />
                                    <span className="text-sm font-bold text-red-600 uppercase">Cancelled</span>
                                  </div>
                                )}
                                {/* Status badges - bottom right - responsive */}
                                <div className="absolute bottom-1 sm:bottom-2 md:bottom-3 right-1 sm:right-2 md:right-3 flex gap-1 sm:gap-1.5 md:gap-2 max-w-[60%]">
                                  {(booking.status === 'PENDING' || booking.status === 'pending') && (
                                    <div className="bg-yellow-500 text-white text-[10px] sm:text-[11px] md:text-xs font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded min-w-0 overflow-hidden">
                                      <span className="block truncate">PENDING</span>
                                    </div>
                                  )}
                                  {booking.status === 'optimistic' && (
                                    <div className="bg-blue-500 text-white text-[10px] sm:text-[11px] md:text-xs font-medium px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded animate-pulse min-w-0 overflow-hidden">
                                      <span className="block truncate">Creating...</span>
                                    </div>
                                  )}
                                  {booking.status === 'in-progress' && (
                                    <div className="bg-teal-600 text-white text-[10px] sm:text-[11px] md:text-xs font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded shadow-sm sm:shadow md:shadow-lg min-w-0 overflow-hidden">
                                      <span className="block truncate whitespace-nowrap">IN PROGRESS</span>
                                    </div>
                                  )}
                                  {(booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid') && (
                                    <div className="bg-green-600 text-white text-[10px] sm:text-[11px] md:text-xs font-bold px-1 sm:px-1.5 md:px-2 py-0.5 sm:py-1 md:py-1.5 rounded min-w-0 overflow-hidden">
                                      <span className="block truncate">PAID</span>
                                    </div>
                                  )}
                                </div>
                                {/* Compact layout for short bookings */}
                                {isCompactBooking ? (
                                  <>
                                    {/* Inline time and duration for compact bookings */}
                                    {booking.status !== 'cancelled' && (
                                      <div className="text-[10px] sm:text-[11px] md:text-xs font-medium opacity-75 mb-0.5">
                                        {format(parseISO(`2000-01-01T${booking.time}`), 'h:mm a')} • {booking.duration}m
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <div 
                                        className={cn("font-semibold truncate text-xs sm:text-sm flex-1", isPast && "text-gray-900", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                        title={booking.customerName}
                                      >
                                        {booking.customerName}
                                      </div>
                                    </div>
                                    <div 
                                      className={cn("truncate text-[10px] sm:text-[11px] md:text-xs", isPast ? "text-gray-600" : "opacity-90", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                      title={`${booking.serviceName} (${booking.duration}min)`}
                                    >
                                      {booking.serviceName}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Regular layout for longer bookings */}
                                    {/* Time and duration - on its own row */}
                                    {booking.status !== 'cancelled' && (
                                      <div className="text-[11px] sm:text-xs md:text-sm font-medium opacity-75 mb-1">
                                        {format(parseISO(`2000-01-01T${booking.time}`), 'h:mm a')} • {booking.duration}m
                                      </div>
                                    )}
                                    <div 
                                      className={cn("font-bold truncate text-sm sm:text-base pr-2", isPast && "text-gray-900", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                      title={booking.customerName}
                                    >
                                      {booking.customerName}
                                    </div>
                                    <div 
                                      className={cn("truncate text-xs sm:text-sm mt-1", isPast ? "text-gray-600" : "opacity-90", (booking.completedAt || booking.status === 'completed') && "pl-5")}
                                      title={booking.serviceName}
                                    >
                                      {booking.serviceName}
                                    </div>
                                  </>
                                )}
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
          
          {/* Drag Overlay */}
          <CalendarDragOverlay 
            activeBooking={activeBooking} 
            dragOverSlot={dragOverSlot}
          />
        </DndContext>
        </div>
      </div>
      
      {/* Tooltip rendered at document level */}
      {hoveredBooking && (
        <BookingTooltip 
          booking={hoveredBooking} 
          visible={true}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />
      )}
    </div>
  );
}
