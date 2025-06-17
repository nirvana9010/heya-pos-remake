"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@heya-pos/ui';
import { GripVertical } from 'lucide-react';

interface DraggableBookingProps {
  id: string;
  children: React.ReactNode;
  isDisabled?: boolean;
  className?: string;
}

export function DraggableBooking({ 
  id, 
  children, 
  isDisabled = false,
  className 
}: DraggableBookingProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: {
      type: 'booking',
      bookingId: id,
    },
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group",
        isDragging && "opacity-50 z-50",
        className
      )}
      {...attributes}
      {...(isDisabled ? {} : listeners)}
    >
      {children}
    </div>
  );
}