"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@heya-pos/ui';

interface DroppableTimeSlotProps {
  id: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  isDisabled?: boolean;
  hasConflict?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DroppableTimeSlot({
  id,
  staffId,
  startTime,
  endTime,
  isDisabled = false,
  hasConflict = false,
  children,
  className,
}: DroppableTimeSlotProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'timeSlot',
      staffId,
      startTime,
      endTime,
    },
    disabled: isDisabled,
  });

  const isDraggingBooking = active?.data.current?.type === 'booking';
  const showDropIndicator = isOver && isDraggingBooking && !isDisabled && !hasConflict;
  const showInvalidIndicator = isOver && isDraggingBooking && (isDisabled || hasConflict);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-200",
        showDropIndicator && "bg-green-50 outline outline-2 outline-dashed outline-green-400",
        showInvalidIndicator && "bg-red-50 outline outline-2 outline-dashed outline-red-400",
        isDisabled && "bg-gray-50",
        className
      )}
    >
      {children}
      
      {/* Drop indicator overlay */}
      {showDropIndicator && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-md shadow-lg font-medium">
            {startTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </div>
        </div>
      )}
      
      {/* Invalid drop indicator */}
      {showInvalidIndicator && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg">
            {isDisabled ? "Unavailable" : "Time conflict"}
          </div>
        </div>
      )}
    </div>
  );
}