'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useCalendar } from '../CalendarProvider';
import { useTimeGrid, useBookingOperations, useBookingConflicts, timeStringToMinutes, minutesToTimeString } from '../hooks';
import { toMerchantTime } from '@/lib/date-utils';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { cn, useToast } from '@heya-pos/ui';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, pointerWithin, useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { DraggableBooking } from '@/components/calendar/DraggableBooking';
import { CalendarDragOverlay } from '@/components/calendar/DragOverlay';
import { useDroppable } from '@dnd-kit/core';
import type { Booking, Staff } from '../types';
import { Users, Check, X, AlertTriangle, Heart, Hourglass, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { getBookingSourcePresentation } from '../booking-source';
import { BookingTooltip } from '../BookingTooltipSimple';
import { useAuth } from '@/lib/auth/auth-provider';
import { useBooking } from '@/contexts/booking-context';
import { apiClient } from '@/lib/api-client';
import { BookingServiceLabels, createServiceLookup } from '../BookingServiceLabels';


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

const SLOT_PIXEL_HEIGHT = 40;

type ResizeDirection = 'start' | 'end';

interface BookingResizeState {
  bookingId: string;
  direction: ResizeDirection;
  initialPointerY: number;
  startMinutes: number;
  endMinutes: number;
  previewStartMinutes: number;
  previewEndMinutes: number;
  deltaIntervals: number;
  staffId: string | null;
  date: string;
}

const hexToRgba = (hex: string, alpha: number): string => {
  if (typeof hex !== 'string') {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  let normalized = hex.trim();
  if (!normalized) {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  if (normalized.startsWith('#')) {
    normalized = normalized.slice(1);
  }

  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (normalized.length !== 6) {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


// Simple DroppableTimeSlot component for the refactored calendar
function DroppableTimeSlot({
  id,
  date,
  time,
  staffId,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  children,
  hasBooking,
}: {
  id: string;
  date: string;
  time: string;
  staffId: string | null;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  onMouseMove?: (e: React.MouseEvent) => void;
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
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
  const { state, filteredBookings, actions } = useCalendar();
  const { merchant } = useAuth();
  const { loading: bookingContextLoading } = useBooking();
  const { timeSlots } = useTimeGrid();
  const serviceLookup = useMemo(() => createServiceLookup(state.services), [state.services]);
  const slotDurationMinutes = state.timeInterval;
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const [hoveredBookingId, setHoveredBookingId] = React.useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const [hoveredSlot, setHoveredSlot] = React.useState<{
    time: string;
    staffId: string | null;
    staffName: string;
    x: number;
    y: number;
    isRostered?: boolean;
  } | null>(null);
  const { toast } = useToast();
  const { updateBookingTime } = useBookingOperations();
  const { checkTimeConflict } = useBookingConflicts();
  const resizeStateRef = React.useRef<BookingResizeState | null>(null);
  const [resizeState, setResizeState] = React.useState<BookingResizeState | null>(null);

  const updateResizeState = React.useCallback((updater: React.SetStateAction<BookingResizeState | null>) => {
    setResizeState(prev => {
      const next = typeof updater === 'function'
        ? (updater as (prevState: BookingResizeState | null) => BookingResizeState | null)(prev)
        : updater;
      resizeStateRef.current = next;
      return next;
    });
  }, []);

  const onResizePointerMove = React.useCallback((event: PointerEvent) => {
    event.preventDefault();
    updateResizeState(prev => {
      if (!prev) {
        return prev;
      }

      const intervalMinutes = state.timeInterval;
      const minDuration = Math.max(intervalMinutes, 15);
      const dayStartMinutes = state.calendarStartHour * 60;
      const dayEndMinutes = state.calendarEndHour * 60;
      const deltaIntervals = Math.round((event.clientY - prev.initialPointerY) / SLOT_PIXEL_HEIGHT);

      if (deltaIntervals === prev.deltaIntervals) {
        return prev;
      }

      let nextStart = prev.previewStartMinutes;
      let nextEnd = prev.previewEndMinutes;

      if (prev.direction === 'start') {
        const proposedStart = prev.startMinutes + deltaIntervals * intervalMinutes;
        const clampedStart = Math.min(
          Math.max(proposedStart, dayStartMinutes),
          prev.endMinutes - minDuration
        );
        nextStart = clampedStart;
      } else {
        const proposedEnd = prev.endMinutes + deltaIntervals * intervalMinutes;
        const clampedEnd = Math.max(
          Math.min(proposedEnd, dayEndMinutes),
          prev.startMinutes + minDuration
        );
        nextEnd = clampedEnd;
      }

      if (nextStart === prev.previewStartMinutes && nextEnd === prev.previewEndMinutes) {
        return { ...prev, deltaIntervals };
      }

      return {
        ...prev,
        deltaIntervals,
        previewStartMinutes: nextStart,
        previewEndMinutes: nextEnd,
      };
    });
  }, [state.timeInterval, state.calendarStartHour, state.calendarEndHour, updateResizeState]);

  const finalizeResize = React.useCallback(async () => {
    const current = resizeStateRef.current;
    updateResizeState(null);

    if (!current) {
      return;
    }

    const changedStart = current.previewStartMinutes !== current.startMinutes;
    const changedEnd = current.previewEndMinutes !== current.endMinutes;

    if (!changedStart && !changedEnd) {
      return;
    }

    const newDuration = current.previewEndMinutes - current.previewStartMinutes;
    const minDuration = Math.max(state.timeInterval, 15);
    if (newDuration < minDuration) {
      return;
    }

    const newStartTime = minutesToTimeString(current.previewStartMinutes);

    if (checkTimeConflict(current.staffId, current.date, newStartTime, newDuration, current.bookingId)) {
      const staffName = current.staffId
        ? state.staff.find(s => s.id === current.staffId)?.name ?? 'selected staff member'
        : 'selected staff member';
      toast({
        title: 'Slot unavailable',
        description: `That time overlaps with another booking for ${staffName}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateBookingTime(current.bookingId, current.date, newStartTime, current.staffId, {
        endMinutes: current.previewEndMinutes,
        newDuration,
      });
    } catch (error) {
      // updateBookingTime already shows a toast for errors
    }
  }, [updateResizeState, state.timeInterval, checkTimeConflict, state.staff, toast, updateBookingTime]);

  const onResizePointerUp = React.useCallback((event: PointerEvent) => {
    event.preventDefault();
    window.removeEventListener('pointermove', onResizePointerMove);
    window.removeEventListener('pointerup', onResizePointerUp);
    window.removeEventListener('pointercancel', onResizePointerUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    finalizeResize();
  }, [finalizeResize, onResizePointerMove]);

  const startResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>, booking: Booking, direction: ResizeDirection) => {
    if (resizeStateRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const bookingStartMinutes = timeStringToMinutes(booking.time);
    const bookingEndMinutes = bookingStartMinutes + booking.duration;

    updateResizeState({
      bookingId: booking.id,
      direction,
      initialPointerY: event.clientY,
      startMinutes: bookingStartMinutes,
      endMinutes: bookingEndMinutes,
      previewStartMinutes: bookingStartMinutes,
      previewEndMinutes: bookingEndMinutes,
      deltaIntervals: 0,
      staffId: booking.staffId ?? null,
      date: booking.date,
    });

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('pointermove', onResizePointerMove, { passive: false });
    window.addEventListener('pointerup', onResizePointerUp);
    window.addEventListener('pointercancel', onResizePointerUp);
  }, [onResizePointerMove, onResizePointerUp, updateResizeState]);

  React.useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onResizePointerMove);
      window.removeEventListener('pointerup', onResizePointerUp);
      window.removeEventListener('pointercancel', onResizePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [onResizePointerMove, onResizePointerUp]);
  
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
  const currentDayOfWeek = state.currentDate.getDay();
  const currentDateStr = format(state.currentDate, 'yyyy-MM-dd');
  const includeUnscheduledStaff = merchant?.settings?.includeUnscheduledStaff ?? false;

  const rosteredStaff = useMemo(() => {
    if (!state.showOnlyRosteredStaff) {
      return activeStaff;
    }

    return activeStaff.filter(staff => {
      const overrideForToday = staff.scheduleOverrides?.find(override => override.date === currentDateStr);
      if (overrideForToday) {
        return Boolean(overrideForToday.startTime && overrideForToday.endTime);
      }

      const hasSchedules = staff.schedules && staff.schedules.length > 0;
      if (hasSchedules) {
        return staff.schedules.some(schedule => schedule.dayOfWeek === currentDayOfWeek);
      }

      return includeUnscheduledStaff;
    });
  }, [activeStaff, state.showOnlyRosteredStaff, currentDateStr, currentDayOfWeek, includeUnscheduledStaff]);
  
  const visibleStaff = state.selectedStaffIds.length > 0
    ? rosteredStaff.filter(s => state.selectedStaffIds.includes(s.id))
    : rosteredStaff;

  const rosteredIntervalsByStaff = useMemo(() => {
    const map = new Map<string, Array<{ start: number; end: number }>>();

    const toMinutes = (value: string | null | undefined): number | null => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const [hourPart = '0', minutePart = '0'] = trimmed.split(':');
      const hours = Number.parseInt(hourPart, 10);
      const minutes = Number.parseInt(minutePart, 10);

      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }

      const total = hours * 60 + minutes;
      return Number.isFinite(total) ? total : null;
    };

    visibleStaff.forEach((staffMember) => {
      const intervals: Array<{ start: number; end: number }> = [];
      const overridesForToday =
        staffMember.scheduleOverrides?.filter((override) => override.date === currentDateStr) ?? [];

      if (overridesForToday.length > 0) {
        overridesForToday.forEach((override) => {
          const start = toMinutes(override.startTime);
          const end = toMinutes(override.endTime);
          if (start !== null && end !== null && end > start) {
            intervals.push({ start, end });
          }
        });
      } else if (Array.isArray(staffMember.schedules)) {
        staffMember.schedules.forEach((schedule) => {
          if (schedule.dayOfWeek !== currentDayOfWeek) {
            return;
          }
          const start = toMinutes(schedule.startTime);
          const end = toMinutes(schedule.endTime);
          if (start !== null && end !== null && end > start) {
            intervals.push({ start, end });
          }
        });
      }

      if (intervals.length > 0) {
        intervals.sort((a, b) => a.start - b.start);
      }

      map.set(staffMember.id, intervals);
    });

    return map;
  }, [visibleStaff, currentDateStr, currentDayOfWeek]);

  const isStaffRosteredAtSlot = React.useCallback(
    (staffId: string, slotStartMinutes: number, slotEndMinutes: number) => {
      const intervals = rosteredIntervalsByStaff.get(staffId);
      if (!intervals || intervals.length === 0) {
        return false;
      }

      return intervals.some(({ start, end }) => slotStartMinutes >= start && slotEndMinutes <= end);
    },
    [rosteredIntervalsByStaff],
  );

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
  
  const badgeDisplayMode = state.badgeDisplayMode;
  const handleBadgeModeToggle = React.useCallback(async (mode: 'full' | 'icon') => {
    if (mode === badgeDisplayMode) {
      return;
    }

    const previousMode = badgeDisplayMode;
    actions.setBadgeDisplayMode(mode);

    try {
      await apiClient.updateMerchantSettings({ calendarBadgeDisplayMode: mode });

      if (typeof window !== 'undefined') {
        try {
          const storedMerchant = localStorage.getItem('merchant');
          if (storedMerchant) {
            const merchantData = JSON.parse(storedMerchant);
            merchantData.settings = {
              ...merchantData.settings,
              calendarBadgeDisplayMode: mode,
            };
            localStorage.setItem('merchant', JSON.stringify(merchantData));
            window.dispatchEvent(new CustomEvent('merchantSettingsUpdated', {
              detail: { settings: merchantData.settings },
            }));
          } else {
            window.dispatchEvent(new CustomEvent('merchantSettingsUpdated', {
              detail: { settings: { calendarBadgeDisplayMode: mode } },
            }));
          }
        } catch (storageError) {
          console.error('Failed to persist calendar badge preference locally', storageError);
        }
      }
    } catch (error) {
      actions.setBadgeDisplayMode(previousMode);
      toast({
        title: 'Unable to update preference',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  }, [actions, badgeDisplayMode, toast]);

  // Show empty state if no staff are rostered
  // Count only staff with actual schedules for the current day
  const actuallyRosteredStaff = useMemo(() => {
    if (!state.showOnlyRosteredStaff) return visibleStaff;

    return visibleStaff.filter(staff => {
      const overrideForToday = staff.scheduleOverrides?.find(override => override.date === currentDateStr);
      if (overrideForToday) {
        return Boolean(overrideForToday.startTime && overrideForToday.endTime);
      }

      const hasSchedules = staff.schedules && staff.schedules.length > 0;
      if (hasSchedules) {
        return staff.schedules.some(schedule => schedule.dayOfWeek === currentDayOfWeek);
      }
      return false;
    });
  }, [visibleStaff, state.showOnlyRosteredStaff, currentDayOfWeek, currentDateStr]);

  const renderBadgeItems = ({
    showPreferred,
    showSource,
    sourceLabel,
    showPending,
    showOptimistic,
    showInProgress,
    showPaid,
    showDeleted,
    SourceIcon,
  }: {
    showPreferred: boolean;
    showSource: boolean;
    sourceLabel: string;
    showPending: boolean;
    showOptimistic: boolean;
    showInProgress: boolean;
    showPaid: boolean;
    showDeleted: boolean;
    SourceIcon: React.ComponentType<{ className?: string }>;
  }) => {
    const mode = badgeDisplayMode;
    const items: React.ReactNode[] = [];

    if (showPending) {
      items.push(
        mode === 'icon' ? (
          <span
            key="pending"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/90 text-amber-950 shadow"
          >
            <Hourglass className="h-3 w-3" />
          </span>
        ) : (
          <span
            key="pending"
            className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow"
          >
            <Hourglass className="h-3 w-3" />
            Pending
          </span>
        )
      );
    }

    if (showOptimistic) {
      items.push(
        mode === 'icon' ? (
          <span
            key="optimistic"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-400/90 text-white shadow animate-pulse"
          >
            <Sparkles className="h-3 w-3" />
          </span>
        ) : (
          <span
            key="optimistic"
            className="inline-flex items-center gap-1 rounded-full bg-sky-400/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow animate-pulse"
          >
            <Sparkles className="h-3 w-3" />
            Creating…
          </span>
        )
      );
    }

    if (showInProgress) {
      items.push(
        mode === 'icon' ? (
          <span
            key="in-progress"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white shadow"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
          </span>
        ) : (
          <span
            key="in-progress"
            className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            In progress
          </span>
        )
      );
    }

    if (showPaid) {
      items.push(
        mode === 'icon' ? (
          <span
            key="paid"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-emerald-950 shadow"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : (
          <span
            key="paid"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-950 shadow"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            Paid
          </span>
        )
      );
    }

    if (showDeleted) {
      items.push(
        mode === 'icon' ? (
          <span
            key="deleted"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-500/80 text-white shadow"
          >
            <Trash2 className="h-3 w-3" />
          </span>
        ) : (
          <span
            key="deleted"
            className="inline-flex items-center gap-1 rounded-full bg-slate-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
          >
            <Trash2 className="h-3 w-3" />
            Deleted
          </span>
        )
      );
    }

    if (showSource) {
      items.push(
        mode === 'icon' ? (
          <span
            key="source"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/90 text-white shadow"
          >
            <SourceIcon className="h-3 w-3" />
          </span>
        ) : (
          <span
            key="source"
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 shadow"
          >
            <SourceIcon className="h-3 w-3" />
            {sourceLabel}
          </span>
        )
      );
    }

    if (showPreferred) {
      items.push(
        mode === 'icon' ? (
          <span
            key="preferred"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
          >
            <Heart className="h-3 w-3" strokeWidth={2.2} fill="currentColor" />
          </span>
        ) : (
          <span
            key="preferred"
            className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
          >
            <Heart className="h-3 w-3" strokeWidth={2.2} fill="currentColor" />
            Preferred
          </span>
        )
      );
    }

    if (!items.length) {
      return null;
    }

    return items;
  };
  
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
      <div className="flex items-center justify-end border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Badge display</div>
          <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => handleBadgeModeToggle('full')}
              aria-pressed={badgeDisplayMode === 'full'}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                badgeDisplayMode === 'full'
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Full badges
            </button>
            <button
              type="button"
              onClick={() => handleBadgeModeToggle('icon')}
              aria-pressed={badgeDisplayMode === 'icon'}
              className={cn(
                'border-l border-gray-200 px-3 py-1.5 text-xs font-medium transition-colors',
                badgeDisplayMode === 'icon'
                  ? 'bg-slate-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Icons only
            </button>
          </div>
        </div>
      </div>
      <div
        ref={calendarScrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - var(--calendar-topbar-offset, 160px))' }}
      >
        <div className="min-w-[600px]">
          <div 
            className="grid sticky z-30 bg-white border-b border-gray-200 shadow-sm"
            style={{
              gridTemplateColumns: gridColumns,
              top: 0
            }}
          >
            <div className="h-16 border-r border-slate-500/60 bg-gray-50" />

            {state.showUnassignedColumn && (
              <div className="h-16 px-4 flex items-center justify-between border-r border-slate-500/60 bg-gray-50">
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
                <div key={staffMember.id} className="h-16 px-4 flex items-center justify-between border-r border-slate-500/60 last:border-r-0 bg-white">
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
              <div className="bg-gray-50 border-r border-slate-500/60">
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
                      return "text-xs font-medium text-gray-600"; // Darker for half-hours
                    } else {
                      return "text-xs text-gray-500"; // Darker for 15-min marks
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
                <div className="border-r border-slate-500/60">
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
                          "h-[40px] cursor-pointer relative border-r border-slate-500/60 transition-colors duration-100",
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
                        onMouseEnter={(e) => setHoveredSlot({ time: slot.time, staffId: null, staffName: 'Unassigned', x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onMouseMove={(e) => {
                          if (hoveredSlot?.time === slot.time && hoveredSlot?.staffId === null) {
                            setHoveredSlot({ time: slot.time, staffId: null, staffName: 'Unassigned', x: e.clientX, y: e.clientY });
                          }
                        }}
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
                            
                            const bookingStartMinutes = timeStringToMinutes(booking.time);
                            const isResizingThisBooking = resizeState?.bookingId === booking.id;
                            const previewStartMinutes = isResizingThisBooking ? resizeState.previewStartMinutes : bookingStartMinutes;
                            const previewEndMinutes = isResizingThisBooking ? resizeState.previewEndMinutes : bookingStartMinutes + booking.duration;
                            const previewDuration = Math.max(previewEndMinutes - previewStartMinutes, state.timeInterval);
                            const slotsSpanned = Math.ceil(previewDuration / state.timeInterval);
                            const initialHeight = Math.max(slotsSpanned * SLOT_PIXEL_HEIGHT - 4, 70);
                            const startOffsetMinutes = previewStartMinutes - bookingStartMinutes;
                            const cardTopOffset = 2 + (startOffsetMinutes / state.timeInterval) * SLOT_PIXEL_HEIGHT;
                            const baseZIndex = 40;
                            const cardZIndex = isResizingThisBooking ? 90 : (hasOverlaps ? baseZIndex + overlapIndex : baseZIndex);
                            const previewStartTimeString = minutesToTimeString(previewStartMinutes);
                            const displayStartLabel = format(parseISO(`2000-01-01T${previewStartTimeString}`), 'h:mm a');
                            const displayDuration = previewDuration;

                          // Determine if booking is in the past
                          const bookingStartTime = parseISO(`${booking.date}T${previewStartTimeString}`);
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

                          const sourcePresentation = getBookingSourcePresentation(booking.source, booking.customerSource);
                          const SourceIcon = sourcePresentation.icon;
                          const showSourceBadge = sourcePresentation.category !== 'unknown';
                          const showPendingStatusBadge = booking.status === 'PENDING' || booking.status === 'pending';
                          const showOptimisticStatusBadge = booking.status === 'optimistic';
                          const showInProgressStatusBadge = booking.status === 'in-progress';
                          const showPaidStatusBadge = booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid';
                          const isDeleted = booking.status === 'deleted';

                          if (isDeleted) {
                            bgColor = '#6B7280';
                            bgOpacity = 0.22;
                            borderWidth = 3;
                            borderStyle = 'dashed';
                            textColor = 'text-gray-500';
                          }

                          const showPreferredIndicator = Boolean(booking.customerRequestedStaff);
                          const showDeletedStatusBadge = isDeleted;
                          const badgeItems = renderBadgeItems({
                            showPreferred: showPreferredIndicator,
                            showSource: showSourceBadge,
                            sourceLabel: sourcePresentation.label,
                            showPending: showPendingStatusBadge,
                            showOptimistic: showOptimisticStatusBadge,
                            showInProgress: showInProgressStatusBadge,
                            showPaid: showPaidStatusBadge,
                            showDeleted: showDeletedStatusBadge,
                            SourceIcon,
                          });

                          const basePadding = badgeItems
                            ? (badgeDisplayMode === 'icon' ? 10 : 14)
                            : 8;
                          const bookingVisualHeight = initialHeight + (badgeItems ? basePadding : 0);
                          const canResize = booking.status !== 'cancelled' && !isDeleted;

                          return (
                            <DraggableBooking
                              key={booking.id}
                              id={booking.id}
                              className="absolute inset-x-1"
                              style={{
                                top: `${cardTopOffset}px`,
                                zIndex: cardZIndex
                              }}
                              isDisabled={resizeState?.bookingId === booking.id}
                            >
                              <div 
                                className={cn(
                                  "cursor-pointer rounded relative z-20 overflow-hidden flex flex-col",
                                  textColor,
                                  booking.status === 'cancelled' && 'cancelled-booking',
                                  booking.status === 'in-progress' && 'animate-[inProgressRing_3s_ease-in-out_infinite]',
                                  isResizingThisBooking && 'ring-2 ring-white/60 ring-offset-1',
                                  isDeleted && 'opacity-60',
                                  !isPast && booking.status !== 'completed' && booking.status !== 'cancelled' && 'cursor-grab active:cursor-grabbing'
                                )}
                                style={{
                                  height: `${bookingVisualHeight}px`,
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
                                  paddingLeft: `${borderWidth + basePadding}px`,
                                  paddingRight: `${basePadding}px`,
                                  paddingTop: `${basePadding}px`,
                                  paddingBottom: `${basePadding}px`,
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
                                {canResize && (
                                  <div
                                    className="absolute left-3 right-3 top-0 h-3 cursor-ns-resize flex items-center justify-center z-40"
                                    onPointerDown={(event) => startResize(event, booking, 'start')}
                                  >
                                    <span className="block h-1 w-10 rounded-full bg-white/50 transition-colors duration-150 hover:bg-white/80" />
                                  </div>
                                )}
                                {canResize && (
                                  <div
                                    className="absolute left-3 right-3 bottom-0 h-3 cursor-ns-resize flex items-center justify-center z-40"
                                    onPointerDown={(event) => startResize(event, booking, 'end')}
                                  >
                                    <span className="block h-1 w-10 rounded-full bg-white/50 transition-colors duration-150 hover:bg-white/80" />
                                  </div>
                                )}
                                {/* Overlap warning indicator handled in top-right stack */}
                                {/* Top-right indicators */}
                                {(hasOverlaps || booking.status === 'cancelled') && (
                                  <div className="pointer-events-none absolute top-1 right-1 z-30 flex flex-col items-end gap-1">
                                    {hasOverlaps && booking.status !== 'cancelled' && booking.status !== 'optimistic' && (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-white shadow">
                                        <AlertTriangle className="h-3 w-3" />
                                      </div>
                                    )}
                                    {booking.status === 'cancelled' && (
                                      <div className="flex items-center gap-1 rounded bg-white/95 px-2 py-0.5 text-[11px] font-bold uppercase text-red-600 shadow">
                                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                                        <span>Cancelled</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className='flex h-full flex-col gap-1 pr-1'>
                                  {booking.status !== 'cancelled' && (
                                    <div
                                      className={cn(
                                        "text-[11px] sm:text-xs font-medium opacity-70",
                                        isResizingThisBooking && 'opacity-100'
                                      )}
                                    >
                                      {displayStartLabel} • {displayDuration}m
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div 
                                      className={cn(
                                        "font-semibold truncate text-sm sm:text-[0.95rem]",
                                        isPast && "text-gray-900",
                                        isDeleted && 'line-through decoration-[1.5px] decoration-slate-500 text-gray-600'
                                      )}
                                      title={booking.customerName}
                                    >
                                      {booking.customerName}
                                    </div>
                                    <BookingServiceLabels
                                      booking={booking}
                                      lookup={serviceLookup}
                                      className="mt-0.5"
                                      textClassName={cn(
                                        'text-[11px] sm:text-xs',
                                        isDeleted ? 'text-gray-500 line-through' : isPast ? 'text-gray-600' : 'opacity-90'
                                      )}
                                    />
                                  </div>
                                </div>
                                {badgeItems && (
                                  <div
                                    className="pointer-events-none absolute flex flex-row-reverse flex-wrap items-center gap-1"
                                    style={{ bottom: basePadding, right: basePadding }}
                                  >
                                    {badgeItems}
                                  </div>
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
                    const allStaffBookings = bookingsByStaff.get(staff.id) || [];
                    const slotBookings = allStaffBookings.filter((booking) => booking.time === slot.time);
                    const hasStartingBookings = slotBookings.length > 0;

                    const slotStartMinutes = slot.hour * 60 + slot.minute;
                    const slotEndMinutes = Math.min(slotStartMinutes + slotDurationMinutes, 24 * 60);
                    const isRostered = isStaffRosteredAtSlot(staff.id, slotStartMinutes, slotEndMinutes);
                    const showOffRosterOverlay = !isRostered;
                    const hasBookingCoverage = allStaffBookings.some((booking) => {
                      const [bookingHour, bookingMin] = booking.time.split(':').map(Number);
                      const bookingStart = bookingHour * 60 + bookingMin;
                      const bookingEnd = bookingStart + booking.duration;
                      return slotStartMinutes >= bookingStart && slotStartMinutes < bookingEnd;
                    });
                    const isHovered = hoveredSlot?.time === slot.time && hoveredSlot?.staffId === staff.id;
                    const hoverOverlayColor = hexToRgba(staff.color ?? '#1f2937', 0.22);
                    const allowHoverOverlay =
                      !hasBookingCoverage &&
                      slotBookings.length === 0;
                    const hoverLabel = showOffRosterOverlay
                      ? `${staff.name} (NOT ROSTERED)`
                      : staff.name;

                    return (
                      <DroppableTimeSlot
                        key={`${staff.id}-${slot.time}`}
                        id={`day_${format(state.currentDate, 'yyyy-MM-dd')}_${slot.time}_${staff.id}`}
                        date={format(state.currentDate, 'yyyy-MM-dd')}
                        time={slot.time}
                        staffId={staff.id}
                        className={cn(
                          "h-[40px] cursor-pointer relative transition-colors duration-100",
                          staffIndex < visibleStaff.length - 1 && "border-r border-slate-500/60",
                          (() => {
                            if (showOffRosterOverlay) {
                              return "bg-gray-200";
                            }
                            if (!slot.isBusinessHours) {
                              return "bg-gray-50";
                            }
                            return "bg-white";
                          })(),
                          !hasBookingCoverage && !showOffRosterOverlay && "hover:bg-gray-50",
                          (() => {
                            if (hasBookingCoverage) {
                              return "";
                            }
                            if (state.timeInterval === 60) {
                              return slot.minute === 0 ? "shadow-[inset_0_1px_0_0_rgb(209,213,219)]" : "";
                            }
                            if (state.timeInterval === 30) {
                              if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]";
                              if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]";
                              return "";
                            }
                            if (slot.minute === 0) return "shadow-[inset_0_1px_0_0_rgb(209,213,219)]";
                            if (slot.minute === 30) return "shadow-[inset_0_1px_0_0_rgb(229,231,235)]";
                            if (state.timeInterval === 15 && (slot.minute === 15 || slot.minute === 45)) {
                              return "shadow-[inset_0_1px_0_0_rgb(226,232,240)]";
                            }
                            return "shadow-[inset_0_1px_0_0_rgb(243,244,246)]";
                          })()
                        )}
                        onClick={() => onTimeSlotClick(state.currentDate, slot.time, staff.id)}
                        onMouseEnter={(e) =>
                          setHoveredSlot({
                            time: slot.time,
                            staffId: staff.id,
                            staffName: staff.name,
                            x: e.clientX,
                            y: e.clientY,
                            isRostered,
                          })
                        }
                        onMouseLeave={() => setHoveredSlot(null)}
                        onMouseMove={(e) => {
                          if (hoveredSlot?.time === slot.time && hoveredSlot?.staffId === staff.id) {
                            setHoveredSlot({
                              time: slot.time,
                              staffId: staff.id,
                              staffName: staff.name,
                              x: e.clientX,
                              y: e.clientY,
                              isRostered,
                            });
                          }
                        }}
                      >
                        {hasBookingCoverage && (
                          <div className="pointer-events-none absolute inset-0 z-10 rounded bg-white" />
                        )}
                        {allowHoverOverlay && isHovered && (
                          <div
                            className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 rounded text-center px-2"
                            style={{ backgroundColor: hoverOverlayColor }}
                          >
                            <span className="text-xs font-semibold text-white/95">{slot.displayTime}</span>
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/85 truncate w-full">
                              {hoverLabel}
                            </span>
                          </div>
                        )}
                        {/* Only show bookings that start at this exact time slot */}
                        {(() => {
                          if (!hasStartingBookings) return null;

                          return slotBookings.map((booking) => {
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
                            
                            const bookingStartMinutes = timeStringToMinutes(booking.time);
                            const isResizingThisBooking = resizeState?.bookingId === booking.id;
                            const previewStartMinutes = isResizingThisBooking ? resizeState.previewStartMinutes : bookingStartMinutes;
                            const previewEndMinutes = isResizingThisBooking ? resizeState.previewEndMinutes : bookingStartMinutes + booking.duration;
                            const previewDuration = Math.max(previewEndMinutes - previewStartMinutes, state.timeInterval);
                            const slotsSpanned = Math.ceil(previewDuration / state.timeInterval);
                            const initialHeight = Math.max(slotsSpanned * SLOT_PIXEL_HEIGHT - 4, 70);
                            const startOffsetMinutes = previewStartMinutes - bookingStartMinutes;
                            const cardTopOffset = 2 + (startOffsetMinutes / state.timeInterval) * SLOT_PIXEL_HEIGHT;
                            const baseZIndex = 40;
                            const cardZIndex = isResizingThisBooking ? 90 : (hasOverlaps ? baseZIndex + overlapIndex : baseZIndex);
                            const previewStartTimeString = minutesToTimeString(previewStartMinutes);
                            const displayStartLabel = format(parseISO(`2000-01-01T${previewStartTimeString}`), 'h:mm a');
                            const displayDuration = previewDuration;

                          // Determine if booking is in the past
                          const bookingStartTime = parseISO(`${booking.date}T${previewStartTimeString}`);
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

                          const sourcePresentation = getBookingSourcePresentation(booking.source, booking.customerSource);
                          const SourceIcon = sourcePresentation.icon;
                          const showSourceBadge = sourcePresentation.category !== 'unknown';
                          const showPendingStatusBadge = booking.status === 'PENDING' || booking.status === 'pending';
                          const showOptimisticStatusBadge = booking.status === 'optimistic';
                          const showInProgressStatusBadge = booking.status === 'in-progress';
                          const showPaidStatusBadge = booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid';
                          const isDeleted = booking.status === 'deleted';

                          if (isDeleted) {
                            bgColor = '#6B7280';
                            bgOpacity = 0.22;
                            borderWidth = 3;
                            borderStyle = 'dashed';
                            textColor = 'text-gray-500';
                          }

                          const showPreferredIndicator = Boolean(booking.customerRequestedStaff);
                          const showDeletedStatusBadge = isDeleted;
                          const badgeItems = renderBadgeItems({
                            showPreferred: showPreferredIndicator,
                            showSource: showSourceBadge,
                            sourceLabel: sourcePresentation.label,
                            showPending: showPendingStatusBadge,
                            showOptimistic: showOptimisticStatusBadge,
                            showInProgress: showInProgressStatusBadge,
                            showPaid: showPaidStatusBadge,
                            showDeleted: showDeletedStatusBadge,
                            SourceIcon,
                          });

                          const basePadding = badgeItems
                            ? (badgeDisplayMode === 'icon' ? 10 : 14)
                            : 8;
                          const bookingVisualHeight = initialHeight + (badgeItems ? basePadding : 0);
                          const canResize = booking.status !== 'cancelled' && !isDeleted;

                          return (
                            <DraggableBooking
                              key={booking.id}
                              id={booking.id}
                              className="absolute inset-x-1"
                              style={{
                                top: `${cardTopOffset}px`,
                                zIndex: cardZIndex
                              }}
                              isDisabled={resizeState?.bookingId === booking.id}
                            >
                              <div 
                                className={cn(
                                  "cursor-pointer rounded relative z-20 overflow-hidden flex flex-col",
                                  textColor,
                                  booking.status === 'cancelled' && 'cancelled-booking',
                                  booking.status === 'in-progress' && 'animate-[inProgressRing_3s_ease-in-out_infinite]',
                                  isResizingThisBooking && 'ring-2 ring-white/60 ring-offset-1',
                                  isDeleted && 'opacity-60',
                                  !isPast && booking.status !== 'completed' && booking.status !== 'cancelled' && 'cursor-grab active:cursor-grabbing'
                                )}
                                style={{
                                  height: `${bookingVisualHeight}px`,
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
                                  paddingLeft: `${borderWidth + basePadding}px`,
                                  paddingRight: `${basePadding}px`,
                                  paddingTop: `${basePadding}px`,
                                  paddingBottom: `${basePadding}px`,
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
                                {canResize && (
                                  <div
                                    className="absolute left-3 right-3 top-0 h-3 cursor-ns-resize flex items-center justify-center z-40"
                                    onPointerDown={(event) => startResize(event, booking, 'start')}
                                  >
                                    <span className="block h-1 w-10 rounded-full bg-white/50 transition-colors duration-150 hover:bg-white/80" />
                                  </div>
                                )}
                                {canResize && (
                                  <div
                                    className="absolute left-3 right-3 bottom-0 h-3 cursor-ns-resize flex items-center justify-center z-40"
                                    onPointerDown={(event) => startResize(event, booking, 'end')}
                                  >
                                    <span className="block h-1 w-10 rounded-full bg-white/50 transition-colors duration-150 hover:bg-white/80" />
                                  </div>
                                )}
                                {/* Overlap warning indicator handled in top-right stack */}
                                {/* Top-right indicators */}
                                {(hasOverlaps || booking.status === 'cancelled') && (
                                  <div className="pointer-events-none absolute top-1 right-1 z-30 flex flex-col items-end gap-1">
                                    {hasOverlaps && booking.status !== 'cancelled' && booking.status !== 'optimistic' && (
                                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-white shadow">
                                        <AlertTriangle className="h-3 w-3" />
                                      </div>
                                    )}
                                    {booking.status === 'cancelled' && (
                                      <div className="flex items-center gap-1 rounded bg-white/95 px-2 py-0.5 text-[11px] font-bold uppercase text-red-600 shadow">
                                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                                        <span>Cancelled</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className='flex h-full flex-col gap-1 pr-1'>
                                  {booking.status !== 'cancelled' && (
                                    <div
                                      className={cn(
                                        "text-[11px] sm:text-xs font-medium opacity-70",
                                        isResizingThisBooking && 'opacity-100'
                                      )}
                                    >
                                      {displayStartLabel} • {displayDuration}m
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div 
                                      className={cn(
                                        "font-semibold truncate text-sm sm:text-[0.95rem]",
                                        isPast && "text-gray-900",
                                        isDeleted && 'line-through decoration-[1.5px] decoration-slate-500 text-gray-600'
                                      )}
                                      title={booking.customerName}
                                    >
                                      {booking.customerName}
                                    </div>
                                    <BookingServiceLabels
                                      booking={booking}
                                      lookup={serviceLookup}
                                      className="mt-0.5"
                                      textClassName={cn(
                                        'text-[11px] sm:text-xs',
                                        isDeleted ? 'text-gray-500 line-through' : isPast ? 'text-gray-600' : 'opacity-90'
                                      )}
                                    />
                                  </div>
                                </div>
                                {badgeItems && (
                                  <div
                                    className="pointer-events-none absolute flex flex-row-reverse flex-wrap items-center gap-1"
                                    style={{ bottom: basePadding, right: basePadding }}
                                  >
                                    {badgeItems}
                                  </div>
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

      {/* Time slot hover indicator */}
      {/* Hover tooltip removed in favor of inline hover overlay */}
    </div>
  );
}
