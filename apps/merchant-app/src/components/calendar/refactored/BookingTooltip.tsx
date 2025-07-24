'use client';

import React from 'react';
import { cn } from '@heya-pos/ui';
import { Clock, DollarSign, Phone, CheckCircle, X } from 'lucide-react';
import type { Booking } from './types';

interface BookingTooltipProps {
  booking: Booking;
  visible: boolean;
  x: number;
  y: number;
}

export function BookingTooltip({ booking, visible, x, y }: BookingTooltipProps) {
  if (!visible) return null;
  
  // Format time without date-fns to avoid webpack issues
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const isPM = hour >= 12;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };
  
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':');
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes) + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    const isPM = endHours >= 12;
    const displayHour = endHours === 0 ? 12 : endHours > 12 ? endHours - 12 : endHours;
    return `${displayHour}:${endMinutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };
  
  return (
    <div 
      className="fixed z-[9999] bg-white shadow-xl rounded-lg p-4 w-64 pointer-events-none border border-gray-100"
      style={{
        left: `${x + 10}px`,
        top: `${y - 10}px`,
      }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-base text-gray-900">{booking.customerName}</div>
            <div className="text-sm text-gray-600">{booking.serviceName}</div>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
            booking.status === 'confirmed' && "bg-teal-100 text-teal-700",
            booking.status === 'in-progress' && "bg-teal-100 text-teal-700",
            booking.status === 'completed' && "bg-gray-100 text-gray-700",
            booking.status === 'cancelled' && "bg-red-100 text-red-700 font-bold",
            booking.status === 'no-show' && "bg-orange-100 text-orange-700"
          )}>
            {booking.status === 'cancelled' && <X className="w-3 h-3" strokeWidth={3} />}
            {booking.status === 'in-progress' ? 'In Progress' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(booking.time)} - {calculateEndTime(booking.time, booking.duration)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <DollarSign className="h-3.5 w-3.5" />
            <span>${booking.servicePrice}</span>
            {booking.paymentStatus === 'paid' && (
              <span className="text-green-600 font-medium ml-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Paid
              </span>
            )}
          </div>
        </div>
        {booking.customerPhone && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Phone className="h-3.5 w-3.5" />
            {booking.customerPhone}
          </div>
        )}
        {booking.notes && (
          <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
            {booking.notes.replace(/\[LOYALTY_DISCOUNT:[^\]]+\]\n?/g, '').trim()}
          </div>
        )}
      </div>
    </div>
  );
}