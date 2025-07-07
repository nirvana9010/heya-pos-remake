'use client';

// Build timestamp - updates when file is saved
const __BUILD_TIME__ = new Date().toLocaleString();

import React, { useCallback } from 'react';
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
import { getAvailableStaff, ensureValidStaffId, isValidStaffId } from '@/lib/services/mock-availability.service';
import { NEXT_AVAILABLE_STAFF_ID, isNextAvailableStaff } from '@/lib/constants/booking-constants';
import { bookingEvents } from '@/lib/services/booking-events';
import { useAuth } from '@/lib/auth/auth-provider';
import { useNotifications } from '@/contexts/notifications-context';

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
  const { refreshNotifications } = useNotifications();
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
    const allStatuses = ['confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];
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
  
  // Handle booking click
  const handleBookingClick = useCallback((booking: Booking) => {
    actions.openDetailsSlideOut(booking.id);
  }, [actions]);
  
  // Handle time slot click
  const handleTimeSlotClick = useCallback((date: Date, time: string, staffId: string | null) => {
    // Set booking slide out data before opening
    setBookingSlideOutData({
      date,
      time,
      staffId
    });
    actions.openBookingSlideOut();
  }, [actions]);
  
  // Memoize booking slide out callbacks to prevent infinite loops
  const handleBookingSlideOutClose = useCallback(() => {
    actions.closeBookingSlideOut();
    setBookingSlideOutData(null);
  }, [actions]);
  
  const handleBookingSlideOutSave = useCallback(async (bookingData: any) => {
    try {
      // Get locationId from localStorage or fetch it
      let locationId = null;
      const merchantData = localStorage.getItem('merchant');
      if (merchantData) {
        const merchant = JSON.parse(merchantData);
        locationId = merchant.locations?.[0];
      }
      
      // If no locationId in merchant data, fetch locations
      if (!locationId) {
        const locations = await apiClient.getLocations();
        if (locations && locations.length > 0) {
          locationId = locations[0].id;
        }
      }
      
      if (!locationId) {
        throw new Error('No location found. Please configure at least one location.');
      }
      
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
            console.error('Failed to handle walk-in customer:', error);
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
            name: `${newCustomer.firstName} ${newCustomer.lastName}`.trim()
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
      
      const bookingRequest = {
        customerId: finalCustomerId,
        locationId: locationId,
        services: services,
        staffId: finalStaffId,
        startTime: bookingData.startTime.toISOString(),
        notes: bookingData.notes || '',
      };
      
      
      const newBooking = await apiClient.createBooking(bookingRequest);
      
      // Transform and add to local state
      // The response is already transformed by the bookings client
      const startTime = new Date(newBooking.startTime);
      
      // For multi-service bookings, we need to get the first service info for display
      // The calendar currently shows single bookings, so we'll use the first service
      let serviceId = bookingData.serviceId;
      let serviceName = newBooking.serviceName;
      let servicePrice = newBooking.price || newBooking.totalAmount || 0;
      
      if (bookingData.services && Array.isArray(bookingData.services) && bookingData.services.length > 0) {
        // Multi-service booking - use first service for display
        serviceId = bookingData.services[0].serviceId;
        // TODO: The API response for multi-service bookings might need adjustment
        // For now, we'll use the response fields as-is
      }
      
      const transformedBooking = {
        id: newBooking.id,
        date: format(startTime, 'yyyy-MM-dd'),
        time: format(startTime, 'HH:mm'),
        duration: newBooking.duration || 30,
        status: newBooking.status as BookingStatus,
        customerId: newBooking.customerId,
        customerName: newBooking.customerName,
        customerPhone: newBooking.customerPhone || '',
        customerEmail: newBooking.customerEmail || '',
        serviceId: serviceId,
        serviceName: serviceName,
        servicePrice: servicePrice,
        staffId: newBooking.staffId || null,
        staffName: newBooking.staffName || 'Unassigned',
        notes: newBooking.notes || '',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      actions.addBooking(transformedBooking);
      actions.closeBookingSlideOut();
      
      // Broadcast the booking creation to other tabs
      bookingEvents.broadcast({
        type: 'booking_created',
        bookingId: transformedBooking.id,
        source: 'slideout'
      });
      
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
              
              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
                title="Manually refresh calendar"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            
            {/* New booking button */}
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              size="sm"
              onClick={() => actions.openBookingSlideOut()}
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
                {state.selectedStaffIds.length}/{state.staff.length} staff
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
                          if (state.selectedStaffIds.length === state.staff.length) {
                            actions.setStaffFilter([]);
                          } else {
                            actions.setStaffFilter(state.staff.map(s => s.id));
                          }
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        {state.selectedStaffIds.length === state.staff.length ? "Clear all" : "Select all"}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {state.staff.map(member => (
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
            
            {/* Time interval selector - only for day view */}
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
            )}
          </div>
        </div>
      </div>
      
      {/* Calendar Content */}
      <div className="flex-1 relative">
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
        
        return (
          <BookingDetailsSlideOut
            isOpen={state.isDetailsSlideOutOpen}
            onClose={() => actions.closeDetailsSlideOut()}
            booking={{
              id: booking.id,
              customerName: booking.customerName,
              customerPhone: booking.customerPhone || '',
              customerEmail: booking.customerEmail,
              serviceName: booking.serviceName,
              staffName: booking.staffName,
              staffId: booking.staffId || '',
              startTime: new Date(`${booking.date}T${booking.time}`),
              endTime: new Date(new Date(`${booking.date}T${booking.time}`).getTime() + booking.duration * 60000),
              status: booking.status,
              isPaid: booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid',
              totalPrice: booking.servicePrice,
              notes: booking.notes,
            }}
            staff={memoizedStaff}
            onSave={async (updatedBooking) => {
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
              actions.updateBooking(state.detailsBookingId!, {
                date: localDateStr,
                time: localTimeStr,
                staffId: updatedBooking.staffId,
                staffName: updatedBooking.staffName,
                notes: updatedBooking.notes
              });
              
              try {
                const originalStartTime = new Date(`${originalBooking.date}T${originalBooking.time}`);
                const newStartTime = typeof updatedBooking.startTime === 'string' 
                  ? new Date(updatedBooking.startTime)
                  : updatedBooking.startTime;
                const timeChanged = originalStartTime.getTime() !== newStartTime.getTime();
                const staffChanged = originalBooking.staffId !== updatedBooking.staffId;
                
                // 2. Make API calls
                if (timeChanged || staffChanged) {
                  await apiClient.rescheduleBooking(state.detailsBookingId!, {
                    startTime: updatedBooking.startTime,
                    staffId: updatedBooking.staffId
                  });
                }
                
                // Update notes if changed
                if (originalBooking.notes !== updatedBooking.notes) {
                  await apiClient.updateBooking(state.detailsBookingId!, {
                    notes: updatedBooking.notes
                  });
                }
                
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
                
                console.error('Error updating booking:', error);
                toast({
                  title: 'Error',
                  description: 'Failed to update booking',
                  variant: 'destructive',
                });
                
                // Re-throw to let slideout know save failed
                throw error;
              }
            }}
            onDelete={(bookingId) => {
              actions.removeBooking(bookingId);
              actions.closeDetailsSlideOut();
            }}
            onStatusChange={async (bookingId, status) => {
              try {
                // Use proper API endpoints for status changes
                switch (status) {
                  case 'in-progress':
                    await apiClient.startBooking(bookingId);
                    break;
                  case 'completed':
                    await apiClient.completeBooking(bookingId);
                    break;
                  case 'cancelled':
                    await apiClient.cancelBooking(bookingId, 'Cancelled by user');
                    break;
                  default:
                    // For other status changes (confirmed, no-show), use the general update endpoint
                    await apiClient.updateBooking(bookingId, { status });
                }
                
                // Update local state after successful API call
                actions.updateBooking(bookingId, { status: status as any });
                
                // Refresh calendar data after a short delay (like mark-as-paid does)
                setTimeout(() => {
                  refresh();
                }, 1000);
                
                toast({
                  title: "Status updated",
                  description: `Booking marked as ${status.replace('-', ' ')}`,
                  variant: "default",
                  className: "bg-green-50 border-green-200",
                });
              } catch (error: any) {
                console.error('Failed to update booking status:', error);
                
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
            onPaymentStatusChange={async (bookingId, isPaid) => {
              console.log('🔵 onPaymentStatusChange called:', { bookingId, isPaid });
              
              // Find the booking in state to log its current status
              const currentBooking = state.bookings.find(b => b.id === bookingId);
              console.log('📊 Current booking state:', {
                id: currentBooking?.id,
                bookingNumber: currentBooking?.bookingNumber,
                customerName: currentBooking?.customerName,
                paymentStatus: currentBooking?.paymentStatus,
                isPaid: currentBooking?.isPaid
              });
              
              try {
                if (isPaid) {
                  // Mark as paid - call API
                  console.log('🟢 Marking as paid...');
                  toast({
                    title: "Processing payment...",
                    description: "Please wait while we mark this booking as paid.",
                  });
                  
                  console.log('🟡 Calling apiClient.markBookingAsPaid...');
                  const result = await apiClient.markBookingAsPaid(bookingId, 'CASH');
                  console.log('🟣 API Result:', result);
                  console.log('🟣 Result type:', typeof result);
                  console.log('🟣 Result keys:', result ? Object.keys(result) : 'null');
                  console.log('🟣 Result.success:', result?.success);
                  
                  if (result.success) {
                    console.log('✅ Success! Updating local state...');
                    
                    // Update local state immediately with all payment fields
                    actions.updateBooking(bookingId, { 
                      paymentStatus: 'PAID',
                      isPaid: true,
                      paidAmount: result.booking?.paidAmount || currentBooking?.totalPrice || currentBooking?.servicePrice
                    });
                    
                    console.log('📝 Local state updated');
                    
                    toast({
                      title: "Payment recorded",
                      description: "Booking has been marked as paid successfully.",
                      variant: "default",
                      className: "bg-green-50 border-green-200",
                    });
                    
                    // Also refresh from server to ensure consistency
                    console.log('🔄 Refreshing bookings data...');
                    setTimeout(() => {
                      refresh();
                    }, 1000);
                  } else {
                    console.log('❌ result.success is false or undefined');
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
                console.error('Failed to update payment status - Full error:', error);
                console.error('Error type:', typeof error);
                console.error('Error keys:', error ? Object.keys(error) : 'null');
                console.error('Error message directly:', error?.message);
                console.error('Error data:', error?.data);
                
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
    </TooltipProvider>
  );
}