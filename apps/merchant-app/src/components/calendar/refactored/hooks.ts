import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCalendar } from './CalendarProvider';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';
import { useAuth } from '@/lib/auth/auth-provider';
import { formatName } from '@heya-pos/utils';
import { toMerchantTime, formatInMerchantTime, formatMerchantDateTimeISO } from '@/lib/date-utils';
import { 
  startOfDay, 
  endOfDay, 
  addMinutes, 
  addDays,
  isBefore, 
  isAfter,
  parseISO,
  format
} from 'date-fns';
import type { Booking, Service, TimeSlot } from './types';
import { bookingEvents } from '@/lib/services/booking-events';
import { mapBookingSource } from '@/lib/booking-source';
import {
  mapApiServicesToRecords,
  mapApiCategoriesToRecords,
} from '@/lib/normalizers/service';

const isBlocksEnabled = (merchant: any): boolean => {
  if (merchant?.settings && merchant.settings.enableCalendarBlocks !== undefined) {
    return Boolean(merchant.settings.enableCalendarBlocks);
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('merchant') || '{}');
      if (stored?.settings?.enableCalendarBlocks !== undefined) {
        return Boolean(stored.settings.enableCalendarBlocks);
      }
    } catch {
      // ignore
    }
  }
  // Default to false - block feature requires explicit enablement
  return false;
};

export const timeStringToMinutes = (time: string): number => {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
};

export const minutesToTimeString = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const responseData = (error as any).response?.data;
    if (responseData) {
      if (typeof responseData.message === 'string') {
        return responseData.message;
      }
      if (Array.isArray(responseData.message) && responseData.message.length > 0) {
        return responseData.message[0];
      }
      if (typeof responseData.error === 'string') {
        return responseData.error;
      }
    }
    if (typeof (error as any).message === 'string') {
      return (error as any).message;
    }
  }
  return 'Failed to update booking. Please try again.';
};

