import { useCallback, useEffect, useMemo } from 'react';
import { useCalendar } from './CalendarProvider';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';
import { toMerchantTime, formatInMerchantTime } from '@/lib/date-utils';
import { 
  startOfDay, 
  endOfDay, 
  addMinutes, 
  isBefore, 
  isAfter,
  parseISO,
  format
} from 'date-fns';
import type { Booking, TimeSlot } from './types';
import { bookingEvents } from '@/lib/services/booking-events';

// Hook for fetching calendar data
export function useCalendarData() {
  const { state, actions } = useCalendar();
  const { toast } = useToast();
  
  // Fetch bookings for current date range
  const fetchBookings = useCallback(async () => {
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
      
      
      // Transform bookings to calendar format
      const transformedBookings = response.map((booking: any) => {
        // Extract date and time from startTime
        const startTime = new Date(booking.startTime);
        const date = format(startTime, 'yyyy-MM-dd');
        const time = format(startTime, 'HH:mm');
        
        return {
          id: booking.id,
          date,
          time,
          duration: booking.duration,
          status: booking.status,
          
          // Customer info
          customerId: booking.customerId,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          customerEmail: booking.customerEmail,
          
          // Service info
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          servicePrice: booking.price || booking.totalAmount,
          
          // Staff info - normalize all falsy values to null (including empty strings)
          staffId: (booking.staffId && booking.staffId !== '') ? booking.staffId : 
                   (booking.providerId && booking.providerId !== '') ? booking.providerId : null,
          staffName: booking.staffName || booking.providerName || 'Unassigned',
          
          // Additional fields
          notes: booking.notes,
          internalNotes: booking.internalNotes,
          paymentStatus: booking.paymentStatus,
          
          // Timestamps
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
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
  }, [state.dateRange, actions, toast]);
  
  // Fetch staff data
  const fetchStaff = useCallback(async () => {
    try {
      const response = await apiClient.getStaff();
      
      // Handle empty or invalid response
      if (!response || !Array.isArray(response)) {
        actions.setStaff([]);
        return;
      }
      
      // Transform staff to calendar format and filter out invalid entries
      const transformedStaff = response
        .filter((member: any) => {
          // Filter out staff with empty or null IDs
          if (!member.id || member.id === '') return false;
          
          // Filter out system "Unassigned" staff member
          if (member.email && member.email.endsWith('@system.local')) return false;
          if (member.firstName === 'Unassigned' && !member.lastName) return false;
          
          return true;
        })
        .map((member: any) => ({
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          color: member.calendarColor || '#7C3AED',
          avatar: member.avatar,
          isActive: member.isActive,
          workingHours: member.workingHours,
        }));
      
      actions.setStaff(transformedStaff || []);
    } catch (error: any) {
      console.error('Failed to fetch staff:', {
        message: error?.message,
        response: error?.response,
        data: error?.data,
        originalError: error
      });
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load staff. Please try again.',
        variant: 'destructive',
      });
    }
  }, [actions, toast]);
  
  // Fetch services data
  const fetchServices = useCallback(async () => {
    try {
      const response = await apiClient.getServices();
      
      // Handle empty or invalid response
      if (!response || !Array.isArray(response)) {
        actions.setServices([]);
        return;
      }
      
      // Transform services to match our type
      const transformedServices = (response || []).map(service => ({
        ...service,
        categoryName: service.category?.name || 'General',
      }));
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
        name: `${customer.firstName} ${customer.lastName}`,
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
          if (merchant.settings.showUnassignedColumn !== undefined) {
            if (merchant.settings.showUnassignedColumn !== state.showUnassignedColumn) {
              actions.toggleUnassignedColumn();
            }
          }
        }
      }
    } catch (error) {
    }
  }, [actions, state.showUnassignedColumn]);

  // Initial data load
  useEffect(() => {
    fetchMerchantSettings();
    fetchStaff();
    fetchServices();
    fetchCustomers();
  }, [fetchMerchantSettings, fetchStaff, fetchServices, fetchCustomers]);
  
  // Fetch bookings when date range changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);
  
  // Smart refresh: Multiple strategies for keeping calendar up-to-date
  useEffect(() => {
    let lastFetchTime = Date.now();
    const MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between refreshes
    
    // Strategy 1: Refresh when window regains focus
    const handleFocus = () => {
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      
      // Only refresh if:
      // 1. At least 30 seconds have passed since last fetch
      // 2. Not currently loading or refreshing
      // 3. Calendar is visible
      if (timeSinceLastFetch > MIN_REFRESH_INTERVAL && 
          !state.isRefreshing && 
          !state.isLoading) {
        fetchBookings();
        lastFetchTime = Date.now();
      }
    };
    
    // Also refresh when visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    
    // Strategy 2: Listen for booking events from other tabs/windows
    const unsubscribe = bookingEvents.subscribe((event) => {
      
      // Refresh if a booking was created or updated from external source
      if ((event.type === 'booking_created' || event.type === 'booking_updated') && 
          event.source === 'external') {
        // Small delay to ensure database is updated
        setTimeout(() => {
          if (!state.isRefreshing && !state.isLoading) {
            fetchBookings();
            lastFetchTime = Date.now();
          }
        }, 1000);
      }
    });
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }, [fetchBookings, state.isRefreshing, state.isLoading]);
  
  // Refresh function
  const refresh = useCallback(async () => {
    actions.setRefreshing(true);
    await Promise.all([
      fetchBookings(),
      fetchStaff(),
      fetchServices(),
      fetchCustomers(),
    ]);
    actions.setRefreshing(false);
  }, [fetchBookings, fetchStaff, fetchServices, fetchCustomers, actions]);
  
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
  }, [state.timeInterval, state.businessHours]);
  
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
    newStaffId: string | null
  ) => {
    try {
      actions.setLoading(true);
      
      await apiClient.updateBooking(bookingId, {
        startTime: `${newDate}T${newTime}`,
        staffId: newStaffId,
      });
      
      // Find the staff member name
      const staffMember = newStaffId ? state.staff.find(s => s.id === newStaffId) : null;
      const staffName = staffMember ? staffMember.name : 'Unassigned';
      
      // Update local state
      actions.updateBooking(bookingId, {
        date: newDate,
        time: newTime,
        staffId: newStaffId,
        staffName,
      });
      
      toast({
        title: 'Success',
        description: 'Booking updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update booking. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      actions.setLoading(false);
    }
  }, [state.staff, actions, toast]);
  
  const updateBookingStatus = useCallback(async (
    bookingId: string,
    status: string
  ) => {
    try {
      await apiClient.updateBookingStatus(bookingId, status);
      
      actions.updateBooking(bookingId, { status: status as any });
      
      toast({
        title: 'Success',
        description: 'Booking status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update booking status',
        variant: 'destructive',
      });
      throw error;
    }
  }, [actions, toast]);
  
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
        return formatInMerchantTime(merchantDate, 'EEEE, MMMM d, yyyy');
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
      return {
        success: false,
        error: 'Time slot conflict',
      };
    }
    
    try {
      await updateBookingTime(bookingId, targetDate, targetTime, targetStaffId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update booking',
      };
    }
  }, [state.bookings, actions, checkTimeConflict, updateBookingTime]);
  
  return {
    isDragging: state.isDragging,
    draggedBookingId: state.draggedBookingId,
    handleDragStart,
    handleDragEnd,
  };
}