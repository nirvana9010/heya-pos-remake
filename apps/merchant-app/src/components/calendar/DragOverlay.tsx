"use client";

import React from 'react';
import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';
import { Clock, User, ArrowRight } from 'lucide-react';
import { cn } from '@heya-pos/ui';
import { displayFormats } from '@/lib/date-utils';

interface CalendarDragOverlayProps {
  activeBooking: any | null;
  dragOverSlot?: {
    staffId: string;
    staffName: string;
    startTime: Date;
    endTime: Date;
  } | null;
}

export function CalendarDragOverlay({ activeBooking, dragOverSlot }: CalendarDragOverlayProps) {
  if (!activeBooking) return null;

  return (
    <DndDragOverlay>
      <div className={cn(
        "bg-white rounded-lg shadow-2xl p-3 cursor-grabbing",
        "border-2 border-teal-500",
        "min-w-[200px] max-w-[300px]",
        "opacity-90"
      )}>
        <div className="space-y-2">
          <div className="font-medium text-sm truncate">
            {activeBooking.customerName}
          </div>
          
          <div className="text-xs text-gray-600 space-y-1">
            {activeBooking.services && activeBooking.services.length > 0 ? (
              <div className="truncate">
                {activeBooking.services.map((s: any) => s.name).join(' + ')}
              </div>
            ) : (
              <div className="truncate">{activeBooking.serviceName}</div>
            )}
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{displayFormats.time(activeBooking.startTime)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{activeBooking.staffName}</span>
              </div>
            </div>
            
            {/* Show destination time when hovering over a slot */}
            {dragOverSlot && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2 text-teal-600 font-medium">
                  <ArrowRight className="h-3 w-3" />
                  <span>{displayFormats.time(dragOverSlot.startTime)}</span>
                  {dragOverSlot.staffId !== activeBooking.staffId && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>{dragOverSlot.staffName}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DndDragOverlay>
  );
}