// Hook for fetching calendar data
export function useCalendarData() {
  const { state, actions } = useCalendar();
  const { toast } = useToast();
  const { merchant } = useAuth();
  
  // Fetch bookings for current date range
  const fetchBookings = useCallback(async () => {
    // Dispatch event for logging
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calendar-fetch-bookings', {
        detail: { timestamp: new Date().toISOString() }
      }));
    }
    
    try {
      actions.setLoading(true);
      
      // Convert dates to local date strings for API
      const startDate = format(state.dateRange.start, 'yyyy-MM-dd');
      const endDate = format(state.dateRange.end, 'yyyy-MM-dd');
      
      
      // For day view, use date parameter instead of startDate/endDate
      const params = state.currentView === 'day' 
        ? { date: startDate }
        : { startDate, endDate };
      
      const response = await apiClient.getBookings(params);
      
      // Log how many bookings were returned and their statuses
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const statusCounts = response.reduce((acc: any, booking: any) => {
          acc[booking.status] = (acc[booking.status] || 0) + 1;
          return acc;
        }, {});
        
        window.dispatchEvent(new CustomEvent('calendar-activity-log', {
          detail: {
            type: 'api',
            message: `Fetched ${response.length} bookings: ${JSON.stringify(statusCounts)} (recent updates will be preserved)`,
            timestamp: new Date().toISOString()
          }
        }));
      }
      
      // Transform bookings to calendar format
      const transformedBookings = response.map((booking: any) => {
        // Extract date and time from startTime
        const startTime = new Date(booking.startTime);
        const endTimeRaw = booking.endTime ? new Date(booking.endTime) : null;
        const durationFromTimestamps = startTime instanceof Date
          && !Number.isNaN(startTime.getTime())
          && endTimeRaw instanceof Date
          && !Number.isNaN(endTimeRaw.getTime())
            ? Math.max(0, Math.round((endTimeRaw.getTime() - startTime.getTime()) / 60000))
            : 0;
        const date = format(startTime, 'yyyy-MM-dd');
        const time = format(startTime, 'HH:mm');

        // Debug logging for status transformation
        const originalStatus = booking.status;
        const transformedStatus = booking.status ? 
          ((booking.status === 'COMPLETE' || booking.status === 'COMPLETED') ? 'completed' : 
           booking.status.toLowerCase().replace(/_/g, '-')) : 
          'confirmed';

        const customerSource = booking.customerSource || booking.customer?.source || null;
        const sourceInfo = mapBookingSource(booking.source, customerSource);

        const servicesDuration = Array.isArray(booking.services)
          ? booking.services.reduce(
              (sum: number, service: any) =>
                sum + (typeof service.duration === 'number' ? service.duration : Number(service.duration) || 0),
              0,
            )
          : 0;

        const durationFallback = typeof booking.duration === 'number'
          ? booking.duration
          : typeof booking.duration === 'string'
            ? Number.parseInt(booking.duration, 10)
            : Number(booking.totalDuration) || servicesDuration || 60;

        const normalizedDuration = durationFromTimestamps > 0
          ? durationFromTimestamps
          : durationFallback > 0
            ? durationFallback
            : 60;

        return {
          id: booking.id,
          bookingNumber: booking.bookingNumber, // Include the booking number
          date,
          time,
          duration: normalizedDuration,
          // Ensure status is always lowercase for consistent filtering
          status: transformedStatus,
          
          // Customer info
          customerId: booking.customerId,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          customerEmail: booking.customerEmail,
          customerSource,
          
          // Service info
          serviceId: booking.serviceId || booking.services?.[0]?.serviceId || '',
          serviceName: booking.serviceName,
          servicePrice: booking.servicePrice ?? booking.price ?? booking.totalAmount,
          services: booking.services, // Store the full services array for multi-service support
          
          // Staff info - normalize all falsy values to null (including empty strings)
          staffId: (booking.staffId && booking.staffId !== '') ? booking.staffId : 
                   (booking.providerId && booking.providerId !== '') ? booking.providerId : null,
          staffName: booking.staffName || booking.providerName || 'Unassigned',
          customerRequestedStaff: Boolean(booking.customerRequestedStaff),
          
          // Additional fields
          notes: booking.notes,
          internalNotes: booking.internalNotes,
          paymentStatus: booking.paymentStatus,
          isPaid: booking.isPaid,
          paidAmount: booking.paidAmount,
          source: sourceInfo.raw,
          sourceCategory: sourceInfo.category,
          sourceLabel: sourceInfo.label,

          // Timestamps
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
          completedAt: booking.completedAt,
        };
      });
      
      actions.setBookings(transformedBookings);
    } catch (error) {
      actions.setError('Failed to load bookings');
      toast({
        title: 'Error',
        description: 'Failed to load bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      actions.setLoading(false);
    }
  }, [state.dateRange, state.currentView, actions, toast]);
  
  // Fetch blocks for visible staff within current date range
  const fetchBlocks = useCallback(async () => {
    if (!isBlocksEnabled(merchant)) {
      actions.setBlocks([]);
      return;
    }

    const staffIds = state.staff.map((s) => s.id);
    if (staffIds.length === 0) {
      actions.setBlocks([]);
      return;
    }

    const startDate = format(state.dateRange.start, 'yyyy-MM-dd');
    // API expects endDate to be strictly after startDate, so use exclusive upper bound
    const endDate = format(addDays(state.dateRange.end, 1), 'yyyy-MM-dd');

    try {
      const results = await Promise.all(
        staffIds.map(async (staffId) => {
          try {
            const res = await apiClient.listStaffBlocks(staffId, {
              startDate,
              endDate,
            });
            const blocks = Array.isArray(res?.blocks) ? res.blocks : res?.data?.blocks || res;
            return Array.isArray(blocks)
              ? blocks.map((b: any) => ({ ...b, staffId }))
              : [];
          } catch (error) {
            return [];
          }
        })
      );

      const flattened = results.flat();
      actions.setBlocks(flattened);
    } catch (error) {
      // Ignore block fetch errors to avoid disrupting calendar
    }
  }, [merchant, state.staff, state.dateRange, actions]);
  
  // Keep a ref to the latest fetchBookings function
  const fetchBookingsRef = useRef(fetchBookings);
  useEffect(() => {
    fetchBookingsRef.current = fetchBookings;
  }, [fetchBookings]);
  
  
  // Fetch services data
  const fetchServices = useCallback(async () => {
    try {
      const [servicesResponse, categoriesResponse] = await Promise.all([
        apiClient.getServices({ limit: 500, isActive: true }),
        apiClient.getCategories().catch(() => undefined),
      ]);

      const serviceRecords = mapApiServicesToRecords(servicesResponse?.data ?? []);
      const categoryRecords = mapApiCategoriesToRecords(categoriesResponse ?? []);

      if (!Array.isArray(serviceRecords) || serviceRecords.length === 0) {
        actions.setServices([]);
        return;
      }

      const sanitizeColor = (value: unknown): string | undefined => {
        if (typeof value !== 'string') {
          return undefined;
        }

        const trimmed = value.trim();
        if (!trimmed) {
          return undefined;
        }

        const lowered = trimmed.toLowerCase();
        if (['auto', 'automatic', 'inherit', 'default', 'none'].includes(lowered)) {
          return undefined;
        }

        return trimmed;
      };

      const categoryColorById = new Map<string, string>();
      const categoryColorByName = new Map<string, string>();
      categoryRecords.forEach(record => {
        const categoryId = typeof record.id === 'string' ? record.id : String(record.id);
        const colorCandidate =
          sanitizeColor((record as any)?.color) ??
          sanitizeColor((record as any)?.style?.color) ??
          sanitizeColor((record as any)?.theme?.color);
        const categoryName = typeof record.name === 'string' ? record.name.trim() : undefined;

        if (categoryId && colorCandidate) {
          categoryColorById.set(categoryId, colorCandidate);
        }

        if (categoryName && colorCandidate) {
          categoryColorByName.set(categoryName.toLowerCase(), colorCandidate);
        }
      });

      const transformedServices: Service[] = serviceRecords.map(rawService => {
        const service: any = rawService;
        const id = typeof service.id === 'string' ? service.id : String(service.id);

        const categoryId =
          typeof service.categoryId === 'string' && service.categoryId.trim().length > 0
            ? service.categoryId
            : service.categoryId
              ? String(service.categoryId)
              : '';

        const categoryName =
          typeof service.categoryName === 'string' && service.categoryName.trim().length > 0
            ? service.categoryName.trim()
            : 'General';

        const categoryColor =
          sanitizeColor(service.categoryColor) ??
          (categoryId ? categoryColorById.get(categoryId) : undefined) ??
          categoryColorByName.get(categoryName.toLowerCase());

        const directColor =
          sanitizeColor(service.color) ??
          sanitizeColor(service.displayColor) ??
          sanitizeColor(service.primaryColor);

        return {
          ...service,
          id,
          categoryId,
          categoryName,
          categoryColor: categoryColor ?? undefined,
          color: directColor ?? categoryColor ?? service.color,
        } satisfies Service;
      });

      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        (window as any).__calendarServiceCatalog = {
          services: transformedServices,
          categories: categoryRecords,
        };
      }
      actions.setServices(transformedServices);
    } catch (error) {
    }
  }, [actions]);
  
  // Fetch customers data
  const fetchCustomers = useCallback(async () => {
    try {
      // Just fetch recent customers for quick access (20 is enough since we have search)
      const response = await apiClient.getCustomers();
      
      // Handle paginated response
      const customerData = response?.data || response || [];
      
      
      // Transform customers to calendar format
      const transformedCustomers = customerData.map((customer: any) => ({
        id: customer.id,
        name: formatName(customer.firstName, customer.lastName),
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        notes: customer.notes,
        tags: customer.tags,
        lastVisit: customer.lastVisit,
        totalVisits: customer.totalVisits,
        totalSpent: customer.totalSpent,
      }));
      
      actions.setCustomers(transformedCustomers);
    } catch (error) {
    }
  }, [actions]);
  
  // Fetch merchant settings
  const fetchMerchantSettings = useCallback(async () => {
    try {
      // First check localStorage for cached merchant data
      const merchantData = localStorage.getItem('merchant');
      if (merchantData) {
        const merchant = JSON.parse(merchantData);
        if (merchant.settings) {
          // Update calendar hours if they exist in settings
          if (merchant.settings.calendarStartHour !== undefined && 
              merchant.settings.calendarEndHour !== undefined) {
            actions.dispatch({
              type: 'UPDATE_CALENDAR_HOURS',
              payload: {
                startHour: merchant.settings.calendarStartHour,
                endHour: merchant.settings.calendarEndHour
              }
            });
          }
          
          // Update unassigned column visibility
          const desiredShowUnassigned =
            merchant.settings.allowUnassignedBookings === true
              ? true
              : merchant.settings.showUnassignedColumn ?? false;

          if (state.showUnassignedColumn !== desiredShowUnassigned) {
            actions.dispatch({
              type: 'SET_UI_FLAGS',
              payload: { showUnassignedColumn: desiredShowUnassigned },
            });
          }

          if (Array.isArray(merchant.settings.calendarStaffOrder)) {
            const orderedIds = merchant.settings.calendarStaffOrder.filter((value: unknown) => typeof value === 'string');
            actions.setStaffOrder(orderedIds);
          }
        }
      }
    } catch (error) {
    }
  }, [actions, state.showUnassignedColumn]);

  // Initial data load
  useEffect(() => {
    fetchMerchantSettings();
    // Staff is loaded from BookingContext, don't fetch here
    fetchServices();
    fetchCustomers();
  }, [fetchMerchantSettings, fetchServices, fetchCustomers]);
  
  // Fetch bookings when date range changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);
  
  // Fetch blocks when date range or staff changes
  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);
  
  // Listen for booking events from other tabs/windows
  useEffect(() => {
    const unsubscribe = bookingEvents.subscribe((event) => {
      // Refresh if a booking was created or updated from another tab
      // BUT only if no slideouts are open
      if ((event.type === 'booking_created' || event.type === 'booking_updated') &&
          !(event.type === 'booking_created' && bookingEvents.isLocalEvent(event)) &&
          !state.isBookingSlideOutOpen &&
          !state.isDetailsSlideOutOpen) {
        // Small delay to ensure database is updated
        setTimeout(() => {
          fetchBookingsRef.current();
        }, 500);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [state.isBookingSlideOutOpen, state.isDetailsSlideOutOpen]);
  
  // Fetch a single booking and add/update it in the calendar
  const fetchSingleBooking = useCallback(async (bookingId: string) => {
    try {
      const booking = await apiClient.getBooking(bookingId);
      
      // Transform booking to calendar format
      const startTime = new Date(booking.startTime);
      const date = format(startTime, 'yyyy-MM-dd');
      const time = format(startTime, 'HH:mm');
      const customerSource = booking.customerSource || booking.customer?.source || null;
      const sourceInfo = mapBookingSource(booking.source, customerSource);
      
      const transformedBooking = {
        id: booking.id,
        bookingNumber: booking.bookingNumber, // Include the booking number
        date,
        time,
        duration: booking.duration || booking.totalDuration || 60,
        status: booking.status ? 
          ((booking.status === 'COMPLETE' || booking.status === 'COMPLETED') ? 'completed' : 
           booking.status.toLowerCase().replace(/_/g, '-')) : 
          'confirmed',
        
        // Customer info
        customerId: booking.customerId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
        customerSource,
        
        // Service info
        serviceId: booking.serviceId || booking.services?.[0]?.serviceId || '',
        serviceName: booking.serviceName,
        servicePrice: booking.servicePrice,
        services: booking.services, // Include services array for multi-service support
        
        // Staff info
        staffId: booking.staffId || 
                 booking.providerId || 
                 (booking.provider?.id) || 
                 (booking.providerId && booking.providerId !== '') ? booking.providerId : null,
        staffName: booking.staffName || booking.providerName || 'Unassigned',
        
        // Additional fields
        notes: booking.notes,
        internalNotes: booking.internalNotes,
        paymentStatus: booking.paymentStatus,
        isPaid: booking.isPaid,
        paidAmount: booking.paidAmount,
        source: sourceInfo.raw,
        sourceCategory: sourceInfo.category,
        sourceLabel: sourceInfo.label,

        // Timestamps
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        completedAt: booking.completedAt,
      };
      
      // Check if booking already exists
      const existingBookingIndex = state.bookings.findIndex(b => b.id === bookingId);
      
      if (existingBookingIndex >= 0) {
        actions.dispatch({ type: 'UPDATE_BOOKING', payload: { id: bookingId, updates: transformedBooking } });
      } else {
        actions.dispatch({ type: 'ADD_BOOKING', payload: transformedBooking });
      }
      
      return transformedBooking;
    } catch (error) {
      // Fall back to full refresh if single booking fetch fails
      fetchBookingsRef.current();
    }
  }, [state.bookings, actions]);
  
  // Listen for booking update events from notifications
  useEffect(() => {
    const handleBookingUpdate = (event: CustomEvent) => {
      
      // DISABLED: Don't refresh on booking updates as it overwrites multi-service data
      // The optimistic updates in the calendar handle this better
      // fetchBookingsRef.current();
    };
    
    window.addEventListener('booking-updated', handleBookingUpdate as any);
    
    return () => {
      window.removeEventListener('booking-updated', handleBookingUpdate as any);
    };
  }, []);
  
  
  // Refresh function
  const refresh = useCallback(async () => {
    actions.setRefreshing(true);
    await Promise.all([
      fetchBookings(),
      fetchServices(),
      fetchCustomers(),
      fetchBlocks(),
    ]);
    actions.setRefreshing(false);
  }, [fetchBookings, fetchServices, fetchCustomers, fetchBlocks, actions]);
  
  return {
    refresh,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
  };
}

// Hook for calendar time grid
export function useTimeGrid() {
  const { state } = useCalendar();
  
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = state.calendarStartHour;
    const endHour = state.calendarEndHour;
    const interval = state.timeInterval;
    
    // Parse business hours
    const [businessStartHour, businessStartMinute] = state.businessHours.start.split(':').map(Number);
    const [businessEndHour, businessEndMinute] = state.businessHours.end.split(':').map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayTime = minute === 0 
          ? `${displayHour} ${ampm}` 
          : `${displayHour}:${minute.toString().padStart(2, '0')}`;
        
        // Check if this slot is within business hours
        const currentMinutes = hour * 60 + minute;
        const businessStartMinutes = businessStartHour * 60 + businessStartMinute;
        const businessEndMinutes = businessEndHour * 60 + businessEndMinute;
        const isBusinessHours = currentMinutes >= businessStartMinutes && currentMinutes < businessEndMinutes;
        
        slots.push({
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          hour,
          minute,
          isHalfHour: minute === 30,
          displayTime,
          isBusinessHours,
        });
      }
    }
    
    return slots;
  }, [state.timeInterval, state.businessHours, state.calendarStartHour, state.calendarEndHour]);
  
  return { timeSlots };
}

