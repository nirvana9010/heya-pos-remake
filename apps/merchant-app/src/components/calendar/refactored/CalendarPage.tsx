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
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Home, 
  Plus,
  RefreshCw,
  Filter,
  Users
} from 'lucide-react';
import { BookingSlideOut } from '@/components/BookingSlideOut';
import { BookingDetailsSlideOut } from '@/components/BookingDetailsSlideOut';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import type { Booking, BookingStatus } from './types';

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
  
  // Handle booking click
  const handleBookingClick = useCallback((booking: Booking) => {
    console.log('Booking clicked:', booking.id, booking.customerName);
    actions.openDetailsSlideOut(booking.id);
  }, [actions]);
  
  // Handle time slot click
  const handleTimeSlotClick = useCallback((date: Date, time: string, staffId: string | null) => {
    // Open booking slide out with pre-filled data
    actions.openBookingSlideOut();
    // You might want to pass this data to the slide out somehow
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
                onDragEnd={handleDragEndEvent}
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
        onClose={() => actions.closeBookingSlideOut()}
        staff={state.staff.map(s => ({
          id: s.id,
          name: s.name,
          color: s.color,
        }))}
        services={state.services.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: s.duration,
          categoryName: s.categoryName,
        }))}
        customers={state.customers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || c.mobile || '',
          mobile: c.mobile,
          email: c.email,
        }))}
        onSave={async (bookingData) => {
          try {
            // Create booking via API
            const newBooking = await apiClient.createBooking({
              customerId: bookingData.customerId,
              serviceId: bookingData.serviceId,
              staffId: bookingData.staffId,
              startTime: bookingData.startTime.toISOString(),
              notes: bookingData.notes,
            });
            
            // Transform and add to local state
            const startTime = new Date(newBooking.startTime);
            const transformedBooking = {
              id: newBooking.id,
              date: format(startTime, 'yyyy-MM-dd'),
              time: format(startTime, 'HH:mm'),
              duration: newBooking.duration,
              status: newBooking.status as BookingStatus,
              customerId: newBooking.customerId,
              customerName: newBooking.customerName,
              customerPhone: newBooking.customerPhone,
              customerEmail: newBooking.customerEmail,
              serviceId: bookingData.serviceId,
              serviceName: newBooking.serviceName || 'Service',
              servicePrice: newBooking.price || newBooking.totalAmount || 0,
              staffId: bookingData.staffId || null,
              staffName: newBooking.staffName || 'Unassigned',
              notes: bookingData.notes,
              paymentStatus: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            actions.addBooking(transformedBooking);
            actions.closeBookingSlideOut();
          } catch (error) {
            console.error('Failed to create booking:', error);
            // Show error toast
          }
        }}
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
            staff={state.staff.map(s => ({
              id: s.id,
              name: s.name,
              color: s.color,
            }))}
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