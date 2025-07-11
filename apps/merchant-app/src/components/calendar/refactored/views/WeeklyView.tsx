'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../CalendarProvider';
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@heya-pos/ui';
import type { Booking } from '../types';
import { Check, X } from 'lucide-react';


interface WeeklyViewProps {
  onBookingClick: (booking: Booking) => void;
}


export function WeeklyView({ 
  onBookingClick
}: WeeklyViewProps) {
  const { state, filteredBookings } = useCalendar();
  
  
  const weekStart = startOfWeek(state.currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Group bookings by day and sort by time
  const bookingsByDay = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    
    filteredBookings.forEach(booking => {
      const date = parseISO(booking.date);
      const key = format(date, 'yyyy-MM-dd');
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(booking);
    });
    
    // Sort bookings within each day by time, then by staff order
    grouped.forEach((bookings, key) => {
      bookings.sort((a, b) => {
        const timeCompare = a.time.localeCompare(b.time);
        if (timeCompare !== 0) return timeCompare;
        
        // If same time, sort by staff order from state
        const staffIndexA = state.staff.findIndex(s => s.id === a.staffId);
        const staffIndexB = state.staff.findIndex(s => s.id === b.staffId);
        
        // Unassigned bookings go last
        if (staffIndexA === -1) return 1;
        if (staffIndexB === -1) return -1;
        
        return staffIndexA - staffIndexB;
      });
    });
    
    return grouped;
  }, [filteredBookings, state.staff]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header row */}
      <div className="h-20 border-b border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex h-full min-w-[860px]">
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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[860px]">
          {/* Days columns with stacked bookings */}
          {weekDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayBookings = bookingsByDay.get(dayKey) || [];
            
            return (
              <div key={day.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0 min-h-full overflow-hidden">
                <div className="p-2 space-y-2">
                  {dayBookings.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No bookings
                    </div>
                  ) : (
                    dayBookings.map((booking) => {
                      let bgColor = state.staff.find(s => s.id === booking.staffId)?.color || '#9CA3AF';
                      let opacity = 0.9;
                      let borderWidth = 4;
                      let borderStyle = 'solid';
                      let textColor = 'text-white';
                      
                      // Check status first
                      if (booking.status === 'cancelled') {
                        bgColor = '#FEE2E2'; // Light red background
                        opacity = 0.4;
                        borderWidth = 3;
                        textColor = 'text-red-700';
                      } else if (booking.status === 'no-show') {
                        opacity = 0.2;
                        borderWidth = 3;
                        textColor = 'text-gray-500';
                      } else if (booking.status === 'completed' || booking.completedAt) {
                        opacity = 0.3;
                        borderWidth = 3;
                        textColor = 'text-gray-700';
                      } else if (booking.status === 'pending' || booking.status === 'PENDING') {
                        // Option 1: Keep original color with overlay effect
                        opacity = 0.65; // Reduced from 0.8
                        borderWidth = 3;
                        borderStyle = 'dashed';
                      }
                      
                      // Helper to convert hex to rgba
                      const hexToRgba = (hex: string, opacity: number) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                      };
                      
                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "cursor-pointer rounded relative overflow-hidden transition-transform hover:scale-[1.02] hover:shadow-md",
                            textColor,
                            booking.status === 'cancelled' && 'cancelled-booking',
                            booking.status === 'in-progress' && 'animate-[subtlePulse_8s_ease-in-out_infinite]',
                          )}
                          style={{
                            backgroundColor: hexToRgba(bgColor, opacity),
                            backgroundImage: (booking.status === 'pending' || booking.status === 'PENDING') 
                              ? 'linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))'
                              : undefined,
                            backgroundBlendMode: (booking.status === 'pending' || booking.status === 'PENDING') 
                              ? 'overlay' as any
                              : undefined,
                            borderLeft: `${borderWidth}px ${borderStyle} ${bgColor}`,
                            paddingLeft: `${borderWidth + 8}px`,
                            paddingRight: '12px',
                            paddingTop: '8px',
                            paddingBottom: '8px',
                          }}
                          onClick={() => onBookingClick(booking)}
                        >
                          {/* Top row: Time/duration and completed indicator */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {/* Completed indicator */}
                              {(booking.completedAt || booking.status === 'completed') && (
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                              {/* Time and duration */}
                              {booking.status !== 'cancelled' && (
                                <div className="text-xs font-medium opacity-75">
                                  {format(parseISO(`2000-01-01T${booking.time}`), 'h:mm a')} • {booking.duration}m
                                </div>
                              )}
                            </div>
                            {/* Cancelled indicator */}
                            {booking.status === 'cancelled' && (
                              <div className="flex items-center gap-1">
                                <X className="w-3 h-3 text-red-600" strokeWidth={3} />
                                <span className="text-[10px] font-bold text-red-600 uppercase">Cancelled</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Customer name */}
                          <div className="font-bold truncate text-sm">
                            {booking.customerName?.replace(/Walk-in.*\d{1,2}-\d{1,2}(AM|PM)$/i, 'Walk-in').replace(/Walk-in \d{2}-\w+-\d{1,2}-\d{2}-\w+/i, 'Walk-in')}
                          </div>
                          
                          {/* Service name */}
                          <div className="truncate text-xs mt-1 opacity-90">
                            {booking.serviceName}
                          </div>
                          
                          {/* Staff name */}
                          <div className="text-xs mt-1 opacity-75">
                            {booking.staffId ? (state.staff.find(s => s.id === booking.staffId)?.name || 'Unknown Staff') : 'Unassigned'}
                          </div>
                          
                          {/* Status badges - bottom right */}
                          <div className="absolute bottom-2 right-2 flex gap-1">
                            {(booking.status === 'pending' || booking.status === 'PENDING') && (
                              <div className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                PENDING
                              </div>
                            )}
                            {(booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid') && booking.status !== 'cancelled' && (
                              <div className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                PAID
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}