// Hook for booking operations
export function useBookingOperations() {
  const { state, actions } = useCalendar();
  const { toast } = useToast();
  
  const updateBookingTime = useCallback(async (
    bookingId: string,
    newDate: string,
    newTime: string,
    newStaffId: string | null,
    options?: {
      endMinutes?: number;
      newDuration?: number;
      showSuccessToast?: boolean;
    }
  ) => {
    const existingBooking = state.bookings.find(b => b.id === bookingId);
    if (!existingBooking) {
      const missingMessage = 'Booking could not be found locally. Please refresh and try again.';
      toast({
        title: 'Error',
        description: missingMessage,
        variant: 'destructive',
      });
      throw new Error(missingMessage);
    }

    const showSuccessToast = options?.showSuccessToast ?? true;

    try {
      actions.setLoading(true);

      const startMinutes = timeStringToMinutes(newTime);
      const requestedDuration = options?.newDuration ?? existingBooking.duration;
      const requestedEndMinutes = options?.endMinutes ?? (startMinutes + requestedDuration);
      const safeEndMinutes = Math.max(requestedEndMinutes, startMinutes + Math.max(1, state.timeInterval));
      const updatedDuration = options?.newDuration ?? (safeEndMinutes - startMinutes);

      const startTimeIso = formatMerchantDateTimeISO(newDate, newTime);
      const endTimeIso = formatMerchantDateTimeISO(newDate, minutesToTimeString(safeEndMinutes));

      await apiClient.updateBooking(bookingId, {
        startTime: startTimeIso,
        endTime: endTimeIso,
        staffId: newStaffId ?? undefined,
      });
      
      const staffMember = newStaffId ? state.staff.find(s => s.id === newStaffId) : null;
      const staffName = newStaffId
        ? staffMember?.name ?? existingBooking.staffName ?? 'Unassigned'
        : existingBooking.staffName ?? 'Unassigned';

      actions.updateBooking(bookingId, {
        date: newDate,
        time: newTime,
        staffId: newStaffId,
        staffName,
        duration: updatedDuration,
      });

      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: 'Booking updated successfully',
        });
      }
    } catch (error) {
      const description = extractErrorMessage(error);
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [state.bookings, state.staff, state.timeInterval, actions, toast]);
  
  const updateBookingStatus = useCallback(async (
    bookingId: string,
    status: string
  ) => {
    try {
      // Update the booking status optimistically with normalized format
      const normalizedStatus = status.toLowerCase().replace(/_/g, '-');
      actions.updateBooking(bookingId, { status: normalizedStatus as any });
      
      // Send the update to the API (API expects uppercase format)
      await apiClient.updateBookingStatus(bookingId, status.toUpperCase());
      
      // Broadcast the status update to other tabs
      bookingEvents.broadcast({
        type: 'booking_updated',
        bookingId: bookingId,
        source: 'slideout'
      });
      
      toast({
        title: 'Success',
        description: 'Booking status updated',
      });
    } catch (error) {
      // Revert the optimistic update on error
      const booking = state.bookings.find(b => b.id === bookingId);
      if (booking) {
        actions.updateBooking(bookingId, { status: booking.status });
      }
      
      toast({
        title: 'Error',
        description: 'Failed to update booking status',
        variant: 'destructive',
      });
      throw error;
    }
  }, [actions, toast, state.bookings]);
  
  const deleteBooking = useCallback(async (bookingId: string) => {
    try {
      // For now, we'll just update the status to cancelled
      await updateBookingStatus(bookingId, 'cancelled');
      
      actions.removeBooking(bookingId);
      
      toast({
        title: 'Success',
        description: 'Booking deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete booking',
        variant: 'destructive',
      });
      throw error;
    }
  }, [actions, toast]);
  
  return {
    updateBookingTime,
    updateBookingStatus,
    deleteBooking,
  };
}

