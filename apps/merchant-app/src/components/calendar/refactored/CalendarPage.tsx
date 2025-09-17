'use client';

// Build timestamp - updates when file is saved
const __BUILD_TIME__ = new Date().toLocaleString();
// Checkbox removed - rostered staff filter now controlled by merchant settings only

import React, { useCallback, useRef } from 'react';
import { CalendarProvider, useCalendar } from './CalendarProvider';
import { DailyView } from './views/DailyView';
import { WeeklyView } from './views/WeeklyView';
import { MonthlyView } from './views/MonthlyView';
import { 
  useCalendarData, 
  useCalendarNavigation, 
  useCalendarDragDrop,
  useBookingOperations 
} from './hooks';
import { Button } from '@heya-pos/ui';
import { formatName } from '@heya-pos/utils';
import { Card, CardContent } from '@heya-pos/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@heya-pos/ui';
import { Switch } from '@heya-pos/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { Badge } from '@heya-pos/ui';
import { Checkbox } from '@heya-pos/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@heya-pos/ui';
import { Separator } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown, 
  CalendarDays, 
  Home, 
  Plus,
  RefreshCw,
  Filter,
  Users,
  CheckCircle2
} from 'lucide-react';
import { BookingSlideOut } from '@/components/BookingSlideOut';
import { BookingDetailsSlideOut } from '@/components/BookingDetailsSlideOut';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import type { Booking, BookingStatus } from './types';
import { checkStaffAvailability, ensureValidStaffId, isValidStaffId } from '@/lib/services/booking-availability.service';
import { NEXT_AVAILABLE_STAFF_ID, isNextAvailableStaff } from '@/lib/constants/booking-constants';
import { bookingEvents } from '@/lib/services/booking-events';
import { useAuth } from '@/lib/auth/auth-provider';
import { useNotifications } from '@/contexts/notifications-context';
import { useBooking } from '@/contexts/booking-context';
import { useWebSocket } from '@/hooks/useWebSocket';

// Main calendar component that uses the provider
export function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarContent />
    </CalendarProvider>
  );
}

