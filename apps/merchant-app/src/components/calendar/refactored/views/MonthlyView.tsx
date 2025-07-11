'use client';

import React, { useMemo } from 'react';
import { useCalendar } from '../CalendarProvider';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { cn } from '@heya-pos/ui';
import type { Booking } from '../types';
import { Check, X } from 'lucide-react';

interface MonthlyViewProps {
  onBookingClick: (booking: Booking) => void;
  onDayClick: (date: Date) => void;
}

export function MonthlyView({ onBookingClick, onDayClick }: MonthlyViewProps) {
  const { state, filteredBookings } = useCalendar();
  
  const monthStart = startOfMonth(state.currentDate);
  const monthEnd = endOfMonth(state.currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped = new Map<string, Booking[]>();
    
    filteredBookings.forEach(booking => {
      const dateKey = booking.date;
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(booking);
    });
    
    return grouped;
  }, [filteredBookings]);

  // Get visible staff for utilization calculation
  // Get visible staff - ONLY show active staff
  const activeStaff = state.staff.filter(s => s.isActive !== false);
  const visibleStaff = state.selectedStaffIds.length > 0
    ? activeStaff.filter(s => state.selectedStaffIds.includes(s.id))
    : activeStaff;

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            if (!day || !(day instanceof Date)) {
              console.error("Invalid day in calendar grid:", day);
              return null;
            }
            
            const dayBookings = bookingsByDate.get(format(day, 'yyyy-MM-dd')) || [];
            const isCurrentMonth = day.getMonth() === state.currentDate.getMonth();
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            
            // Calculate business metrics
            const totalRevenue = dayBookings
              .filter(b => b.status !== 'cancelled' && b.status !== 'no-show')
              .reduce((sum, b) => sum + b.servicePrice, 0);
            
            const confirmedBookings = dayBookings.filter(b => 
              b.status === 'confirmed' || b.status === 'completed' || b.status === 'in-progress'
            ).length;
            
            const maxBookingsPerDay = visibleStaff.length * 12; // Rough estimate for utilization color
            const utilization = (confirmedBookings / maxBookingsPerDay) * 100;
            
            // Get unique staff with bookings
            const staffWithBookings = [...new Set(dayBookings.map(b => b.staffId))];
            const staffColors = staffWithBookings
              .map(id => state.staff.find(s => s.id === id)?.color)
              .filter(Boolean);
            
            // Determine heat map color based on utilization
            let utilizationClass = "";
            if (utilization > 0) {
              if (utilization < 30) utilizationClass = "bg-green-50";
              else if (utilization < 60) utilizationClass = "bg-green-100";
              else if (utilization < 80) utilizationClass = "bg-amber-50";
              else utilizationClass = "bg-red-50";
            }
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isCurrentMonth && isWeekend && "bg-gray-50",
                  isToday(day) && "bg-teal-50",
                  utilizationClass,
                  "hover:bg-opacity-70"
                )}
                onClick={() => onDayClick(day)}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={cn(
                    "text-sm",
                    isToday(day) && "font-bold text-teal-600",
                    !isCurrentMonth && "text-gray-400"
                  )}>
                    {format(day, "d")}
                  </span>
                  {totalRevenue > 0 && (
                    <span className="text-xs font-medium text-gray-600">
                      ${totalRevenue}
                    </span>
                  )}
                </div>
                
                {dayBookings.length > 0 && (
                  <>
                    {/* Staff color indicators */}
                    {staffColors.length > 0 && (
                      <div className="flex gap-0.5 mb-1">
                        {staffColors.slice(0, 4).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {staffColors.length > 4 && (
                          <span className="text-xs text-gray-500">+{staffColors.length - 4}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Booking preview - show first few */}
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 3).map((booking) => {
                        const staff = state.staff.find(s => s.id === booking.staffId);
                        const isCancelled = booking.status === 'cancelled';
                        const isPending = booking.status === 'pending' || booking.status === 'PENDING';
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              "text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 relative overflow-hidden flex items-center gap-1",
                              isCancelled && 'cancelled-booking'
                            )}
                            style={{
                              backgroundColor: isCancelled ? '#FEE2E2' : (staff?.color || '#E5E7EB'),
                              backgroundImage: isPending ? 'linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3))' : undefined,
                              backgroundBlendMode: isPending ? 'overlay' as any : undefined,
                              color: isCancelled ? '#B91C1C' : (staff?.color ? 'white' : '#4B5563'),
                              borderLeft: isPending ? `2px dashed ${staff?.color || '#9CA3AF'}` : undefined,
                              opacity: isPending ? 0.7 : 1
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(booking);
                            }}
                          >
                            {booking.status === 'completed' && (
                              <Check className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={3} />
                            )}
                            {booking.status === 'cancelled' && (
                              <X className="w-2.5 h-2.5 flex-shrink-0" strokeWidth={3} />
                            )}
                            {(booking.status === 'pending' || booking.status === 'PENDING') && (
                              <span className="text-[8px] font-bold bg-yellow-500 text-white px-1 rounded flex-shrink-0">P</span>
                            )}
                            {(booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid') && (
                              <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0" title="Paid" />
                            )}
                            <span className="relative flex-1">
                              {format(parseISO(`2000-01-01T${booking.time}`), 'h:mma')} {booking.customerName}
                              {/* Fade out gradient for long text */}
                              <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[inherit] to-transparent pointer-events-none" />
                            </span>
                          </div>
                        );
                      })}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                    
                    {/* Booking count badge */}
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs bg-gray-100 rounded px-1">
                        {dayBookings.length} bookings
                      </span>
                      {(() => {
                        const paidCount = dayBookings.filter(b => b.paymentStatus === 'PAID' || b.paymentStatus === 'paid').length;
                        if (paidCount > 0 && paidCount < dayBookings.length) {
                          return (
                            <span className="text-xs text-green-600 font-medium">
                              {paidCount} paid
                            </span>
                          );
                        } else if (paidCount === dayBookings.length) {
                          return (
                            <span className="text-xs text-green-600 font-medium">
                              All paid
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}