// Hook for booking conflicts
export function useBookingConflicts() {
  const { filteredBookings } = useCalendar();
  
  const checkTimeConflict = useCallback((
    staffId: string | null,
    date: string,
    time: string,
    duration: number,
    excludeBookingId?: string
  ): boolean => {
    if (!staffId) return false; // No conflicts for unassigned bookings
    
    const bookingStart = parseISO(`${date}T${time}`);
    const bookingEnd = addMinutes(bookingStart, duration);
    
    return filteredBookings.some(booking => {
      if (booking.id === excludeBookingId) return false;
      if (booking.staffId !== staffId) return false;
      if (booking.date !== date) return false;
      
      const existingStart = parseISO(`${booking.date}T${booking.time}`);
      const existingEnd = addMinutes(existingStart, booking.duration);
      
      // Check for overlap
      return (
        (isAfter(bookingStart, existingStart) && isBefore(bookingStart, existingEnd)) ||
        (isAfter(bookingEnd, existingStart) && isBefore(bookingEnd, existingEnd)) ||
        (isBefore(bookingStart, existingStart) && isAfter(bookingEnd, existingEnd)) ||
        (bookingStart.getTime() === existingStart.getTime())
      );
    });
  }, [filteredBookings]);
  
  return { checkTimeConflict };
}

