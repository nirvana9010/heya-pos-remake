"use client";

// Build timestamp - updates when file is saved
const __BUILD_TIME__ = new Date().toLocaleString();
const LOCAL_BOOKING_RETENTION_MS = 60000;
// Checkbox removed - rostered staff filter now controlled by merchant settings only

import React, { useCallback, useMemo, useRef } from "react";
import { CalendarProvider, useCalendar } from "./CalendarProvider";
import { DailyView } from "./views/DailyView";
import { WeeklyView } from "./views/WeeklyView";
import { MonthlyView } from "./views/MonthlyView";
import {
  useCalendarData,
  useCalendarNavigation,
  useCalendarDragDrop,
  useBookingOperations,
} from "./hooks";
import { Button } from "@heya-pos/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@heya-pos/ui";
import { formatName } from "@heya-pos/utils";
import { Card, CardContent } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { Calendar } from "@heya-pos/ui";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  RefreshCw,
  Filter,
  Users,
  GripVertical,
  Loader2,
} from "lucide-react";
import { BookingSlideOut } from "@/components/BookingSlideOut";
import { BookingDetailsSlideOut } from "@/components/BookingDetailsSlideOut";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { apiClient } from "@/lib/api-client";
import type { Booking, BookingStatus, Staff } from "./types";
import { DEFAULT_CALENDAR_STATUS_FILTERS } from "./types";
import {
  checkStaffAvailability,
  ensureValidStaffId,
  isValidStaffId,
} from "@/lib/services/booking-availability.service";
import {
  NEXT_AVAILABLE_STAFF_ID,
  isNextAvailableStaff,
} from "@/lib/constants/booking-constants";
import { bookingEvents } from "@/lib/services/booking-events";
import { mapBookingSource } from "@/lib/booking-source";
import { formatMerchantDateTimeISO } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth/auth-provider";
import { useNotifications } from "@/contexts/notifications-context";
import { useBooking } from "@/contexts/booking-context";
import { useWebSocket } from "@/hooks/useWebSocket";
import { isBlocksEnabled as isBlocksEnabledUtil } from "./utils/blocks-enabled";

// Main calendar component that uses the provider
export function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarContent />
    </CalendarProvider>
  );
}

interface StaffReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff[];
  onSave: (order: string[]) => Promise<void> | void;
}

function StaffReorderDialog({
  open,
  onOpenChange,
  staff,
  onSave,
}: StaffReorderDialogProps) {
  const [localOrder, setLocalOrder] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  const defaultOrder = React.useMemo(
    () => staff.map((member) => member.id),
    [staff],
  );

  React.useEffect(() => {
    if (open) {
      setLocalOrder(defaultOrder);
    }
  }, [open, defaultOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const orderedStaff = React.useMemo(() => {
    if (localOrder.length === 0) {
      return staff;
    }

    const orderIndex = new Map(localOrder.map((id, index) => [id, index]));
    return [...staff].sort((a, b) => {
      const indexA = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const indexB = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });
  }, [localOrder, staff]);

  const hasChanges = React.useMemo(() => {
    if (localOrder.length !== defaultOrder.length) {
      return true;
    }
    return defaultOrder.some((id, index) => localOrder[index] !== id);
  }, [localOrder, defaultOrder]);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setLocalOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(localOrder);
      setIsSaving(false);
      onOpenChange(false);
    } catch (error) {
      setIsSaving(false);
    }
  }, [localOrder, onOpenChange, onSave]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (isSaving) {
        return;
      }
      onOpenChange(nextOpen);
    },
    [isSaving, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Reorder staff</DialogTitle>
          <DialogDescription>
            Drag staff to adjust how columns appear in the calendar. This order
            applies to day and week views.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {orderedStaff.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
              No active staff available to reorder.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localOrder.length > 0 ? localOrder : defaultOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedStaff.map((member) => (
                    <SortableStaffRow
                      key={member.id}
                      staffMember={member}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <p className="mt-3 text-xs text-gray-500">
            Tip: Keep your most requested staff at the top so they appear first
            on the calendar.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SortableStaffRowProps {
  staffMember: Staff;
  disabled?: boolean;
}

function SortableStaffRow({ staffMember, disabled }: SortableStaffRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: staffMember.id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow",
        isDragging && "shadow-md ring-1 ring-teal-500",
      )}
    >
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Move ${staffMember.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-1 items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: staffMember.color || "#CBD5F5" }}
        />
        <span className="text-sm font-medium text-gray-900">
          {staffMember.name}
        </span>
      </div>
    </div>
  );
}

