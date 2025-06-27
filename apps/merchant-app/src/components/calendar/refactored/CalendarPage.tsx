'use client';

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
    console.log('Booking clicked:', booking.id, booking.customerName);
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
      
      console.log('🔍 [CalendarPage] Processing booking with staffId:', {
        value: bookingData.staffId,
        type: typeof bookingData.staffId,
        isNextAvailable: bookingData.staffId === NEXT_AVAILABLE_STAFF_ID,
        isValid: isValidStaffId(bookingData.staffId)
      });
      
      try {
        // Check if we already have a valid staff ID
        if (isValidStaffId(bookingData.staffId)) {
          finalStaffId = bookingData.staffId;
          console.log('✅ [CalendarPage] Using provided valid staffId:', finalStaffId);
        } else {
          // Need to resolve "Next Available" or handle invalid staffId
          console.log('🔄 [CalendarPage] Resolving staff assignment...');
          
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
          console.log(`✅ [CalendarPage] Auto-assigned to: ${availabilityResult.assignedStaff?.name}`);
        }
      } catch (error) {
        // Enhanced error handling
        console.error('❌ [CalendarPage] Staff assignment failed:', error);
        throw new Error(
          error instanceof Error ? 
            error.message : 
            'Unable to assign staff. Please select a specific staff member.'
        );
      }
      
      // Final validation - MUST have a valid UUID at this point
      if (!isValidStaffId(finalStaffId)) {
        console.error('❌ [CalendarPage] Final validation failed:', {
          finalStaffId,
          type: typeof finalStaffId
        });
        throw new Error('System error: Invalid staff assignment. Please try again.');
      }
      
      // Prepare the booking request data
      const bookingRequest = {
        customerId: bookingData.customerId,
        locationId: locationId,
        services: [{
          serviceId: bookingData.serviceId,
          staffId: finalStaffId
        }],
        staffId: finalStaffId,
        startTime: bookingData.startTime.toISOString(),
        notes: bookingData.notes || '',
      };
      
      
      const newBooking = await apiClient.createBooking(bookingRequest);
      
      // Transform and add to local state
      // The response is already transformed by the bookings client
      const startTime = new Date(newBooking.startTime);
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
        serviceId: bookingData.serviceId,
        serviceName: newBooking.serviceName,
        servicePrice: newBooking.price || newBooking.totalAmount || 0,
        staffId: newBooking.staffId || null,
        staffName: newBooking.staffName || 'Unassigned',
        notes: newBooking.notes || '',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      actions.addBooking(transformedBooking);
      actions.closeBookingSlideOut();
      
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
      console.error('Failed to create booking:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        bookingData
      });
      
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
    console.log('Drag start - active booking:', booking);
    if (booking) {
      setActiveBooking(booking);
      setIsDragging(true);
    }
  }, [state.bookings]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over && over.data.current?.date && over.data.current?.time) {
      const targetData = over.data.current;
      console.log('Drag over target data:', targetData);
      
      const staffMember = state.staff.find(s => s.id === targetData.staffId);
      
      try {
        // Validate time format (should be HH:MM)
        const timeMatch = targetData.time.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
          console.error('Invalid time format in drag over:', targetData.time);
          setDragOverSlot(null);
          return;
        }
        
        const [, hoursStr, minutesStr] = timeMatch;
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        
        // Create date from string (should be YYYY-MM-DD format)
        const startTime = new Date(targetData.date + 'T00:00:00');
        if (isNaN(startTime.getTime())) {
          console.error('Invalid date in drag over:', targetData.date);
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
        console.error('Error parsing drag over data:', error, targetData);
        setDragOverSlot(null);
      }
    } else {
      setDragOverSlot(null);
    }
  }, [state.staff]);
  
  // Handle drag end
  const handleDragEndEvent = useCallback(async (event: DragEndEvent) => {
    console.log('Drag end event triggered:', event);
    const { active, over } = event;
    
    // Clean up drag state
    setIsDragging(false);
    setActiveBooking(null);
    setDragOverSlot(null);
    
    if (!over || !active || !activeBooking) {
      console.log('No valid drop target or active booking');
      return;
    }
    
    // Get drop data
    const dropData = over.data.current;
    if (!dropData || !dropData.date || !dropData.time) {
      console.error('Invalid drop data', dropData);
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
      console.error('Error parsing original booking date:', activeBooking.date, error);
      return;
    }
    
    const isSameSlot = originalDate === date && 
                      activeBooking.time === time && 
                      activeBooking.staffId === staffId;
    
    if (isSameSlot) {
      console.log('Dropped on same slot, no update needed');
      return;
    }
    
    console.log('Updating booking via drag:', { 
      bookingId: activeBooking.id, 
      date, 
      time, 
      staffId,
      oldStaffId: activeBooking.staffId 
    });
    
    try {
      await updateBookingTime(activeBooking.id, date, time, staffId);
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  }, [activeBooking, updateBookingTime]);
  
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
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
            <div className="flex items-center gap-2">{/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
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
            
            {/* Show unassigned toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show Unassigned</span>
              <Switch
                checked={state.showUnassignedColumn}
                onCheckedChange={() => actions.toggleUnassignedColumn()}
              />
            </div>
            
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
                    <SelectItem value="30">30m</SelectItem>
                    <SelectItem value="60">1h</SelectItem>
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
                onTimeSlotClick={handleTimeSlotClick}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEndEvent}
                activeBooking={activeBooking}
                dragOverSlot={dragOverSlot}
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
              isPaid: booking.paymentStatus === 'paid',
              totalPrice: booking.servicePrice,
              notes: booking.notes,
            }}
            staff={memoizedStaff}
            onSave={(updatedBooking) => {
              // Handle booking update
              actions.updateBooking(state.detailsBookingId!, updatedBooking);
            }}
            onDelete={(bookingId) => {
              actions.removeBooking(bookingId);
              actions.closeDetailsSlideOut();
            }}
            onStatusChange={(bookingId, status) => {
              actions.updateBooking(bookingId, { status: status as any });
            }}
            onPaymentStatusChange={(bookingId, isPaid) => {
              actions.updateBooking(bookingId, { paymentStatus: isPaid ? 'paid' : 'unpaid' });
            }}
          />
        );
      })()}
      </div>
    </TooltipProvider>
  );
}