// Hook for calendar navigation
export function useCalendarNavigation() {
  const { state, actions } = useCalendar();
  
  const navigateToToday = useCallback(() => {
    actions.setDate(new Date());
  }, [actions]);
  
  const navigatePrevious = useCallback(() => {
    actions.navigate('prev');
  }, [actions]);
  
  const navigateNext = useCallback(() => {
    actions.navigate('next');
  }, [actions]);
  
  const navigationLabel = useMemo(() => {
    const merchantDate = toMerchantTime(state.currentDate);

    switch (state.currentView) {
      case 'day':
        // Check if viewing today - show "Today" instead of full date
        const isToday = format(state.currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        return isToday ? 'Today' : formatInMerchantTime(merchantDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        const weekStart = toMerchantTime(state.dateRange.start);
        const weekEnd = toMerchantTime(state.dateRange.end);
        return `${formatInMerchantTime(weekStart, 'MMM d')} - ${formatInMerchantTime(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return formatInMerchantTime(merchantDate, 'MMMM yyyy');
      default:
        return '';
    }
  }, [state.currentDate, state.currentView, state.dateRange]);
  
  return {
    navigateToToday,
    navigatePrevious,
    navigateNext,
    navigationLabel,
    currentView: state.currentView,
    setView: actions.setView,
  };
}

// Hook for drag and drop
export function useCalendarDragDrop() {
  const { state, actions } = useCalendar();
  const { updateBookingTime } = useBookingOperations();
  const { checkTimeConflict } = useBookingConflicts();
  const { toast } = useToast();
  
  const handleDragStart = useCallback((bookingId: string) => {
    actions.startDrag(bookingId);
  }, [actions]);
  
  const handleDragEnd = useCallback(async (
    bookingId: string,
    targetStaffId: string | null,
    targetDate: string,
    targetTime: string
  ) => {
    actions.endDrag();
    
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Check for conflicts
    if (checkTimeConflict(targetStaffId, targetDate, targetTime, booking.duration, bookingId)) {
      const staffName = booking.staffName || 'selected staff member';
      toast({
        title: 'Slot unavailable',
        description: `That time overlaps with another booking for ${staffName}.`,
        variant: 'destructive',
      });
      return {
        success: false,
        error: 'Time slot conflict',
      };
    }
    
    try {
      const startMinutes = timeStringToMinutes(targetTime);
      await updateBookingTime(bookingId, targetDate, targetTime, targetStaffId, {
        endMinutes: startMinutes + booking.duration,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: extractErrorMessage(error),
      };
    }
  }, [state.bookings, actions, checkTimeConflict, updateBookingTime, toast]);
  
  return {
    isDragging: state.isDragging,
    draggedBookingId: state.draggedBookingId,
    handleDragStart,
    handleDragEnd,
  };
}