// Inner component that has access to calendar context
function CalendarContent() {
  const { state, actions } = useCalendar();
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { notifications, refreshNotifications } = useNotifications();
  const { staff: bookingContextStaff, loading: bookingContextLoading } =
    useBooking();
  const { refresh, isLoading, isRefreshing } = useCalendarData();
  const {
    navigatePrevious,
    navigateNext,
    navigationLabel,
    currentView,
    setView,
  } = useCalendarNavigation();
  const { handleDragEnd } = useCalendarDragDrop();
  const { updateBookingTime } = useBookingOperations();

  // Track locally created bookings to prevent WebSocket refresh conflicts
  const locallyCreatedBookings = useRef<Set<string>>(new Set());

  // WebSocket connection for real-time updates
  useWebSocket({
    debug:
      typeof window !== "undefined" &&
      localStorage.getItem("ws_debug") === "true",
    onBookingCreated: React.useCallback(
      (data) => {
        // Only refresh if this booking is for our merchant
        if (data.merchantId === merchant?.id) {
          console.log("[Calendar] Real-time: Booking created", data.id);

          // Check if this booking was created locally (to prevent refresh conflicts)
          if (locallyCreatedBookings.current.has(data.id)) {
            console.log(
              "[Calendar] Skipping WebSocket refresh for locally created booking",
              data.id,
            );
            // Remove from tracking after 5 seconds to allow future refreshes
            setTimeout(() => {
              locallyCreatedBookings.current.delete(data.id);
            }, 5000);
            return;
          }

          // Clear cache and refresh
          apiClient.clearBookingsCache();

          // Add a small delay to ensure database consistency
          setTimeout(() => {
            refresh();
          }, 500);

          // Show toast notification
          toast({
            title: "New Booking",
            description: "A new booking has been created",
            duration: 3000,
          });
        }
      },
      [merchant?.id, refresh, toast],
    ),

    onBookingUpdated: React.useCallback(
      (data) => {
        // Only refresh if this booking is for our merchant
        if (data.merchantId === merchant?.id) {
          console.log(
            "[Calendar] Real-time: Booking updated",
            data.id,
            "Status:",
            data.status,
          );

          // Update the booking in local state immediately for instant feedback
          const booking = state.bookings.find((b) => b.id === data.id);
          if (booking) {
            // Optimistic update
            actions.updateBooking(data.id, {
              status: data.status,
              // Add other updated fields as needed
            });
          }

          // Clear cache and refresh from server
          apiClient.clearBookingsCache();

          // Refresh in background to sync with server
          setTimeout(() => {
            refresh();
          }, 500);

          // Show toast if status changed
          if (data.oldStatus !== data.status) {
            toast({
              title: "Booking Updated",
              description: `Status changed from ${data.oldStatus} to ${data.status}`,
              duration: 3000,
            });
          }
        }
      },
      [merchant?.id, state.bookings, actions, refresh, toast],
    ),

    onBookingDeleted: React.useCallback(
      (data) => {
        // Only refresh if this booking is for our merchant
        if (data.merchantId === merchant?.id) {
          console.log("[Calendar] Real-time: Booking deleted", data.id);

          // Remove from local state immediately
          actions.deleteBooking(data.id);

          // Clear cache
          apiClient.clearBookingsCache();

          // Refresh to sync with server
          setTimeout(() => {
            refresh();
          }, 500);

          toast({
            title: "Booking Deleted",
            description: "A booking has been removed",
            duration: 3000,
          });
        }
      },
      [merchant?.id, actions, refresh, toast],
    ),

    onPaymentCreated: React.useCallback(
      (data) => {
        if (data.merchantId === merchant?.id && data.bookingId) {
          console.log(
            "[Calendar] Real-time: Payment created for booking",
            data.bookingId,
          );

          // Refresh to show payment status update
          apiClient.clearBookingsCache();
          refresh();
        }
      },
      [merchant?.id, refresh],
    ),

    onPaymentUpdated: React.useCallback(
      (data) => {
        if (data.merchantId === merchant?.id && data.bookingId) {
          console.log(
            "[Calendar] Real-time: Payment updated for booking",
            data.bookingId,
          );

          // Refresh to show payment status update
          apiClient.clearBookingsCache();
          refresh();
        }
      },
      [merchant?.id, refresh],
    ),
  });

  // Set staff from BookingContext when it's loaded
  React.useEffect(() => {
    if (bookingContextStaff && bookingContextStaff.length > 0) {
      actions.setStaff(bookingContextStaff);
    }
  }, [bookingContextStaff, actions]);

  // Development logging helper
  const addActivityLog = React.useCallback(
    (
      type: "event" | "api" | "state" | "error",
      message: string,
      detail?: any,
    ) => {
      if (process.env.NODE_ENV !== "development") return;

      setActivityLog((prev) => {
        const newLog = {
          timestamp: new Date().toLocaleTimeString(),
          type,
          message,
          detail,
        };
        // Keep only last 50 logs
        return [newLog, ...prev].slice(0, 50);
      });
    },
    [],
  );

  // Listen for booking events in development
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const handleBookingEvent = (event: CustomEvent) => {
      // Removed activity log
    };

    const handleFetchBookings = (event: CustomEvent) => {
      // Removed activity log
    };

    window.addEventListener("booking-updated", handleBookingEvent as any);
    window.addEventListener(
      "calendar-fetch-bookings",
      handleFetchBookings as any,
    );

    return () => {
      window.removeEventListener("booking-updated", handleBookingEvent as any);
      window.removeEventListener(
        "calendar-fetch-bookings",
        handleFetchBookings as any,
      );
    };
  }, [addActivityLog]);

  // Removed notification polling logs

  // Refresh calendar when we detect new booking notifications
  const prevBookingNotificationIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const bookingNotifications = notifications.filter(
      (n) =>
        !n.read &&
        (n.type === "booking_new" || n.type === "booking_modified") &&
        n.metadata?.bookingId,
    );

    // Check if there are any new booking notifications
    const newNotifications = bookingNotifications.filter(
      (n) => !prevBookingNotificationIds.current.has(n.id),
    );

    if (newNotifications.length > 0) {
      // Clear the booking cache to ensure fresh data
      apiClient.clearBookingsCache();

      if (!isLoading && !isRefreshing) {
        refresh();
      }
    }

    // Update the set of seen notification IDs
    prevBookingNotificationIds.current = new Set(
      bookingNotifications.map((n) => n.id),
    );
  }, [notifications, refresh, isLoading, isRefreshing, addActivityLog]);

  // Removed polling indicator

  // Drag state
  const [activeBooking, setActiveBooking] = React.useState<Booking | null>(
    null,
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOverSlot, setDragOverSlot] = React.useState<{
    staffId: string;
    staffName: string;
    startTime: Date;
    endTime: Date;
  } | null>(null);

  // Filter popover state
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  // Booking slide out data
  const [bookingSlideOutData, setBookingSlideOutData] = React.useState<{
    date: Date;
    time: string;
    staffId: string | null;
  } | null>(null);
  const [isBlockMode, setIsBlockMode] = React.useState(false);
  const [blockSelection, setBlockSelection] = React.useState<{
    date: Date;
    time: string;
    staffId: string;
  } | null>(null);

  // Development activity log
  const [activityLog, setActivityLog] = React.useState<
    Array<{
      timestamp: string;
      type: "event" | "api" | "state" | "error";
      message: string;
      detail?: any;
    }>
  >([]);
  const [isActivityLogMinimized, setIsActivityLogMinimized] =
    React.useState(false);
  const enableBlocks = useMemo(
    () => isBlocksEnabledUtil(merchant),
    [merchant],
  );

  const handlePersistStaffOrder = React.useCallback(
    async (orderedIds: string[]) => {
      const validStaffIds = state.staff.map((member) => member.id);
      const uniqueIds = orderedIds.filter(
        (id, index, self) => self.indexOf(id) === index,
      );
      const sanitizedOrder = uniqueIds.filter((id) =>
        validStaffIds.includes(id),
      );
      const completedOrder = [
        ...sanitizedOrder,
        ...validStaffIds.filter((id) => !sanitizedOrder.includes(id)),
      ];
      const previousOrder = [...state.staffDisplayOrder];

      if (completedOrder.length === 0) {
        return;
      }

      actions.setStaffOrder(completedOrder);

      try {
        await apiClient.updateMerchantSettings({
          calendarStaffOrder: completedOrder,
        });

        if (typeof window !== "undefined") {
          try {
            const storedMerchant = localStorage.getItem("merchant");
            if (storedMerchant) {
              const merchantData = JSON.parse(storedMerchant);
              merchantData.settings = {
                ...merchantData.settings,
                calendarStaffOrder: completedOrder,
              };
              localStorage.setItem("merchant", JSON.stringify(merchantData));
              window.dispatchEvent(
                new CustomEvent("merchantSettingsUpdated", {
                  detail: { settings: merchantData.settings },
                }),
              );
            } else {
              window.dispatchEvent(
                new CustomEvent("merchantSettingsUpdated", {
                  detail: { settings: { calendarStaffOrder: completedOrder } },
                }),
              );
            }
          } catch (storageError) {
            console.error(
              "[Calendar] Failed to persist staff order locally",
              storageError,
            );
          }
        }

        toast({
          title: "Staff order updated",
          description: "Calendar columns now follow the new order.",
        });
      } catch (error) {
        actions.setStaffOrder(previousOrder);
        toast({
          title: "Unable to update staff order",
          description: "Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [actions, state.staff, state.staffDisplayOrder, toast],
  );

  // Memoize the initial time to prevent infinite renders
  const initialTime = React.useMemo(() => {
    if (!bookingSlideOutData?.time) return undefined;
    const [hours, minutes] = bookingSlideOutData.time.split(":").map(Number);
    const time = new Date(bookingSlideOutData.date);
    time.setHours(hours, minutes, 0, 0);
    return time;
  }, [bookingSlideOutData?.date, bookingSlideOutData?.time]);

  // Memoize transformed data to prevent infinite renders
  const memoizedStaff = React.useMemo(
    () =>
      state.staff.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
      })),
    [state.staff],
  );

  const memoizedServices = React.useMemo(
    () =>
      state.services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        categoryName: s.categoryName,
      })),
    [state.services],
  );

  const memoizedCustomers = React.useMemo(
    () =>
      state.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || c.mobile || "",
        mobile: c.mobile,
        email: c.email,
      })),
    [state.customers],
  );

  // Calculate active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;

    const defaultStatusSet = new Set(DEFAULT_CALENDAR_STATUS_FILTERS);
    const matchesDefaultStatuses =
      state.selectedStatusFilters.length ===
        DEFAULT_CALENDAR_STATUS_FILTERS.length &&
      state.selectedStatusFilters.every((status) =>
        defaultStatusSet.has(status),
      );

    if (!matchesDefaultStatuses) {
      count++;
    }

    // Check staff filter
    if (
      state.selectedStaffIds.length < state.staff.length &&
      state.selectedStaffIds.length > 0
    ) {
      count++;
    }

    return count;
  }, [state.selectedStatusFilters, state.selectedStaffIds, state.staff]);

  // Calculate rostered staff count for the current day
  const rosteredStaffInfo = React.useMemo(() => {
    const activeStaff = state.staff.filter((s) => s.isActive !== false);

    if (!state.showOnlyRosteredStaff || state.currentView !== "day") {
      return {
        rosteredCount: activeStaff.length,
        totalCount: activeStaff.length,
        hiddenCount: 0,
      };
    }

    const currentDayOfWeek = state.currentDate.getDay();
    const currentDateStr = format(state.currentDate, "yyyy-MM-dd");
    const includeUnscheduledStaff =
      merchant?.settings?.includeUnscheduledStaff ?? false;

    const rosteredStaff = activeStaff.filter((staff) => {
      const overrideForToday = staff.scheduleOverrides?.find(
        (override) => override.date === currentDateStr,
      );
      if (overrideForToday) {
        return Boolean(overrideForToday.startTime && overrideForToday.endTime);
      }

      const hasSchedules = staff.schedules && staff.schedules.length > 0;
      if (hasSchedules) {
        return staff.schedules.some(
          (schedule) => schedule.dayOfWeek === currentDayOfWeek,
        );
      }

      return includeUnscheduledStaff;
    });

    return {
      rosteredCount: rosteredStaff.length,
      totalCount: activeStaff.length,
      hiddenCount: activeStaff.length - rosteredStaff.length,
    };
  }, [
    state.staff,
    state.showOnlyRosteredStaff,
    state.currentDate,
    state.currentView,
    merchant?.settings?.includeUnscheduledStaff,
  ]);

  // Handle booking click
  const handleBookingClick = useCallback(
    (booking: Booking) => {
      actions.openDetailsSlideOut(booking.id);
    },
    [actions],
  );

  const isSlotBlocked = useCallback(
    (date: Date, time: string, staffId: string | null) => {
      if (!staffId) return false;
      const slotStart = new Date(
        formatMerchantDateTimeISO(format(date, "yyyy-MM-dd"), time),
      );
      const slotEnd = new Date(slotStart.getTime() + state.timeInterval * 60000);
      return state.blocks.some((block) => {
        if (block.staffId !== staffId) return false;
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);
        return blockStart < slotEnd && blockEnd > slotStart;
      });
    },
    [state.blocks, state.timeInterval],
  );

  // Handle time slot click
  const handleTimeSlotClick = useCallback(
    (date: Date, time: string, staffId: string | null) => {
      if (isBlockMode) {
        if (!staffId) {
          toast({
            title: "Select a staff column to block time",
            variant: "destructive",
          });
          return;
        }
        if (!blockSelection) {
          setBlockSelection({ date, time, staffId });
          return;
        }

        if (blockSelection.staffId !== staffId) {
          setBlockSelection({ date, time, staffId });
          return;
        }

        // Prevent selecting the same slot twice (would create invalid block)
        const startStr = format(blockSelection.date, "yyyy-MM-dd");
        const endStr = format(date, "yyyy-MM-dd");
        if (startStr === endStr && blockSelection.time === time) {
          toast({
            title: "Invalid selection",
            description: "Please select a different time slot to complete the block.",
            variant: "destructive",
          });
          return;
        }
        const startDateTime =
          startStr < endStr || (startStr === endStr && blockSelection.time <= time)
            ? `${startStr}T${blockSelection.time}:00`
            : `${format(date, "yyyy-MM-dd")}T${time}:00`;
        const endDateTime =
          startStr < endStr || (startStr === endStr && blockSelection.time <= time)
            ? `${format(date, "yyyy-MM-dd")}T${time}:00`
            : `${blockSelection.date.toISOString().split("T")[0]}T${blockSelection.time}:00`;

        apiClient
          .createStaffBlock(staffId, {
            startTime: startDateTime,
            endTime: endDateTime,
          })
          .then((res) => {
            // Optimistically add block so the UI reflects the change immediately
            const fallbackId =
              typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `temp-block-${Date.now()}`;
            const blockPayload = (res as any)?.block || (res as any)?.data?.block;
            const newBlock = {
              id:
                blockPayload?.id ||
                (res as any)?.id ||
                (res as any)?.data?.id ||
                fallbackId,
              staffId,
              startTime:
                blockPayload?.startTime ||
                (res as any)?.startTime ||
                (res as any)?.data?.startTime ||
                startDateTime,
              endTime:
                blockPayload?.endTime ||
                (res as any)?.endTime ||
                (res as any)?.data?.endTime ||
                endDateTime,
              reason:
                blockPayload?.reason ||
                (res as any)?.reason ||
                (res as any)?.data?.reason,
              locationId:
                blockPayload?.locationId ||
                (res as any)?.locationId ||
                (res as any)?.data?.locationId,
            };
            actions.addBlock(newBlock);

            if (res?.warning) {
              toast({
                title: "Block created with warnings",
                description: "Some existing bookings overlap this block.",
              });
            } else {
              toast({ title: "Block created", description: "Time blocked." });
            }
            setBlockSelection(null);
            // Refresh after a short delay to sync with server while keeping optimistic update visible
            setTimeout(() => refresh(), 500);
          })
          .catch((error) => {
            toast({
              title: "Failed to create block",
              description:
                error?.response?.data?.message || "Please try again.",
              variant: "destructive",
            });
            // Clear selection on error so user can try again
            setBlockSelection(null);
            // Refresh to recover from any state corruption
            refresh();
          });
        return;
      }

      if (isSlotBlocked(date, time, staffId)) {
        toast({
          title: "Blocked",
          description: "This time is blocked for the staff member.",
        });
        return;
      }
      // Set booking slide out data before opening
      const slideOutData = {
        date,
        time,
        staffId,
      };
      setBookingSlideOutData(slideOutData);
      actions.openBookingSlideOut();
    },
    [actions, isBlockMode, blockSelection, isSlotBlocked, toast, refresh],
  );

  // Memoize booking slide out callbacks to prevent infinite loops
  const handleBookingSlideOutClose = useCallback(() => {
    actions.closeBookingSlideOut();
    setBookingSlideOutData(null);
  }, [actions]);

  const handleBookingSlideOutSave = useCallback(
    async (bookingData: any) => {
      try {
        // Create booking via V2 API with correct format
        // CRITICAL: Resolve staff assignment before API call
        let finalStaffId: string;

        try {
          // Check if we already have a valid staff ID
          if (isValidStaffId(bookingData.staffId)) {
            finalStaffId = bookingData.staffId;
          } else {
            // Need to resolve "Next Available" or handle invalid staffId

            // Get the service to know the duration
            const service = state.services.find(
              (s) => s.id === bookingData.serviceId,
            );
            if (!service) {
              throw new Error(
                "Service not found. Please refresh and try again.",
              );
            }

            // Transform bookings for availability check
            const bookingsForAvailability = state.bookings.map((b) => {
              const startTime = new Date(`${b.date}T${b.time}`);
              const endTime = new Date(
                startTime.getTime() + b.duration * 60000,
              );
              return {
                ...b,
                startTime,
                endTime,
              };
            });

            // Get available staff with auto-assignment
            const availabilityResult = await getAvailableStaff(
              bookingData.serviceId,
              bookingData.startTime,
              service.duration,
              state.staff,
              bookingsForAvailability,
            );

            // Use the enhanced service to ensure valid staff ID
            finalStaffId = ensureValidStaffId(
              null,
              availabilityResult.assignedStaff,
            );
          }
        } catch (error) {
          // Enhanced error handling
          throw new Error(
            error instanceof Error
              ? error.message
              : "Unable to assign staff. Please select a specific staff member.",
          );
        }

        // Final validation - MUST have a valid UUID at this point
        if (!isValidStaffId(finalStaffId)) {
          throw new Error(
            "System error: Invalid staff assignment. Please try again.",
          );
        }

        // Handle walk-in customer creation if needed
        let finalCustomerId = bookingData.customerId;

        if (bookingData.isNewCustomer) {
          // For walk-in customers, check if we already have one
          if (bookingData.isWalkIn) {
            try {
              // Search for existing walk-in customer
              const searchResponse = await apiClient.searchCustomers("Walk-in");
              const customers = searchResponse?.data || [];
              const existingWalkInCustomer = customers.find(
                (customer: any) =>
                  customer.firstName === "Walk-in" ||
                  customer.source === "WALK_IN",
              );

              if (existingWalkInCustomer) {
                // Use existing walk-in customer
                finalCustomerId = existingWalkInCustomer.id;
              } else {
                // Create a single walk-in customer that can be reused
                const customerData = {
                  firstName: "Walk-in",
                  lastName: undefined, // No last name for walk-in
                  notes: "Shared walk-in customer account",
                  source: "WALK_IN",
                };

                const newCustomer =
                  await apiClient.createCustomer(customerData);
                finalCustomerId = newCustomer.id;

                // Update the local state with the new customer
                actions.setCustomers([
                  ...state.customers,
                  {
                    ...newCustomer,
                    name: "Walk-in",
                  },
                ]);
              }
            } catch (error) {
              throw new Error("Failed to process walk-in customer");
            }
          } else {
            // Regular new customer creation
            const nameParts = bookingData.customerName.split(" ");
            const customerData: any = {
              firstName: nameParts[0] || "Customer",
              lastName: nameParts.slice(1).join(" ") || undefined, // No default last name
              phone: bookingData.customerPhone || "",
              email: bookingData.customerEmail || undefined,
              notes: "",
            };

            const newCustomer = await apiClient.createCustomer(customerData);
            finalCustomerId = newCustomer.id;

            // Update the local state with the new customer
            actions.setCustomers([
              ...state.customers,
              {
                ...newCustomer,
                name: formatName(newCustomer.firstName, newCustomer.lastName),
              },
            ]);
          }
        }

        // Prepare the booking request data
        // Check if bookingData has services array (multi-service) or single serviceId
        let services = [];
        if (bookingData.services && Array.isArray(bookingData.services)) {
          // Multi-service booking from BookingSlideOut
          services = bookingData.services.map((service: any) => ({
            serviceId: service.serviceId,
            staffId: service.staffId || finalStaffId,
          }));
        } else if (bookingData.serviceId) {
          // Single service booking (legacy support)
          services = [
            {
              serviceId: bookingData.serviceId,
              staffId: finalStaffId,
            },
          ];
        }

        // LocationId is now optional in the database
        const locationId = merchant?.locations?.[0]?.id || merchant?.locationId;

        // BookingSlideOut now returns real booking data after successful creation

        // Transform the booking data for calendar display
        const startTime = new Date(bookingData.startTime);

        const hasServicesArray =
          Array.isArray(bookingData.services) && bookingData.services.length > 0;

        // Normalize services so multi-selection renders immediately without refresh
        const normalizedServices = hasServicesArray
          ? bookingData.services.map((service: any, index: number) => {
              const rawServiceId =
                service?.serviceId ??
                service?.id ??
                service?.service?.id ??
                null;
              const resolvedServiceId =
                rawServiceId !== null && rawServiceId !== undefined
                  ? String(rawServiceId)
                  : undefined;

              const resolvedName =
                service?.name ??
                service?.serviceName ??
                service?.service?.name ??
                bookingData.serviceName ??
                `Service ${index + 1}`;

              const parsedDuration =
                typeof service?.duration === "number"
                  ? service.duration
                  : Number(service?.duration) || 0;

              const parsedPrice =
                typeof service?.price === "number"
                  ? service.price
                  : Number(service?.price) || 0;

              return {
                ...service,
                id: service?.id ?? resolvedServiceId,
                serviceId: resolvedServiceId,
                name: resolvedName,
                duration: parsedDuration,
                price: parsedPrice,
              };
            })
          : undefined;

        const serviceNames =
          normalizedServices
            ?.map((service: any) => service.name)
            .filter(Boolean) ?? [];

        const totalDurationFromServices =
          normalizedServices?.reduce(
            (sum: number, service: any) => sum + (service.duration ?? 0),
            0,
          ) ?? 0;

        const totalPriceFromServices =
          normalizedServices?.reduce(
            (sum: number, service: any) => sum + (service.price ?? 0),
            0,
          ) ?? 0;

        const resolvedServiceId =
          bookingData.serviceId ??
          normalizedServices?.[0]?.serviceId ??
          normalizedServices?.[0]?.id ??
          null;

        const serviceId =
          resolvedServiceId !== null && resolvedServiceId !== undefined
            ? String(resolvedServiceId)
            : null;

        const serviceName =
          serviceNames.length > 1
            ? serviceNames.join(" + ")
            : serviceNames[0] ?? bookingData.serviceName ?? "Service";

        const duration =
          bookingData.totalDuration ??
          (hasServicesArray ? totalDurationFromServices : undefined) ??
          bookingData.duration ??
          0;

        const servicePrice =
          bookingData.totalPrice ??
          (hasServicesArray ? totalPriceFromServices : undefined) ??
          bookingData.servicePrice ??
          totalPriceFromServices ??
          0;

        const customerSource =
          bookingData.customerSource ||
          (bookingData.isWalkIn ? "WALK_IN" : null);
        const sourceInfo = mapBookingSource(bookingData.source, customerSource);

        const nowTimestamp = Date.now();
        const nowIso = new Date(nowTimestamp).toISOString();
        const createdAt = bookingData.createdAt ?? nowIso;
        const updatedAt = bookingData.updatedAt ?? nowIso;

        const transformedBooking = {
          id: bookingData.id,
          bookingNumber: bookingData.bookingNumber, // Include the booking number
          date: format(startTime, "yyyy-MM-dd"),
          time: format(startTime, "HH:mm"),
          duration: duration,
          // Normalize status to lowercase to match our BookingStatus type
          status: (
            bookingData.status || "confirmed"
          ).toLowerCase() as BookingStatus,
          customerId: bookingData.customerId,
          customerName: bookingData.customerName,
          customerPhone: bookingData.customerPhone || "",
          customerEmail: bookingData.customerEmail || "",
          customerSource,
          serviceId: serviceId,
          serviceName: serviceName,
          servicePrice: servicePrice,
          services: normalizedServices,
          staffId: bookingData.staffId ?? finalStaffId ?? null,
          staffName: bookingData.staffName || "Unassigned",
          notes: bookingData.notes || "",
          customerRequestedStaff: Boolean(bookingData.customerRequestedStaff),
          paymentStatus: bookingData.isPaid ? "paid" : "pending",
          createdAt,
          updatedAt,
          source: sourceInfo.raw,
          sourceCategory: sourceInfo.category,
          sourceLabel: sourceInfo.label,
          isLocalOnly: true,
          localOnlyExpiresAt: nowTimestamp + LOCAL_BOOKING_RETENTION_MS,
        };

        // Track this booking as locally created to prevent WebSocket refresh conflicts
        locallyCreatedBookings.current.add(transformedBooking.id);

        // Add the new booking to the calendar
        actions.addBooking(transformedBooking);
        actions.closeBookingSlideOut();

        // Broadcast the booking creation to other tabs
        bookingEvents.broadcast({
          type: "booking_created",
          bookingId: transformedBooking.id,
          source: "slideout",
        });

        // Dismiss loading toast if provided
        if (
          bookingData._dismissLoadingToast &&
          typeof bookingData._dismissLoadingToast === "function"
        ) {
          bookingData._dismissLoadingToast();
        }

        // Show success toast with icon
        toast({
          title: "Booking created successfully!",
          description: (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                {transformedBooking.customerName} •{" "}
                {format(startTime, "h:mm a")}
              </p>
              <p className="text-sm text-gray-500">
                {transformedBooking.serviceName} with{" "}
                {transformedBooking.staffName}
              </p>
            </div>
          ),
          variant: "default",
          className: "bg-green-50 border-green-200",
          duration: 5000,
        });
      } catch (error: any) {
        // Extract specific error message
        let errorMessage = "Please try again";
        if (error.response?.data?.message) {
          if (Array.isArray(error.response.data.message)) {
            // Validation errors from API
            errorMessage = error.response.data.message.join(", ");
          } else if (typeof error.response.data.message === "string") {
            errorMessage = error.response.data.message;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Show error toast with specific message
        toast({
          title: "Failed to create booking",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [actions],
  );

  // Sticky offset management
  const rootRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

  const updateStickyOffsets = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const topbar = document.querySelector(".topbar") as HTMLElement | null;
    const topbarHeight = topbar?.offsetHeight ?? 0;
    const headerHeight = headerRef.current?.offsetHeight ?? 0;
    const root = rootRef.current;

    if (root) {
      const offset = topbarHeight + headerHeight;
      root.style.setProperty("--calendar-topbar-offset", `${offset}px`);
      root.style.setProperty("--calendar-sticky-offset", `${offset}px`);
    }
  }, []);

  React.useLayoutEffect(() => {
    updateStickyOffsets();

    if (typeof window !== "undefined" && "ResizeObserver" in window) {
      const observer = new ResizeObserver(() => {
        updateStickyOffsets();
      });
      resizeObserverRef.current = observer;

      const observedElements: HTMLElement[] = [];
      if (headerRef.current) {
        observer.observe(headerRef.current);
        observedElements.push(headerRef.current);
      }
      const topbar = document.querySelector(".topbar");
      if (topbar instanceof HTMLElement) {
        observer.observe(topbar);
        observedElements.push(topbar);
      }

      return () => {
        observedElements.forEach((element) => observer.unobserve(element));
        observer.disconnect();
        resizeObserverRef.current = null;
      };
    }

    window.addEventListener("resize", updateStickyOffsets);
    return () => window.removeEventListener("resize", updateStickyOffsets);
  }, [updateStickyOffsets]);

  React.useEffect(() => {
    updateStickyOffsets();
  }, [
    updateStickyOffsets,
    currentView,
    state.staff.length,
    state.selectedStaffIds.length,
    state.showOnlyRosteredStaff,
    state.showUnassignedColumn,
    filtersOpen,
  ]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const booking = state.bookings.find((b) => b.id === active.id);
      if (booking) {
        setActiveBooking(booking);
        setIsDragging(true);
      }
    },
    [state.bookings],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;

      if (over && over.data.current?.date && over.data.current?.time) {
        const targetData = over.data.current;

        const staffMember = state.staff.find(
          (s) => s.id === targetData.staffId,
        );

        try {
          // Validate time format (should be HH:MM)
          const timeMatch = targetData.time.match(/^(\d{1,2}):(\d{2})$/);
          if (!timeMatch) {
            setDragOverSlot(null);
            return;
          }

          const [, hoursStr, minutesStr] = timeMatch;
          const hours = parseInt(hoursStr, 10);
          const minutes = parseInt(minutesStr, 10);

          // Create date from string (should be YYYY-MM-DD format)
          const startTime = new Date(targetData.date + "T00:00:00");
          if (isNaN(startTime.getTime())) {
            setDragOverSlot(null);
            return;
          }

          startTime.setHours(hours, minutes, 0, 0);

          setDragOverSlot({
            staffId: targetData.staffId || "unassigned",
            staffName: staffMember?.name || "Unassigned",
            startTime,
            endTime: new Date(startTime.getTime() + 30 * 60000), // 30 minutes later
          });
        } catch (error) {
          setDragOverSlot(null);
        }
      } else {
        setDragOverSlot(null);
      }
    },
    [state.staff],
  );

  // Handle drag end
  const handleDragEndEvent = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      // Clean up drag state
      setIsDragging(false);
      setActiveBooking(null);
      setDragOverSlot(null);

      if (!over || !active || !activeBooking) {
        return;
      }

      // Get drop data
      const dropData = over.data.current;
      if (!dropData || !dropData.date || !dropData.time) {
        return;
      }

      const { date, time, staffId } = dropData;

      // Check if dropped on the same slot (no actual move)
      let originalDate;
      try {
        // Handle both date string and Date object
        if (typeof activeBooking.date === "string") {
          originalDate = activeBooking.date;
        } else {
          originalDate = format(new Date(activeBooking.date), "yyyy-MM-dd");
        }
      } catch (error) {
        return;
      }

      const isSameSlot =
        originalDate === date &&
        activeBooking.time === time &&
        activeBooking.staffId === staffId;

      if (isSameSlot) {
        return;
      }

      try {
        await updateBookingTime(activeBooking.id, date, time, staffId ?? null);
      } catch (error) {}
    },
    [activeBooking, updateBookingTime],
  );

  return (
    <TooltipProvider>
      <div
        ref={rootRef}
        className="min-h-screen flex flex-col bg-gray-50"
        style={
          {
            "--calendar-topbar-offset": "120px",
            "--calendar-sticky-offset": "120px",
          } as React.CSSProperties
        }
      >
        {/* Dev mode timestamp */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-xs font-mono border-b border-yellow-300">
            🚀 FRESH BUILD • Calendar loaded at {new Date().toLocaleTimeString()} • Auto-save toast update active
          </div>
        )}
        {/* Header */}
        <div
          ref={headerRef}
          className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-3">
            {/* Left: View Selector */}
            <div className="flex flex-1 items-center gap-4 min-w-[260px]">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(["day", "week", "month"] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setView(view)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      currentView === view
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900",
                    )}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Center: Date Navigation */}
            <div className="flex items-center justify-center bg-gray-100 rounded-lg">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 rounded-l-lg rounded-r-none"
                    onClick={navigatePrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Previous {currentView}</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-w-[240px] h-8 px-4 py-1 hover:bg-gray-200 text-sm font-semibold text-gray-900"
                  >
                    {navigationLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto min-w-[288px] p-0 border border-gray-200 bg-white shadow-xl rounded-2xl"
                  align="center"
                >
                  <Calendar
                    className="rounded-2xl"
                    mode="single"
                    selected={state.currentDate}
                    onSelect={(date) => {
                      if (date) {
                        actions.setDate(date);
                        setDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                    classNames={{
                      months: "flex flex-col p-4",
                      month: "space-y-3",
                      caption: "flex items-center justify-between pb-2",
                      caption_label: "text-base font-semibold text-gray-900",
                      nav: "flex items-center gap-2",
                      nav_button:
                        "h-8 w-8 rounded-md border border-transparent bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700 focus-visible:ring-2 focus-visible:ring-teal-500 transition",
                      nav_button_previous: "relative -left-1",
                      nav_button_next: "relative -right-1",
                      table: "w-full border-collapse",
                      head_row:
                        "flex justify-between text-xs font-semibold uppercase tracking-wide text-gray-400 px-1",
                      head_cell: "w-10 text-center",
                      row: "flex justify-between px-1",
                      cell: "w-10 h-10 flex items-center justify-center",
                      day: cn(
                        "h-10 w-10 rounded-md font-medium text-sm text-gray-700 transition flex flex-col items-center justify-center leading-none",
                        "hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                        "aria-selected:bg-teal-600 aria-selected:text-white aria-selected:shadow-lg aria-selected:hover:bg-teal-600 aria-selected:hover:text-white",
                      ),
                      day_today:
                        "bg-teal-50 text-teal-700 border border-teal-200 rounded-md pt-[3px] pb-[6px]",
                      day_outside: "text-gray-300",
                      day_disabled: "text-gray-300 opacity-50",
                    }}
                    modifiers={{
                      today: new Date(),
                    }}
                    modifiersClassNames={{
                      today:
                        'relative after:content-["Today"] after:absolute after:-bottom-[2px] after:left-1/2 after:-translate-x-1/2 after:text-[10px] after:font-semibold after:tracking-wide after:text-teal-600 aria-selected:after:text-white',
                    }}
                  />
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-200 rounded-r-lg rounded-l-none"
                    onClick={navigateNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next {currentView}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-1 items-center justify-end gap-3 min-w-[280px] flex-wrap md:flex-nowrap">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-500" />
                <span>
                  {state.showOnlyRosteredStaff && state.currentView === "day"
                    ? `${rosteredStaffInfo.rosteredCount}/${rosteredStaffInfo.totalCount}`
                    : `${state.selectedStaffIds.filter((id) => state.staff.some((s) => s.id === id && s.isActive !== false)).length}/${rosteredStaffInfo.totalCount}`}{" "}
                  staff
                  {rosteredStaffInfo.hiddenCount > 0 &&
                    state.showOnlyRosteredStaff &&
                    state.currentView === "day" && (
                      <span className="text-gray-400 ml-1">
                        ({rosteredStaffInfo.hiddenCount} not rostered)
                      </span>
                    )}
                </span>
              </div>

              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 px-1.5 min-w-[20px]"
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                  <div className="p-4 space-y-4">
                    {/* Display Options */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">
                        Display Options
                      </h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={state.selectedStatusFilters.includes(
                              "pending",
                            )}
                            onCheckedChange={(checked) => {
                              const newFilters = checked
                                ? [...state.selectedStatusFilters, "pending"]
                                : state.selectedStatusFilters.filter(
                                    (s) => s !== "pending",
                                  );
                              actions.setStatusFilter(newFilters);
                            }}
                          />
                          <span className="flex-1">Show pending bookings</span>
                          <Badge variant="secondary" className="text-xs">
                            {
                              state.bookings.filter(
                                (b) => b.status === "pending",
                              ).length
                            }
                          </Badge>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={state.selectedStatusFilters.includes(
                              "completed",
                            )}
                            onCheckedChange={(checked) => {
                              const newFilters = checked
                                ? [...state.selectedStatusFilters, "completed"]
                                : state.selectedStatusFilters.filter(
                                    (s) => s !== "completed",
                                  );
                              actions.setStatusFilter(newFilters);
                            }}
                          />
                          <span className="flex-1">
                            Show completed bookings
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {
                              state.bookings.filter(
                                (b) => b.status === "completed",
                              ).length
                            }
                          </Badge>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={state.selectedStatusFilters.includes(
                              "cancelled",
                            )}
                            onCheckedChange={(checked) => {
                              const newFilters = checked
                                ? [...state.selectedStatusFilters, "cancelled"]
                                : state.selectedStatusFilters.filter(
                                    (s) => s !== "cancelled",
                                  );
                              actions.setStatusFilter(newFilters);
                            }}
                          />
                          <span className="flex-1">
                            Show cancelled bookings
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {
                              state.bookings.filter(
                                (b) => b.status === "cancelled",
                              ).length
                            }
                          </Badge>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={state.selectedStatusFilters.includes(
                              "no-show",
                            )}
                            onCheckedChange={(checked) => {
                              const newFilters = checked
                                ? [...state.selectedStatusFilters, "no-show"]
                                : state.selectedStatusFilters.filter(
                                    (s) => s !== "no-show",
                                  );
                              actions.setStatusFilter(newFilters);
                            }}
                          />
                          <span className="flex-1">Show no-show bookings</span>
                          <Badge variant="secondary" className="text-xs">
                            {
                              state.bookings.filter(
                                (b) => b.status === "no-show",
                              ).length
                            }
                          </Badge>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={state.selectedStatusFilters.includes(
                              "deleted",
                            )}
                            onCheckedChange={(checked) => {
                              const newFilters = checked
                                ? [...state.selectedStatusFilters, "deleted"]
                                : state.selectedStatusFilters.filter(
                                    (s) => s !== "deleted",
                                  );
                              actions.setStatusFilter(newFilters);
                            }}
                          />
                          <span className="flex-1">Show deleted bookings</span>
                          <Badge variant="secondary" className="text-xs">
                            {
                              state.bookings.filter(
                                (b) => b.status === "deleted",
                              ).length
                            }
                          </Badge>
                        </label>
                      </div>
                    </div>

                    <Separator />

                    {/* Staff Filter */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-gray-900">
                          Staff Members
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const activeStaff = state.staff.filter(
                                (s) => s.isActive !== false,
                              );
                              if (
                                state.selectedStaffIds.length ===
                                activeStaff.length
                              ) {
                                actions.setStaffFilter([]);
                              } else {
                                actions.setStaffFilter(
                                  activeStaff.map((s) => s.id),
                                );
                              }
                            }}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                          >
                            {state.selectedStaffIds.length ===
                            state.staff.filter((s) => s.isActive !== false)
                              .length
                              ? "Clear all"
                              : "Select all"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFiltersOpen(false);
                              setReorderDialogOpen(true);
                            }}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                            Reorder
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {state.staff
                          .filter((member) => member.isActive !== false)
                          .map((member) => (
                            <label
                              key={member.id}
                              className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2"
                            >
                              <Checkbox
                                checked={state.selectedStaffIds.includes(
                                  member.id,
                                )}
                                onCheckedChange={(checked) => {
                                  const newIds = checked
                                    ? [...state.selectedStaffIds, member.id]
                                    : state.selectedStaffIds.filter(
                                        (id) => id !== member.id,
                                      );
                                  actions.setStaffFilter(newIds);
                                }}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: member.color }}
                                />
                                <span>{member.name}</span>
                              </div>
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Auto-refresh indicator */}
              {isRefreshing && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Updating...</span>
                </div>
              )}

              {/* New booking button */}
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                size="sm"
                onClick={() => {
                  setBookingSlideOutData(null);
                  actions.openBookingSlideOut();
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Booking
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading calendar...</p>
              </div>
            </div>
          ) : state.error ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-destructive mb-4">{state.error}</p>
                <Button onClick={refresh}>Try Again</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              {currentView === "day" && (
                <DailyView
                  onBookingClick={handleBookingClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEndEvent}
                  activeBooking={activeBooking}
                  dragOverSlot={dragOverSlot}
                  isBlockMode={isBlockMode}
                  blockSelection={blockSelection}
                  enableBlocks={enableBlocks}
                  onBlockModeToggle={() => {
                    setIsBlockMode((prev) => !prev);
                    setBlockSelection(null);
                  }}
                />
              )}
              {currentView === "week" && (
                <WeeklyView onBookingClick={handleBookingClick} />
              )}
              {currentView === "month" && (
                <MonthlyView
                  onBookingClick={handleBookingClick}
                  onDayClick={(date) => {
                    actions.setDate(date);
                    actions.setView("day");
                  }}
                />
              )}
            </div>
          )}
        </div>

        <StaffReorderDialog
          open={reorderDialogOpen}
          onOpenChange={setReorderDialogOpen}
          staff={state.staff}
          onSave={handlePersistStaffOrder}
        />

        {/* Slide outs */}
        <BookingSlideOut
          isOpen={state.isBookingSlideOutOpen}
          onClose={handleBookingSlideOutClose}
          initialDate={bookingSlideOutData?.date}
          initialTime={initialTime}
          initialStaffId={bookingSlideOutData?.staffId || null}
          staff={memoizedStaff}
          services={memoizedServices}
          customers={memoizedCustomers}
          bookings={state.bookings}
          onSave={handleBookingSlideOutSave}
          merchant={merchant}
        />

        {state.isDetailsSlideOutOpen &&
          state.detailsBookingId &&
          (() => {
            const booking = state.bookings.find(
              (b) => b.id === state.detailsBookingId,
            );
            if (!booking) return null;

            // CRITICAL: Detect mismatch between service name and services array
            const hasMultiServiceName = booking.serviceName?.includes(" + ");
            const servicesCount = booking.services?.length || 0;

            if (hasMultiServiceName && servicesCount <= 1) {
              // Data mismatch: multi-service name but fewer services in state
            }

            return (
              <BookingDetailsSlideOut
                key={`booking-details-${booking.id}`}
                isOpen={state.isDetailsSlideOutOpen}
                onClose={() => actions.closeDetailsSlideOut()}
                booking={{
                  id: booking.id,
                  bookingNumber: booking.bookingNumber, // Include the booking number
                  customerId: booking.customerId,
                  customerName: booking.customerName,
                  customerPhone: booking.customerPhone || "",
                  customerEmail: booking.customerEmail,
                  serviceName: booking.serviceName,
                  serviceId: booking.serviceId,
                  services: booking.services,
                  staffName: booking.staffName,
                  staffId: booking.staffId || "",
                  startTime: new Date(`${booking.date}T${booking.time}`),
                  endTime: new Date(
                    new Date(`${booking.date}T${booking.time}`).getTime() +
                      (booking.duration || 60) * 60000,
                  ),
                  duration: booking.duration,
                  status: booking.status,
                  isPaid:
                    booking.paymentStatus === "PAID" ||
                    booking.paymentStatus === "paid",
                  totalPrice: booking.servicePrice,
                  paidAmount: booking.paidAmount,
                  notes: booking.notes,
                  sourceLabel: booking.sourceLabel,
                  sourceCategory: booking.sourceCategory,
                  source: booking.source,
                  customerSource: booking.customerSource,
                }}
                staff={memoizedStaff}
                services={memoizedServices}
                customers={memoizedCustomers}
                onSave={async (updatedBooking) => {
                  // Log the received update payload
                  if (window.dispatchEvent) {
                    window.dispatchEvent(
                      new CustomEvent("calendar-activity-log", {
                        detail: {
                          type: "calendar-onsave-received",
                          message: `CalendarPage onSave received update for booking ${state.detailsBookingId}`,
                          data: {
                            bookingId: state.detailsBookingId,
                            services: updatedBooking.services,
                            servicesCount: updatedBooking.services?.length || 0,
                          },
                          timestamp: new Date().toISOString(),
                        },
                      }),
                    );
                  }

                  const originalBooking = state.bookings.find(
                    (b) => b.id === state.detailsBookingId,
                  );
                  if (!originalBooking) return;

                  // Parse the UTC time and convert to local date/time for display
                  const utcDate = new Date(updatedBooking.startTime);
                  // Get the local date string in YYYY-MM-DD format
                  const year = utcDate.getFullYear();
                  const month = String(utcDate.getMonth() + 1).padStart(2, "0");
                  const day = String(utcDate.getDate()).padStart(2, "0");
                  const localDateStr = `${year}-${month}-${day}`;

                  // Get the local time in HH:mm format
                  const hours = String(utcDate.getHours()).padStart(2, "0");
                  const minutes = String(utcDate.getMinutes()).padStart(2, "0");
                  const localTimeStr = `${hours}:${minutes}`;

                  // 1. OPTIMISTIC UPDATE - Update UI immediately
                  // Calculate total price and duration from services
                  const totalPrice =
                    updatedBooking.services?.reduce(
                      (sum: number, s: any) => sum + (s.price || 0),
                      0,
                    ) || originalBooking.servicePrice;
                  const totalDuration =
                    updatedBooking.services?.reduce(
                      (sum: number, s: any) => sum + (s.duration || 0),
                      0,
                    ) || originalBooking.duration;

                  // Calculate service name for display (join multiple services)
                  const serviceName =
                    updatedBooking.services &&
                    updatedBooking.services.length > 0
                      ? updatedBooking.services
                          .map((s: any) => s.name)
                          .join(" + ")
                      : originalBooking.serviceName;

                  // Get the staff name from the staff list
                  const selectedStaff = memoizedStaff.find(
                    (s) => s.id === updatedBooking.staffId,
                  );
                  const staffName =
                    selectedStaff?.name ||
                    updatedBooking.staffName ||
                    originalBooking.staffName;

                  actions.updateBooking(state.detailsBookingId!, {
                    date: localDateStr,
                    time: localTimeStr,
                    staffId: updatedBooking.staffId,
                    staffName: staffName,
                    notes: updatedBooking.notes,
                    services: updatedBooking.services,
                    serviceName: serviceName,
                    servicePrice: totalPrice,
                    duration: totalDuration,
                    customerRequestedStaff: Boolean(
                      updatedBooking.customerRequestedStaff,
                    ),
                    customerId:
                      updatedBooking.customerId ?? originalBooking.customerId,
                    customerName:
                      updatedBooking.customerName ??
                      originalBooking.customerName,
                    customerPhone:
                      updatedBooking.customerPhone ??
                      originalBooking.customerPhone,
                    customerEmail:
                      updatedBooking.customerEmail ??
                      originalBooking.customerEmail,
                  });

                  try {
                    const originalStartTime = new Date(
                      `${originalBooking.date}T${originalBooking.time}`,
                    );
                    const newStartTime =
                      typeof updatedBooking.startTime === "string"
                        ? new Date(updatedBooking.startTime)
                        : updatedBooking.startTime;
                    const timeChanged =
                      originalStartTime.getTime() !== newStartTime.getTime();
                    const staffChanged =
                      originalBooking.staffId !== updatedBooking.staffId;
                    const servicesChanged =
                      JSON.stringify(originalBooking.services) !==
                      JSON.stringify(updatedBooking.services);
                    const notesChanged =
                      originalBooking.notes !== updatedBooking.notes;
                    const preferredChanged =
                      Boolean(originalBooking.customerRequestedStaff) !==
                      Boolean(updatedBooking.customerRequestedStaff);
                    const customerChanged =
                      typeof updatedBooking.customerId !== "undefined" &&
                      updatedBooking.customerId !== originalBooking.customerId;

                    let mappedServices: any[] | undefined;

                    if (servicesChanged) {
                      // Use updateBooking API which supports all fields including services

                      // Log service mapping for debugging
                      mappedServices = updatedBooking.services?.map(
                        (s: any) => ({
                          serviceId: s.serviceId || s.id, // Use serviceId if available, fallback to id
                          staffId: s.staffId || updatedBooking.staffId,
                          price: s.price || s.adjustedPrice, // Support both field names
                          duration: s.duration,
                        }),
                      );

                      // Comprehensive logging for all updates
                      if (window.dispatchEvent) {
                        window.dispatchEvent(
                          new CustomEvent("calendar-activity-log", {
                            detail: {
                              type: "api-call-prepare",
                              message: `Preparing API call to update booking ${state.detailsBookingId}`,
                              data: {
                                bookingId: state.detailsBookingId,
                                mappedServices: mappedServices,
                                originalServices: updatedBooking.services,
                                servicesCount: mappedServices?.length || 0,
                                payload: {
                                  startTime: updatedBooking.startTime,
                                  staffId: updatedBooking.staffId,
                                  services: mappedServices,
                                  notes: updatedBooking.notes,
                                },
                              },
                              timestamp: new Date().toISOString(),
                            },
                          }),
                        );
                      }

                      // Validate services before sending
                      if (mappedServices?.some((s) => !s.serviceId)) {
                        toast({
                          title: "Error",
                          description:
                            "Invalid service data. Please try editing the booking again.",
                          variant: "destructive",
                        });
                        // Don't send the update if service IDs are invalid
                        return;
                      }
                    }

                    const updatePayload: Record<string, any> = {};
                    if (timeChanged) {
                      updatePayload.startTime = updatedBooking.startTime;
                    }
                    if (staffChanged) {
                      updatePayload.staffId = updatedBooking.staffId;
                    }
                    if (servicesChanged && mappedServices) {
                      updatePayload.services = mappedServices;
                    }
                    if (notesChanged) {
                      updatePayload.notes = updatedBooking.notes;
                    }
                    if (preferredChanged) {
                      updatePayload.customerRequestedStaff = Boolean(
                        updatedBooking.customerRequestedStaff,
                      );
                    }
                    if (customerChanged) {
                      updatePayload.customerId = updatedBooking.customerId;
                    }

                    if (Object.keys(updatePayload).length > 0) {
                      await apiClient.updateBooking(
                        state.detailsBookingId!,
                        updatePayload,
                      );
                    }

                    // DON'T refresh from server - it returns old single-service format
                    // and overwrites our multi-service data
                    // The optimistic update already has the correct data

                    // Optional: If we need to refresh payment status, do it separately
                    // without overwriting the services data

                    // Show detailed success toast
                    const updatedTime = new Date(updatedBooking.startTime);
                    const formattedTime = format(updatedTime, "h:mm a");
                    const formattedDate = format(updatedTime, "MMM d, yyyy");

                    const changeMessages: React.ReactNode[] = [];
                    if (timeChanged) {
                      changeMessages.push(
                        <p key="time" className="text-sm text-gray-600">
                          New time: {formattedDate} at {formattedTime}
                        </p>,
                      );
                    }
                    if (staffChanged) {
                      changeMessages.push(
                        <p key="staff" className="text-sm text-gray-600">
                          Assigned to {staffName}.
                        </p>,
                      );
                    }
                    if (servicesChanged) {
                      changeMessages.push(
                        <p key="services" className="text-sm text-gray-600">
                          Services updated.
                        </p>,
                      );
                    }
                    if (preferredChanged) {
                      changeMessages.push(
                        <p key="preferred" className="text-sm text-gray-600">
                          Preferred staff{" "}
                          {Boolean(updatedBooking.customerRequestedStaff)
                            ? "enabled"
                            : "disabled"}
                          .
                        </p>,
                      );
                    }
                    if (customerChanged) {
                      changeMessages.push(
                        <p key="customer" className="text-sm text-gray-600">
                          Customer updated to{" "}
                          {updatedBooking.customerName ?? "selected customer"}.
                        </p>,
                      );
                    }
                    if (notesChanged) {
                      changeMessages.push(
                        <p key="notes" className="text-sm text-gray-600">
                          Notes updated.
                        </p>,
                      );
                    }

                    if (changeMessages.length === 0) {
                      changeMessages.push(
                        <p key="default" className="text-sm text-gray-600">
                          Booking details saved.
                        </p>,
                      );
                    }

                    toast({
                      title: "Booking updated",
                      description: (
                        <div className="space-y-1">
                          <p>
                            {(() => {
                              const customerLabel =
                                updatedBooking.customerName ??
                                booking.customerName;
                              return customerLabel
                                ? `${customerLabel}'s booking has been updated.`
                                : "Booking has been updated.";
                            })()}
                          </p>
                          {changeMessages}
                        </div>
                      ),
                      variant: "default",
                      className: "bg-green-50 border-green-200",
                      duration: 5000,
                    });

                    // Trigger notification refresh after a delay
                    setTimeout(() => {
                      refreshNotifications();
                    }, 2000);
                  } catch (error) {
                    // 3. ROLLBACK on error - restore original booking data
                    actions.updateBooking(state.detailsBookingId!, {
                      date: originalBooking.date,
                      time: originalBooking.time,
                      staffId: originalBooking.staffId,
                      staffName: originalBooking.staffName,
                      notes: originalBooking.notes,
                      customerId: originalBooking.customerId,
                      customerName: originalBooking.customerName,
                      customerPhone: originalBooking.customerPhone,
                      customerEmail: originalBooking.customerEmail,
                    });

                    toast({
                      title: "Error",
                      description: "Failed to update booking",
                      variant: "destructive",
                    });

                    // Re-throw to let slideout know save failed
                    throw error;
                  }
                }}
                onDelete={async (bookingId) => {
                  addActivityLog(
                    "user",
                    `Delete requested for booking ${bookingId}`,
                  );

                  try {
                    // Find the booking details before deletion
                    const booking = state.bookings.find(
                      (b) => b.id === bookingId,
                    );
                    addActivityLog(
                      "state",
                      `Deleting booking: ${booking?.customerName} - ${booking?.serviceName}`,
                    );

                    // Call the delete API endpoint (moves to recycle bin with status DELETED)
                    addActivityLog(
                      "api",
                      `Calling DELETE /api/v2/bookings/${bookingId} - Moving to recycle bin`,
                    );
                    await apiClient.deleteBooking(bookingId);

                    addActivityLog(
                      "api",
                      `Booking ${bookingId} moved to recycle bin (status: DELETED, auto-purge after 30 days)`,
                    );

                    // Remove from local state to hide it from the calendar
                    // The booking will be filtered out from any refresh for 30 seconds
                    actions.removeBooking(bookingId);
                    actions.closeDetailsSlideOut();

                    addActivityLog(
                      "state",
                      `Booking ${bookingId} removed from calendar view and added to deletion buffer`,
                    );

                    toast({
                      title: "Booking deleted",
                      description:
                        "The booking has been moved to the recycle bin and will be permanently deleted after 30 days",
                    });

                    // Refresh in background to sync with server
                    setTimeout(async () => {
                      addActivityLog(
                        "state",
                        `Starting background refresh after deletion`,
                      );
                      await refresh();
                      addActivityLog(
                        "state",
                        `Background refresh completed - deleted bookings filtered out for 30 seconds`,
                      );
                    }, 1000);
                  } catch (error: any) {
                    addActivityLog(
                      "error",
                      `Failed to delete booking: ${error?.message || "Unknown error"}`,
                    );

                    toast({
                      title: "Error",
                      description: `Failed to delete booking: ${error?.message || "Please try again"}`,
                      variant: "destructive",
                    });
                  }
                }}
                onStatusChange={async (bookingId, status) => {
                  addActivityLog(
                    "user",
                    `Status change requested for booking ${bookingId}: ${status}`,
                  );

                  try {
                    // Find current booking state
                    const currentBooking = state.bookings.find(
                      (b) => b.id === bookingId,
                    );
                    addActivityLog(
                      "state",
                      `Current booking status: ${currentBooking?.status || "not found"}`,
                    );

                    // Use proper API endpoints for status changes
                    // NOTE: BookingActions sends uppercase status values (CONFIRMED, CANCELLED, etc)
                    addActivityLog(
                      "api",
                      `Calling API to update status to: ${status}`,
                    );

                    switch (status) {
                      case "IN_PROGRESS":
                      case "in-progress":
                        await apiClient.startBooking(bookingId);
                        break;
                      case "COMPLETED":
                      case "completed":
                        await apiClient.completeBooking(bookingId);
                        break;
                      case "CANCELLED":
                      case "cancelled":
                        await apiClient.cancelBooking(
                          bookingId,
                          "Cancelled by user",
                        );
                        break;
                      default:
                        // For other status changes (CONFIRMED, NO_SHOW), use the general update endpoint
                        await apiClient.updateBooking(bookingId, { status });
                    }

                    addActivityLog("api", `API call completed successfully`);

                    // Transform status to lowercase for local state (UI expects lowercase)
                    const localStatus = status.toLowerCase().replace(/_/g, "-");

                    // OPTIMISTIC UPDATE: Update the booking status immediately in local state
                    addActivityLog(
                      "state",
                      `Applying optimistic update - setting status to: ${localStatus}`,
                    );
                    addActivityLog(
                      "state",
                      `Status will be preserved for 15 seconds during refreshes`,
                    );

                    // Update the booking status in local state
                    actions.updateBooking(bookingId, {
                      status: localStatus as any,
                    });

                    toast({
                      title: "Status updated",
                      description: `Booking marked as ${localStatus.replace("-", " ")}`,
                      variant: "default",
                      className: "bg-green-50 border-green-200",
                    });

                    // DISABLED: This close/reopen was causing multi-service bookings to revert
                    // The optimistic update in the calendar state is sufficient
                    // if (state.isDetailsSlideOutOpen) {
                    //   const currentBookingId = bookingId;
                    //   actions.closeDetailsSlideOut();
                    //
                    //   // Reopen immediately with updated data
                    //   setTimeout(() => {
                    //     actions.openDetailsSlideOut(currentBookingId);
                    //   }, 100);
                    // }

                    // Refresh in background (don't wait for it)
                    addActivityLog("state", `Starting background refresh`);
                    setTimeout(async () => {
                      // Refresh to sync with server state
                      await refresh();
                      addActivityLog(
                        "state",
                        `Background refresh completed - status update preserved`,
                      );
                    }, 1000);
                  } catch (error: any) {
                    addActivityLog(
                      "error",
                      `Status update failed: ${error?.message || "Unknown error"}`,
                    );

                    // Extract error message
                    let errorMessage = "Failed to update booking status";
                    if (error?.message) {
                      errorMessage = error.message;
                    } else if (error?.response?.data?.message) {
                      errorMessage = error.response.data.message;
                    }

                    toast({
                      title: "Error",
                      description: errorMessage,
                      variant: "destructive",
                    });
                  }
                }}
                onPaymentStatusChange={async (
                  bookingId,
                  isPaid,
                  paidAmount,
                ) => {
                  // Find the booking in state to log its current status
                  const currentBooking = state.bookings.find(
                    (b) => b.id === bookingId,
                  );

                  try {
                    if (isPaid) {
                      // Mark as paid - call API
                      toast({
                        title: "Processing payment...",
                        description:
                          "Please wait while we mark this booking as paid.",
                      });

                      const result = await apiClient.markBookingAsPaid(
                        bookingId,
                        "CASH",
                      );

                      if (result.success) {
                        // Update local state immediately with all payment fields
                        // Use the paidAmount passed from payment dialog if available
                        const finalPaidAmount =
                          paidAmount ||
                          result.booking?.paidAmount ||
                          currentBooking?.totalPrice ||
                          currentBooking?.servicePrice;

                        actions.updateBooking(bookingId, {
                          paymentStatus: "PAID",
                          isPaid: true,
                          paidAmount: finalPaidAmount,
                          servicePrice: finalPaidAmount, // Update servicePrice to reflect actual amount paid
                        });

                        toast({
                          title: "Payment recorded",
                          description:
                            "Booking has been marked as paid successfully.",
                          variant: "default",
                          className: "bg-green-50 border-green-200",
                        });

                        // Also refresh from server to ensure consistency
                        setTimeout(() => {
                          refresh();
                        }, 1000);
                      } else {
                        throw new Error(
                          result.message || "Failed to mark as paid",
                        );
                      }
                    } else {
                      // For unpaid, just update local state (no API endpoint for this yet)
                      actions.updateBooking(bookingId, {
                        paymentStatus: "unpaid",
                      });

                      toast({
                        title: "Payment status updated",
                        description: "Booking has been marked as unpaid.",
                      });
                    }
                  } catch (error: any) {
                    // Handle API errors properly - check all possible error formats
                    let errorMessage = "Failed to update payment status";

                    // Try different ways to get the error message
                    if (typeof error === "string") {
                      errorMessage = error;
                    } else if (error?.message) {
                      // BaseApiClient transformed error OR regular Error
                      errorMessage = error.message;
                    } else if (error?.data?.message) {
                      // Transformed error with data
                      errorMessage = error.data.message;
                    } else if (error?.response?.data?.message) {
                      // Original axios error
                      errorMessage = error.response.data.message;
                    } else if (error?.originalError?.response?.data?.message) {
                      // Nested transformed error
                      errorMessage = error.originalError.response.data.message;
                    } else {
                      // Last resort - stringify the error
                      try {
                        errorMessage = JSON.stringify(error);
                      } catch {
                        errorMessage =
                          "An unknown error occurred. Check console for details.";
                      }
                    }

                    toast({
                      title: "Failed to update payment status",
                      description: errorMessage,
                      variant: "destructive",
                    });
                  }
                }}
              />
            );
          })()}
      </div>

      {/* Development Activity Log */}
      {process.env.NODE_ENV === "development" && (
        <>
          {/* Minimized State */}
          {isActivityLogMinimized ? (
            <div className="fixed bottom-4 right-4 z-50">
              <button
                onClick={() => setIsActivityLogMinimized(false)}
                className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
              >
                <ChevronUp className="h-4 w-4" />
                Activity Log ({activityLog.length})
              </button>
            </div>
          ) : (
            /* Expanded State */
            <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden z-50">
              <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
                <h3 className="text-sm font-semibold">Calendar Activity Log</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivityLog([])}
                    className="text-xs hover:text-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsActivityLogMinimized(true)}
                    className="hover:text-gray-300"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-80 p-2 space-y-1 bg-gray-50">
                {activityLog.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No activity yet
                  </div>
                ) : (
                  activityLog.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-xs p-2 rounded border",
                        log.type === "event" && "bg-blue-50 border-blue-200",
                        log.type === "api" && "bg-green-50 border-green-200",
                        log.type === "state" &&
                          "bg-yellow-50 border-yellow-200",
                        log.type === "error" && "bg-red-50 border-red-200",
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-mono text-gray-500">
                            {log.timestamp}
                          </span>
                          <span
                            className={cn(
                              "ml-2 font-semibold",
                              log.type === "event" && "text-blue-700",
                              log.type === "api" && "text-green-700",
                              log.type === "state" && "text-yellow-700",
                              log.type === "error" && "text-red-700",
                            )}
                          >
                            [{log.type.toUpperCase()}]
                          </span>
                          <div className="mt-1">{log.message}</div>
                          {log.detail && (
                            <div className="mt-1 text-gray-600 font-mono text-xs">
                              {JSON.stringify(log.detail, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </TooltipProvider>
  );
}
