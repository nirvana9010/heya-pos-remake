'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
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
  
  const startTime = parseISO(`${booking.date}T${booking.time}`);
  const endTime = new Date(startTime.getTime() + booking.duration * 60000);
  
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
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <DollarSign className="h-3.5 w-3.5" />
          ${booking.servicePrice}
          {booking.paymentStatus === 'paid' && (
            <span className="text-green-600 font-medium ml-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Paid
            </span>
          )}
        </div>
        {booking.customerPhone && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Phone className="h-3.5 w-3.5" />
            {booking.customerPhone}
          </div>
        )}
        {booking.notes && (
          <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
            {booking.notes}
          </div>
        )}
      </div>
    </div>
  );
}