// Inner component that has access to calendar context
function CalendarContent() {
  const { state, actions } = useCalendar();
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { notifications, refreshNotifications } = useNotifications();
  const { staff: bookingContextStaff, loading: bookingContextLoading } = useBooking();
  const { refresh, isLoading, isRefreshing } = useCalendarData();
  const {
    navigateToToday,
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
  const { isConnected, lastNotification } = useWebSocket({
    debug: typeof window !== 'undefined' && localStorage.getItem('ws_debug') === 'true',
    onBookingCreated: React.useCallback((data) => {
      // Only refresh if this booking is for our merchant
      if (data.merchantId === merchant?.id) {
        console.log('[Calendar] Real-time: Booking created', data.id);

        // Check if this booking was created locally (to prevent refresh conflicts)
        if (locallyCreatedBookings.current.has(data.id)) {
          console.log('[Calendar] 🎯 SKIPPING WebSocket refresh for locally created booking', data.id);
          console.log('[Calendar] 🎯 Locally created bookings set:', Array.from(locallyCreatedBookings.current));
          // Remove from tracking after 5 seconds to allow future refreshes
          setTimeout(() => {
            locallyCreatedBookings.current.delete(data.id);
            console.log('[Calendar] 🎯 Removed booking from tracking set:', data.id);
          }, 5000);
          return;
        }

        // Clear cache and refresh
        console.log('[Calendar] 🎯 WebSocket triggering REFRESH for external booking', data.id);
        apiClient.clearBookingsCache();

        // Add a small delay to ensure database consistency
        setTimeout(() => {
          console.log('[Calendar] 🎯 Executing WebSocket refresh now');
          refresh();
        }, 500);

        // Show toast notification
        toast({
          title: 'New Booking',
          description: 'A new booking has been created',
          duration: 3000,
        });
      }
    }, [merchant?.id, refresh, toast]),
    
    onBookingUpdated: React.useCallback((data) => {
      // Only refresh if this booking is for our merchant
      if (data.merchantId === merchant?.id) {
        console.log('[Calendar] Real-time: Booking updated', data.id, 'Status:', data.status);
        
        // Update the booking in local state immediately for instant feedback
        const booking = state.bookings.find(b => b.id === data.id);
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
            title: 'Booking Updated',
            description: `Status changed from ${data.oldStatus} to ${data.status}`,
            duration: 3000,
          });
        }
      }
    }, [merchant?.id, state.bookings, actions, refresh, toast]),
    
    onBookingDeleted: React.useCallback((data) => {
      // Only refresh if this booking is for our merchant
      if (data.merchantId === merchant?.id) {
        console.log('[Calendar] Real-time: Booking deleted', data.id);
        
        // Remove from local state immediately
        actions.deleteBooking(data.id);
        
        // Clear cache
        apiClient.clearBookingsCache();
        
        // Refresh to sync with server
        setTimeout(() => {
          refresh();
        }, 500);
        
        toast({
          title: 'Booking Deleted',
          description: 'A booking has been removed',
          duration: 3000,
        });
      }
    }, [merchant?.id, actions, refresh, toast]),
    
    onPaymentCreated: React.useCallback((data) => {
      if (data.merchantId === merchant?.id && data.bookingId) {
        console.log('[Calendar] Real-time: Payment created for booking', data.bookingId);
        
        // Refresh to show payment status update
        apiClient.clearBookingsCache();
        refresh();
      }
    }, [merchant?.id, refresh]),
    
    onPaymentUpdated: React.useCallback((data) => {
      if (data.merchantId === merchant?.id && data.bookingId) {
        console.log('[Calendar] Real-time: Payment updated for booking', data.bookingId);
        
        // Refresh to show payment status update
        apiClient.clearBookingsCache();
        refresh();
      }
    }, [merchant?.id, refresh]),
  });
  
  // Set staff from BookingContext when it's loaded
  React.useEffect(() => {
    if (bookingContextStaff && bookingContextStaff.length > 0) {
      actions.setStaff(bookingContextStaff);
    }
  }, [bookingContextStaff, actions]);
  
  // Development logging helper
  const addActivityLog = React.useCallback((type: 'event' | 'api' | 'state' | 'error', message: string, detail?: any) => {
    if (process.env.NODE_ENV !== 'development') return;
    
    setActivityLog(prev => {
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        detail
      };
      // Keep only last 50 logs
      return [newLog, ...prev].slice(0, 50);
    });
  }, []);
  
  // Listen for booking events in development
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const handleBookingEvent = (event: CustomEvent) => {
      // Removed activity log
    };
    
    const handleFetchBookings = (event: CustomEvent) => {
      // Removed activity log
    };
    
    window.addEventListener('booking-updated', handleBookingEvent as any);
    window.addEventListener('calendar-fetch-bookings', handleFetchBookings as any);
    
    return () => {
      window.removeEventListener('booking-updated', handleBookingEvent as any);
      window.removeEventListener('calendar-fetch-bookings', handleFetchBookings as any);
    };
  }, [addActivityLog]);
  
  
  // Removed notification polling logs
  
  // Refresh calendar when we detect new booking notifications
  const prevBookingNotificationIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    const bookingNotifications = notifications.filter(n => 
      !n.read && (n.type === 'booking_new' || n.type === 'booking_modified') && n.metadata?.bookingId
    );
    
    // Check if there are any new booking notifications
    const newNotifications = bookingNotifications.filter(n => 
      !prevBookingNotificationIds.current.has(n.id)
    );
    
    if (newNotifications.length > 0) {
      // Clear the booking cache to ensure fresh data
      apiClient.clearBookingsCache();
      
      if (!isLoading && !isRefreshing) {
        refresh();
      }
    }
    
    // Update the set of seen notification IDs
    prevBookingNotificationIds.current = new Set(bookingNotifications.map(n => n.id));
  }, [notifications, refresh, isLoading, isRefreshing, addActivityLog]);
  
  // Removed polling indicator
  
  // Drag state
  const [activeBooking, setActiveBooking] = React.useState<Booking | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOverSlot, setDragOverSlot] = React.useState<{
    staffId: string;
    staffName: string;
    startTime: Date;
    endTime: Date;
  } | null>(null);
  
  // Filter popover state
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  
  // Booking slide out data
  const [bookingSlideOutData, setBookingSlideOutData] = React.useState<{
    date: Date;
    time: string;
    staffId: string | null;
  } | null>(null);
  
  // Development activity log
  const [activityLog, setActivityLog] = React.useState<Array<{
    timestamp: string;
    type: 'event' | 'api' | 'state' | 'error';
    message: string;
    detail?: any;
  }>>([]);
  const [isActivityLogMinimized, setIsActivityLogMinimized] = React.useState(false);
  
  // Memoize the initial time to prevent infinite renders
  const initialTime = React.useMemo(() => {
    if (!bookingSlideOutData?.time) return undefined;
    const [hours, minutes] = bookingSlideOutData.time.split(':').map(Number);
    const time = new Date(bookingSlideOutData.date);
    time.setHours(hours, minutes, 0, 0);
    return time;
  }, [bookingSlideOutData?.date, bookingSlideOutData?.time]);
  
  // Memoize transformed data to prevent infinite renders
  const memoizedStaff = React.useMemo(() => 
    state.staff.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })), [state.staff]
  );
  
  const memoizedServices = React.useMemo(() => 
    state.services.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      categoryName: s.categoryName,
    })), [state.services]
  );
  
  const memoizedCustomers = React.useMemo(() => 
    state.customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || c.mobile || '',
      mobile: c.mobile,
      email: c.email,
    })), [state.customers]
  );
  
  // Calculate active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    
    // Check if we're hiding any statuses (default is to show all)
    const allStatuses = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
    const hiddenStatuses = allStatuses.filter(status => !state.selectedStatusFilters.includes(status));
    
    if (hiddenStatuses.length > 0) {
      count++;
    }
    
    // Check staff filter
    if (state.selectedStaffIds.length < state.staff.length && state.selectedStaffIds.length > 0) {
      count++;
    }
    
    return count;
  }, [state.selectedStatusFilters, state.selectedStaffIds, state.staff]);
  
  // Calculate rostered staff count for the current day
  const rosteredStaffInfo = React.useMemo(() => {
    const activeStaff = state.staff.filter(s => s.isActive !== false);
    
    if (!state.showOnlyRosteredStaff || state.currentView !== 'day') {
      return { rosteredCount: activeStaff.length, totalCount: activeStaff.length, hiddenCount: 0 };
    }
    
    const currentDayOfWeek = state.currentDate.getDay();
    const includeUnscheduledStaff = merchant?.settings?.includeUnscheduledStaff ?? false;
    
    const rosteredStaff = activeStaff.filter(staff => {
      const hasSchedules = staff.schedules && staff.schedules.length > 0;
      
      if (hasSchedules) {
        return staff.schedules.some(schedule => schedule.dayOfWeek === currentDayOfWeek);
      }
      
      return includeUnscheduledStaff;
    });
    
    return {
      rosteredCount: rosteredStaff.length,
      totalCount: activeStaff.length,
      hiddenCount: activeStaff.length - rosteredStaff.length
    };
  }, [state.staff, state.showOnlyRosteredStaff, state.currentDate, state.currentView, merchant?.settings?.includeUnscheduledStaff]);
  
  // Handle booking click
  const handleBookingClick = useCallback((booking: Booking) => {
    actions.openDetailsSlideOut(booking.id);
  }, [actions]);
  
  // Handle time slot click
  const handleTimeSlotClick = useCallback((date: Date, time: string, staffId: string | null) => {
    // Set booking slide out data before opening
    const slideOutData = {
      date,
      time,
      staffId
    };
    setBookingSlideOutData(slideOutData);
    actions.openBookingSlideOut();
  }, [actions]);
  
  // Memoize booking slide out callbacks to prevent infinite loops
  const handleBookingSlideOutClose = useCallback(() => {
    actions.closeBookingSlideOut();
    setBookingSlideOutData(null);
  }, [actions]);
  
  const handleBookingSlideOutSave = useCallback(async (bookingData: any) => {
    console.log('[Calendar] 🎯 handleBookingSlideOutSave called with data:', {
      id: bookingData.id,
      customerName: bookingData.customerName,
      serviceName: bookingData.serviceName,
      startTime: bookingData.startTime,
      status: bookingData.status
    });

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
          const service = state.services.find(s => s.id === bookingData.serviceId);
          if (!service) {
            throw new Error('Service not found. Please refresh and try again.');
          }
          
          // Transform bookings for availability check
          const bookingsForAvailability = state.bookings.map(b => {
            const startTime = new Date(`${b.date}T${b.time}`);
            const endTime = new Date(startTime.getTime() + b.duration * 60000);
            return {
              ...b,
              startTime,
              endTime
            };
          });
          
          // Get available staff with auto-assignment
          const availabilityResult = await getAvailableStaff(
            bookingData.serviceId,
            bookingData.startTime,
            service.duration,
            state.staff,
            bookingsForAvailability
          );
          
          // Use the enhanced service to ensure valid staff ID
          finalStaffId = ensureValidStaffId(null, availabilityResult.assignedStaff);
        }
      } catch (error) {
        // Enhanced error handling
        throw new Error(
          error instanceof Error ? 
            error.message : 
            'Unable to assign staff. Please select a specific staff member.'
        );
      }
      
      // Final validation - MUST have a valid UUID at this point
      if (!isValidStaffId(finalStaffId)) {
        throw new Error('System error: Invalid staff assignment. Please try again.');
      }
      
      // Handle walk-in customer creation if needed
      let finalCustomerId = bookingData.customerId;
      
      if (bookingData.isNewCustomer) {
        // For walk-in customers, check if we already have one
        if (bookingData.isWalkIn) {
          try {
            // Search for existing walk-in customer
            const searchResponse = await apiClient.searchCustomers('Walk-in');
            const customers = searchResponse?.data || [];
            const existingWalkInCustomer = customers.find((customer: any) => 
              customer.firstName === 'Walk-in' ||
              customer.source === 'WALK_IN'
            );
            
            if (existingWalkInCustomer) {
              // Use existing walk-in customer
              finalCustomerId = existingWalkInCustomer.id;
            } else {
              // Create a single walk-in customer that can be reused
              const customerData = {
                firstName: 'Walk-in',
                lastName: undefined, // No last name for walk-in
                notes: 'Shared walk-in customer account',
                source: 'WALK_IN'
              };
              
              const newCustomer = await apiClient.createCustomer(customerData);
              finalCustomerId = newCustomer.id;
              
              // Update the local state with the new customer
              actions.setCustomers([...state.customers, {
                ...newCustomer,
                name: 'Walk-in'
              }]);
            }
          } catch (error) {
            throw new Error('Failed to process walk-in customer');
          }
        } else {
          // Regular new customer creation
          const nameParts = bookingData.customerName.split(' ');
          const customerData: any = {
            firstName: nameParts[0] || 'Customer',
            lastName: nameParts.slice(1).join(' ') || undefined, // No default last name
            phone: bookingData.customerPhone || '',
            email: bookingData.customerEmail || undefined,
            notes: ''
          };
          
          const newCustomer = await apiClient.createCustomer(customerData);
          finalCustomerId = newCustomer.id;
          
          // Update the local state with the new customer
          actions.setCustomers([...state.customers, {
            ...newCustomer,
            name: formatName(newCustomer.firstName, newCustomer.lastName)
          }]);
        }
      }
      
      // Prepare the booking request data
      // Check if bookingData has services array (multi-service) or single serviceId
      let services = [];
      if (bookingData.services && Array.isArray(bookingData.services)) {
        // Multi-service booking from BookingSlideOut
        services = bookingData.services.map((service: any) => ({
          serviceId: service.serviceId,
          staffId: service.staffId || finalStaffId
        }));
      } else if (bookingData.serviceId) {
        // Single service booking (legacy support)
        services = [{
          serviceId: bookingData.serviceId,
          staffId: finalStaffId
        }];
      }
      
      // LocationId is now optional in the database
      const locationId = merchant?.locations?.[0]?.id || merchant?.locationId;
      
      // BookingSlideOut now returns real booking data after successful creation
      
      // Transform the booking data for calendar display
      const startTime = new Date(bookingData.startTime);
      
      // For multi-service bookings, we need to get the first service info for display
      // The calendar currently shows single bookings, so we'll use the first service
      let serviceId = bookingData.serviceId;
      let serviceName = bookingData.serviceName;
      let servicePrice = bookingData.totalPrice || 0;
      let duration = bookingData.totalDuration || 30;
      
      if (bookingData.services && Array.isArray(bookingData.services) && bookingData.services.length > 0) {
        // Multi-service booking - use first service for display
        const firstService = bookingData.services[0];
        serviceId = firstService.id || firstService.serviceId;
        serviceName = firstService.name || serviceName;
        duration = firstService.duration || duration;
        servicePrice = firstService.price || servicePrice;
      }
      
      const transformedBooking = {
        id: bookingData.id,
        bookingNumber: bookingData.bookingNumber, // Include the booking number
        date: format(startTime, 'yyyy-MM-dd'),
        time: format(startTime, 'HH:mm'),
        duration: duration,
        // Normalize status to lowercase to match our BookingStatus type
        status: (bookingData.status || 'confirmed').toLowerCase() as BookingStatus,
        customerId: bookingData.customerId,
        customerName: bookingData.customerName,
        customerPhone: bookingData.customerPhone || '',
        customerEmail: bookingData.customerEmail || '',
        serviceId: serviceId,
        serviceName: serviceName,
        servicePrice: servicePrice,
        staffId: bookingData.staffId || null,
        staffName: bookingData.staffName || 'Unassigned',
        notes: bookingData.notes || '',
        paymentStatus: bookingData.isPaid ? 'paid' : 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      

      // Track this booking as locally created to prevent WebSocket refresh conflicts
      locallyCreatedBookings.current.add(transformedBooking.id);
      console.log('[Calendar] 🎯 Added booking to tracking set:', transformedBooking.id);

      // Add the new booking to the calendar
      console.log('[Calendar] 🎯 Calling actions.addBooking with:', {
        id: transformedBooking.id,
        date: transformedBooking.date,
        time: transformedBooking.time,
        customerName: transformedBooking.customerName,
        serviceName: transformedBooking.serviceName
      });
      actions.addBooking(transformedBooking);

      console.log('[Calendar] 🎯 Closing booking slideout');
      actions.closeBookingSlideOut();

      // Broadcast the booking creation to other tabs
      bookingEvents.broadcast({
        type: 'booking_created',
        bookingId: transformedBooking.id,
        source: 'slideout'
      });
      
      // Dismiss loading toast if provided
      if (bookingData._dismissLoadingToast && typeof bookingData._dismissLoadingToast === 'function') {
        bookingData._dismissLoadingToast();
      }
      
      // Show success toast with icon
      const toastMessage = (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-semibold">Booking created successfully!</p>
            <p className="text-sm text-gray-600 mt-1">
              {transformedBooking.customerName} • {format(startTime, 'h:mm a')}
            </p>
            <p className="text-sm text-gray-500">
              {transformedBooking.serviceName} with {transformedBooking.staffName}
            </p>
          </div>
        </div>
      );
      
      toast({
        title: "",
        description: toastMessage,
        variant: "default",
        className: "bg-green-50 border-green-200",
        duration: 5000,
      });
    } catch (error: any) {
      
      // Extract specific error message
      let errorMessage = 'Please try again';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          // Validation errors from API
          errorMessage = error.response.data.message.join(', ');
        } else if (typeof error.response.data.message === 'string') {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error toast with specific message
      toast({
        title: 'Failed to create booking',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [actions]);
  
  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const booking = state.bookings.find(b => b.id === active.id);
    if (booking) {
      setActiveBooking(booking);
      setIsDragging(true);
    }
  }, [state.bookings]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over && over.data.current?.date && over.data.current?.time) {
      const targetData = over.data.current;
      
      const staffMember = state.staff.find(s => s.id === targetData.staffId);
      
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
        const startTime = new Date(targetData.date + 'T00:00:00');
        if (isNaN(startTime.getTime())) {
          setDragOverSlot(null);
          return;
        }
        
        startTime.setHours(hours, minutes, 0, 0);
        
        setDragOverSlot({
          staffId: targetData.staffId || 'unassigned',
          staffName: staffMember?.name || 'Unassigned',
          startTime,
          endTime: new Date(startTime.getTime() + 30 * 60000), // 30 minutes later
        });
      } catch (error) {
        setDragOverSlot(null);
      }
    } else {
      setDragOverSlot(null);
    }
  }, [state.staff]);
  
  // Handle drag end
  const handleDragEndEvent = useCallback(async (event: DragEndEvent) => {
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
      if (typeof activeBooking.date === 'string') {
        originalDate = activeBooking.date;
      } else {
        originalDate = format(new Date(activeBooking.date), 'yyyy-MM-dd');
      }
    } catch (error) {
      return;
    }
    
    const isSameSlot = originalDate === date && 
                      activeBooking.time === time && 
                      activeBooking.staffId === staffId;
    
    if (isSameSlot) {
      return;
    }
    
    
    try {
      await updateBookingTime(activeBooking.id, date, time, staffId);
    } catch (error) {
    }
  }, [activeBooking, updateBookingTime]);
  
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Dev mode timestamp */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-xs font-mono border-b border-yellow-300">
            Build Time: {__BUILD_TIME__} | Current: {new Date().toLocaleTimeString()} | BookingSlideOut default time should round to next 15min
          </div>
        )}
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between h-14 px-6">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 hover:bg-gray-100 font-medium"
                onClick={navigateToToday}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Today
              </Button>
              
              <div className="flex items-center bg-gray-100 rounded-lg">
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
                
                <div className="px-4 py-1 min-w-[240px] text-center">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {navigationLabel}
                  </h2>
                </div>
                
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
            </div>
            
            {/* Center: View Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(["day", "week", "month"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setView(view)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    currentView === view
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
    {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Auto-refresh indicator */}
              {isRefreshing && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Updating...</span>
                </div>
              )}
              
              {/* WebSocket connection indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs mr-2",
                      isConnected 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                    )}>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                      )} />
                      <span className="font-medium">
                        {isConnected ? 'Live' : 'Reconnecting'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      {isConnected 
                        ? 'Real-time updates active' 
                        : 'Attempting to reconnect...'}
                    </p>
                    {lastNotification && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last update: {lastNotification.toLocaleTimeString()}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refresh();
                }}
                disabled={isRefreshing}
                title="Manually refresh calendar"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            
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
      
      {/* Secondary Navigation Bar with Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Staff filter and settings */}
          <div className="flex items-center gap-4">
            {/* Staff filter */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {state.showOnlyRosteredStaff && state.currentView === 'day' 
                  ? `${rosteredStaffInfo.rosteredCount}/${rosteredStaffInfo.totalCount}`
                  : `${state.selectedStaffIds.filter(id => state.staff.some(s => s.id === id && s.isActive !== false)).length}/${rosteredStaffInfo.totalCount}`
                } staff
                {rosteredStaffInfo.hiddenCount > 0 && state.showOnlyRosteredStaff && state.currentView === 'day' && (
                  <span className="text-gray-400 ml-1">
                    ({rosteredStaffInfo.hiddenCount} not rostered)
                  </span>
                )}
              </span>
            </div>
            
            {/* Filter button */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start" sideOffset={5}>
                <div className="p-4 space-y-4">
                  {/* Display Options */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Display Options</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={state.selectedStatusFilters.includes('pending')}
                          onCheckedChange={(checked) => {
                            const newFilters = checked 
                              ? [...state.selectedStatusFilters, 'pending']
                              : state.selectedStatusFilters.filter(s => s !== 'pending');
                            actions.setStatusFilter(newFilters);
                          }}
                        />
                        <span className="flex-1">Show pending bookings</span>
                        <Badge variant="secondary" className="text-xs">
                          {state.bookings.filter(b => b.status === 'pending').length}
                        </Badge>
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={state.selectedStatusFilters.includes('completed')}
                          onCheckedChange={(checked) => {
                            const newFilters = checked 
                              ? [...state.selectedStatusFilters, 'completed']
                              : state.selectedStatusFilters.filter(s => s !== 'completed');
                            actions.setStatusFilter(newFilters);
                          }}
                        />
                        <span className="flex-1">Show completed bookings</span>
                        <Badge variant="secondary" className="text-xs">
                          {state.bookings.filter(b => b.status === 'completed').length}
                        </Badge>
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={state.selectedStatusFilters.includes('cancelled')}
                          onCheckedChange={(checked) => {
                            const newFilters = checked 
                              ? [...state.selectedStatusFilters, 'cancelled']
                              : state.selectedStatusFilters.filter(s => s !== 'cancelled');
                            actions.setStatusFilter(newFilters);
                          }}
                        />
                        <span className="flex-1">Show cancelled bookings</span>
                        <Badge variant="secondary" className="text-xs">
                          {state.bookings.filter(b => b.status === 'cancelled').length}
                        </Badge>
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={state.selectedStatusFilters.includes('no-show')}
                          onCheckedChange={(checked) => {
                            const newFilters = checked 
                              ? [...state.selectedStatusFilters, 'no-show']
                              : state.selectedStatusFilters.filter(s => s !== 'no-show');
                            actions.setStatusFilter(newFilters);
                          }}
                        />
                        <span className="flex-1">Show no-show bookings</span>
                        <Badge variant="secondary" className="text-xs">
                          {state.bookings.filter(b => b.status === 'no-show').length}
                        </Badge>
                      </label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Staff Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-gray-900">Staff Members</h4>
                      <button
                        onClick={() => {
                          const activeStaff = state.staff.filter(s => s.isActive !== false);
                          if (state.selectedStaffIds.length === activeStaff.length) {
                            actions.setStaffFilter([]);
                          } else {
                            actions.setStaffFilter(activeStaff.map(s => s.id));
                          }
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        {state.selectedStaffIds.length === state.staff.filter(s => s.isActive !== false).length ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {state.staff.filter(member => member.isActive !== false).map(member => (
                        <label key={member.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={state.selectedStaffIds.includes(member.id)}
                            onCheckedChange={(checked) => {
                              const newIds = checked
                                ? [...state.selectedStaffIds, member.id]
                                : state.selectedStaffIds.filter(id => id !== member.id);
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
            
            {/* Time interval selector - hidden since only 15m is available
            {currentView === 'day' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Time Interval</span>
                <Select
                  value={state.timeInterval.toString()}
                  onValueChange={(value) => actions.setTimeInterval(parseInt(value) as 15 | 30 | 60)}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )} */}
          </div>
        </div>
      </div>
      
      {/* Calendar Content */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        ) : state.error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-destructive mb-4">{state.error}</p>
              <Button onClick={refresh}>Try Again</Button>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'day' && (
              <DailyView
                onBookingClick={handleBookingClick}
                onTimeSlotClick={handleTimeSlotClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEndEvent}
                activeBooking={activeBooking}
                dragOverSlot={dragOverSlot}
              />
            )}
            {currentView === 'week' && (
              <WeeklyView
                onBookingClick={handleBookingClick}
              />
            )}
            {currentView === 'month' && (
              <MonthlyView
                onBookingClick={handleBookingClick}
                onDayClick={(date) => {
                  actions.setDate(date);
                  actions.setView('day');
                }}
              />
            )}
          </>
        )}
      </div>
      
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
      
      {state.isDetailsSlideOutOpen && state.detailsBookingId && (() => {
        const booking = state.bookings.find(b => b.id === state.detailsBookingId);
        if (!booking) return null;
        
        // CRITICAL: Detect mismatch between service name and services array
        const hasMultiServiceName = booking.serviceName?.includes(' + ');
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
              customerPhone: booking.customerPhone || '',
              customerEmail: booking.customerEmail,
              serviceName: booking.serviceName,
              serviceId: booking.serviceId,
              services: booking.services,
              staffName: booking.staffName,
              staffId: booking.staffId || '',
              startTime: new Date(`${booking.date}T${booking.time}`),
              endTime: new Date(new Date(`${booking.date}T${booking.time}`).getTime() + (booking.duration || 60) * 60000),
              duration: booking.duration,
              status: booking.status,
              isPaid: booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid',
              totalPrice: booking.servicePrice,
              paidAmount: booking.paidAmount,
              notes: booking.notes,
            }}
            staff={memoizedStaff}
            services={memoizedServices}
            customers={memoizedCustomers}
            onSave={async (updatedBooking) => {
              // Log the received update payload
              if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('calendar-activity-log', {
                  detail: {
                    type: 'calendar-onsave-received',
                    message: `CalendarPage onSave received update for booking ${state.detailsBookingId}`,
                    data: {
                      bookingId: state.detailsBookingId,
                      services: updatedBooking.services,
                      servicesCount: updatedBooking.services?.length || 0
                    },
                    timestamp: new Date().toISOString()
                  }
                }));
              }
              
              const originalBooking = state.bookings.find(b => b.id === state.detailsBookingId);
              if (!originalBooking) return;
              
              // Parse the UTC time and convert to local date/time for display
              const utcDate = new Date(updatedBooking.startTime);
              // Get the local date string in YYYY-MM-DD format
              const year = utcDate.getFullYear();
              const month = String(utcDate.getMonth() + 1).padStart(2, '0');
              const day = String(utcDate.getDate()).padStart(2, '0');
              const localDateStr = `${year}-${month}-${day}`;
              
              // Get the local time in HH:mm format
              const hours = String(utcDate.getHours()).padStart(2, '0');
              const minutes = String(utcDate.getMinutes()).padStart(2, '0');
              const localTimeStr = `${hours}:${minutes}`;
              
              // 1. OPTIMISTIC UPDATE - Update UI immediately
              // Calculate total price and duration from services
              const totalPrice = updatedBooking.services?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || originalBooking.servicePrice;
              const totalDuration = updatedBooking.services?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || originalBooking.duration;
              
              // Calculate service name for display (join multiple services)
              const serviceName = updatedBooking.services && updatedBooking.services.length > 0
                ? updatedBooking.services.map((s: any) => s.name).join(' + ')
                : originalBooking.serviceName;
              
              // Get the staff name from the staff list
              const selectedStaff = memoizedStaff.find(s => s.id === updatedBooking.staffId);
              const staffName = selectedStaff?.name || updatedBooking.staffName || originalBooking.staffName;
              
              
              actions.updateBooking(state.detailsBookingId!, {
                date: localDateStr,
                time: localTimeStr,
                staffId: updatedBooking.staffId,
                staffName: staffName,
                notes: updatedBooking.notes,
                services: updatedBooking.services,
                serviceName: serviceName,
                servicePrice: totalPrice,
                duration: totalDuration
              });
              
              try {
                const originalStartTime = new Date(`${originalBooking.date}T${originalBooking.time}`);
                const newStartTime = typeof updatedBooking.startTime === 'string' 
                  ? new Date(updatedBooking.startTime)
                  : updatedBooking.startTime;
                const timeChanged = originalStartTime.getTime() !== newStartTime.getTime();
                const staffChanged = originalBooking.staffId !== updatedBooking.staffId;
                
                // Check if services have changed
                const servicesChanged = JSON.stringify(originalBooking.services) !== JSON.stringify(updatedBooking.services);
                
                // 2. Make API calls
                if (timeChanged || staffChanged || servicesChanged) {
                  // Use updateBooking API which supports all fields including services
                  
                  // Log service mapping for debugging
                  const mappedServices = updatedBooking.services?.map((s: any) => ({
                    serviceId: s.serviceId || s.id,  // Use serviceId if available, fallback to id
                    staffId: s.staffId || updatedBooking.staffId,
                    price: s.price || s.adjustedPrice,  // Support both field names
                    duration: s.duration
                  }));
                  
                  // Comprehensive logging for all updates
                  if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('calendar-activity-log', {
                      detail: {
                        type: 'api-call-prepare',
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
                            notes: updatedBooking.notes
                          }
                        },
                        timestamp: new Date().toISOString()
                      }
                    }));
                  }
                  
                  // Validate services before sending
                  if (mappedServices?.some(s => !s.serviceId)) {
                    toast({
                      title: "Error",
                      description: "Invalid service data. Please try editing the booking again.",
                      variant: "destructive"
                    });
                    // Don't send the update if service IDs are invalid
                    return;
                  }
                  
                  
                  await apiClient.updateBooking(state.detailsBookingId!, {
                    startTime: updatedBooking.startTime,
                    staffId: updatedBooking.staffId,
                    services: mappedServices,
                    notes: updatedBooking.notes
                  });
                } else if (originalBooking.notes !== updatedBooking.notes) {
                  // Only notes changed
                  await apiClient.updateBooking(state.detailsBookingId!, {
                    notes: updatedBooking.notes
                  });
                }
                
                // DON'T refresh from server - it returns old single-service format
                // and overwrites our multi-service data
                // The optimistic update already has the correct data
                
                // Optional: If we need to refresh payment status, do it separately
                // without overwriting the services data
                
                // Show detailed success toast
                const updatedTime = new Date(updatedBooking.startTime);
                const formattedTime = format(updatedTime, 'h:mm a');
                const formattedDate = format(updatedTime, 'MMM d, yyyy');
                
                toast({
                  title: 'Booking updated',
                  description: (
                    <div>
                      <p>{booking.customerName}'s appointment has been rescheduled.</p>
                      <p className="text-sm text-gray-600 mt-1">
                        New time: {formattedDate} at {formattedTime}
                      </p>
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
                  notes: originalBooking.notes
                });
                
                toast({
                  title: 'Error',
                  description: 'Failed to update booking',
                  variant: 'destructive',
                });
                
                // Re-throw to let slideout know save failed
                throw error;
              }
            }}
            onDelete={async (bookingId) => {
              addActivityLog('user', `Delete requested for booking ${bookingId}`);
              
              try {
                // Find the booking details before deletion
                const booking = state.bookings.find(b => b.id === bookingId);
                addActivityLog('state', `Deleting booking: ${booking?.customerName} - ${booking?.serviceName}`);
                
                // Call the delete API endpoint (moves to recycle bin with status DELETED)
                addActivityLog('api', `Calling DELETE /api/v2/bookings/${bookingId} - Moving to recycle bin`);
                await apiClient.deleteBooking(bookingId);
                
                addActivityLog('api', `Booking ${bookingId} moved to recycle bin (status: DELETED, auto-purge after 30 days)`);
                
                // Remove from local state to hide it from the calendar
                // The booking will be filtered out from any refresh for 30 seconds
                actions.removeBooking(bookingId);
                actions.closeDetailsSlideOut();
                
                addActivityLog('state', `Booking ${bookingId} removed from calendar view and added to deletion buffer`);
                
                toast({
                  title: 'Booking deleted',
                  description: 'The booking has been moved to the recycle bin and will be permanently deleted after 30 days',
                });
                
                // Refresh in background to sync with server
                setTimeout(async () => {
                  addActivityLog('state', `Starting background refresh after deletion`);
                  await refresh();
                  addActivityLog('state', `Background refresh completed - deleted bookings filtered out for 30 seconds`);
                }, 1000);
              } catch (error: any) {
                addActivityLog('error', `Failed to delete booking: ${error?.message || 'Unknown error'}`);
                
                toast({
                  title: 'Error',
                  description: `Failed to delete booking: ${error?.message || 'Please try again'}`,
                  variant: 'destructive',
                });
              }
            }}
            onStatusChange={async (bookingId, status) => {
              addActivityLog('user', `Status change requested for booking ${bookingId}: ${status}`);
              
              try {
                // Find current booking state
                const currentBooking = state.bookings.find(b => b.id === bookingId);
                addActivityLog('state', `Current booking status: ${currentBooking?.status || 'not found'}`);
                
                // Use proper API endpoints for status changes
                // NOTE: BookingActions sends uppercase status values (CONFIRMED, CANCELLED, etc)
                addActivityLog('api', `Calling API to update status to: ${status}`);
                
                switch (status) {
                  case 'IN_PROGRESS':
                  case 'in-progress':
                    await apiClient.startBooking(bookingId);
                    break;
                  case 'COMPLETED':
                  case 'completed':
                    await apiClient.completeBooking(bookingId);
                    break;
                  case 'CANCELLED':
                  case 'cancelled':
                    await apiClient.cancelBooking(bookingId, 'Cancelled by user');
                    break;
                  default:
                    // For other status changes (CONFIRMED, NO_SHOW), use the general update endpoint
                    await apiClient.updateBooking(bookingId, { status });
                }
                
                addActivityLog('api', `API call completed successfully`);
                
                // Transform status to lowercase for local state (UI expects lowercase)
                const localStatus = status.toLowerCase().replace(/_/g, '-');
                
                // OPTIMISTIC UPDATE: Update the booking status immediately in local state
                addActivityLog('state', `Applying optimistic update - setting status to: ${localStatus}`);
                addActivityLog('state', `Status will be preserved for 15 seconds during refreshes`);
                
                // Update the booking status in local state
                actions.updateBooking(bookingId, { status: localStatus as any });
                
                toast({
                  title: "Status updated",
                  description: `Booking marked as ${localStatus.replace('-', ' ')}`,
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
                addActivityLog('state', `Starting background refresh`);
                setTimeout(async () => {
                  // Refresh to sync with server state
                  await refresh();
                  addActivityLog('state', `Background refresh completed - status update preserved`);
                }, 1000);
              } catch (error: any) {
                addActivityLog('error', `Status update failed: ${error?.message || 'Unknown error'}`);
                
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
            onPaymentStatusChange={async (bookingId, isPaid, paidAmount) => {
              // Find the booking in state to log its current status
              const currentBooking = state.bookings.find(b => b.id === bookingId);
              
              try {
                if (isPaid) {
                  // Mark as paid - call API
                  toast({
                    title: "Processing payment...",
                    description: "Please wait while we mark this booking as paid.",
                  });
                  
                  const result = await apiClient.markBookingAsPaid(bookingId, 'CASH');
                  
                  if (result.success) {
                    
                    // Update local state immediately with all payment fields
                    // Use the paidAmount passed from payment dialog if available
                    const finalPaidAmount = paidAmount || result.booking?.paidAmount || currentBooking?.totalPrice || currentBooking?.servicePrice;
                    
                    actions.updateBooking(bookingId, { 
                      paymentStatus: 'PAID',
                      isPaid: true,
                      paidAmount: finalPaidAmount,
                      servicePrice: finalPaidAmount // Update servicePrice to reflect actual amount paid
                    });
                    
                    
                    toast({
                      title: "Payment recorded",
                      description: "Booking has been marked as paid successfully.",
                      variant: "default",
                      className: "bg-green-50 border-green-200",
                    });
                    
                    // Also refresh from server to ensure consistency
                    setTimeout(() => {
                      refresh();
                    }, 1000);
                  } else {
                    throw new Error(result.message || 'Failed to mark as paid');
                  }
                } else {
                  // For unpaid, just update local state (no API endpoint for this yet)
                  actions.updateBooking(bookingId, { paymentStatus: 'unpaid' });
                  
                  toast({
                    title: "Payment status updated",
                    description: "Booking has been marked as unpaid.",
                  });
                }
              } catch (error: any) {
                
                // Handle API errors properly - check all possible error formats
                let errorMessage = "Failed to update payment status";
                
                // Try different ways to get the error message
                if (typeof error === 'string') {
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
                    errorMessage = "An unknown error occurred. Check console for details.";
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
      {process.env.NODE_ENV === 'development' && (
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
                  <div className="text-sm text-gray-500 text-center py-4">No activity yet</div>
                ) : (
                  activityLog.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "text-xs p-2 rounded border",
                        log.type === 'event' && "bg-blue-50 border-blue-200",
                        log.type === 'api' && "bg-green-50 border-green-200",
                        log.type === 'state' && "bg-yellow-50 border-yellow-200",
                        log.type === 'error' && "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-mono text-gray-500">{log.timestamp}</span>
                          <span className={cn(
                            "ml-2 font-semibold",
                            log.type === 'event' && "text-blue-700",
                            log.type === 'api' && "text-green-700",
                            log.type === 'state' && "text-yellow-700",
                            log.type === 'error' && "text-red-700"
                          )}>
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