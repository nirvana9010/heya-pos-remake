"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  Plus, 
  Filter,
  MoreVertical,
  Phone,
  DollarSign,
  Check,
  X,
  AlertTriangle,
  WifiOff,
  Wifi
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { Skeleton, CalendarSkeleton } from "@heya-pos/ui";
import { 
  Spinner, 
  SuccessCheck, 
  ConnectionStatus, 
  LastUpdated, 
  FadeIn,
  PulseOverlay 
} from "@heya-pos/ui";
import { 
  format, 
  addDays, 
  addWeeks, 
  subDays,
  subWeeks,
  startOfWeek, 
  endOfWeek,
  isSameDay, 
  isToday,
  parseISO,
} from "date-fns";
import { BookingSlideOut } from "@/components/BookingSlideOut";
import { BookingDetailsSlideOut } from "@/components/BookingDetailsSlideOut";
import { useToast } from "@heya-pos/ui";

// Types remain the same...
interface Staff {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isVisible: boolean;
  isAvailable: boolean;
}

interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  status: "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  price: number;
  notes?: string;
}

export default function CalendarPageEnhanced() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<"day" | "week">("day");
  const [timeInterval, setTimeInterval] = useState<15 | 30 | 60>(15);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [switchingDate, setSwitchingDate] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "polling" | "disconnected">("connected");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showSavedIndicator, setShowSavedIndicator] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock staff data with loading state
  const mockStaff: Staff[] = [
    { id: "1", name: "Emma Wilson", color: "#8B5CF6", isVisible: true, isAvailable: true },
    { id: "2", name: "James Brown", color: "#EC4899", isVisible: true, isAvailable: true },
    { id: "3", name: "Sophie Chen", color: "#10B981", isVisible: true, isAvailable: false },
    { id: "4", name: "Michael Davis", color: "#F59E0B", isVisible: true, isAvailable: true },
  ];

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setStaff(mockStaff);
        // Load bookings would go here
        setBookings([]);
        setLastUpdated(new Date());
      } catch (error) {
        toast({
          title: "Error loading calendar",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load bookings when date changes
  useEffect(() => {
    if (!loading) {
      loadBookingsForDate();
    }
  }, [selectedDate, viewType]);

  const loadBookingsForDate = async () => {
    try {
      setSwitchingDate(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Would load actual bookings here
      setBookings([
        {
          id: "1",
          customerId: "1",
          customerName: "Jane Smith",
          customerPhone: "(555) 123-4567",
          serviceName: "Deep Tissue Massage",
          staffId: "1",
          staffName: "Emma Wilson",
          startTime: new Date(selectedDate.setHours(10, 0)),
          endTime: new Date(selectedDate.setHours(11, 0)),
          status: "confirmed",
          price: 120
        }
      ]);
      
      setLastUpdated(new Date());
    } finally {
      setSwitchingDate(false);
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setUpdatingBookingId(bookingId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: newStatus as any } : b
      ));
      
      // Show success indicator
      setShowSavedIndicator(bookingId);
      setTimeout(() => setShowSavedIndicator(null), 2000);
      
      toast({
        title: "Booking updated",
        description: "Status changed successfully"
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setUpdatingBookingId(null);
    }
  };

  // Calendar time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    const startHour = 8;
    const endHour = 20;
    const interval = timeInterval;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        slots.push({
          hour,
          minute,
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
    return slots;
  }, [timeInterval]);

  // Render loading skeleton
  if (loading) {
    return (
      <div className="h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-500">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
              <ConnectionStatus status={connectionStatus} />
              <LastUpdated timestamp={lastUpdated} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = viewType === "day" 
                    ? subDays(selectedDate, 1)
                    : subWeeks(selectedDate, 1);
                  setSelectedDate(newDate);
                }}
                disabled={switchingDate}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="px-3 text-sm font-medium min-w-[140px] text-center">
                {switchingDate ? (
                  <Spinner className="mx-auto" />
                ) : viewType === "day" ? (
                  format(selectedDate, "MMM d, yyyy")
                ) : (
                  `${format(startOfWeek(selectedDate), "MMM d")} - ${format(endOfWeek(selectedDate), "MMM d")}`
                )}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newDate = viewType === "day" 
                    ? addDays(selectedDate, 1)
                    : addWeeks(selectedDate, 1);
                  setSelectedDate(newDate);
                }}
                disabled={switchingDate}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setIsCreateBookingOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden relative">
        {switchingDate && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <Spinner className="h-8 w-8 text-purple-600" />
          </div>
        )}
        
        <div className="h-full overflow-auto">
          <div className="min-w-[800px]">
            {/* Staff Headers */}
            <div className="sticky top-0 z-20 bg-white border-b">
              <div className="flex">
                <div className="w-24 border-r bg-gray-50 p-4">
                  <span className="text-sm font-medium text-gray-600">Time</span>
                </div>
                {staff.filter(s => s.isVisible).map(member => (
                  <div 
                    key={member.id} 
                    className={cn(
                      "flex-1 border-r p-4 transition-opacity",
                      !member.isAvailable && "opacity-50"
                    )}
                    style={{ minWidth: "200px" }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback 
                          style={{ backgroundColor: member.color }}
                          className="text-white text-sm"
                        >
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        {!member.isAvailable && (
                          <Badge variant="secondary" className="text-xs">Unavailable</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            {timeSlots.map((slot, index) => (
              <div key={`${slot.hour}-${slot.minute}`} className="flex border-b">
                <div className="w-24 border-r bg-gray-50 p-2 text-center">
                  <span className="text-sm text-gray-600">{slot.time}</span>
                </div>
                {staff.filter(s => s.isVisible).map(member => {
                  const booking = bookings.find(b => 
                    b.staffId === member.id &&
                    b.startTime.getHours() === slot.hour &&
                    b.startTime.getMinutes() === slot.minute
                  );

                  return (
                    <div 
                      key={member.id} 
                      className="flex-1 border-r p-1 relative group"
                      style={{ minWidth: "200px", minHeight: "60px" }}
                    >
                      {booking && (
                        <FadeIn delay={index * 20}>
                          <div
                            className={cn(
                              "absolute inset-1 rounded-lg p-2 cursor-pointer transition-all",
                              "hover:shadow-md hover:scale-[1.02]",
                              booking.status === "confirmed" && "bg-blue-100 border-blue-300",
                              booking.status === "in-progress" && "bg-yellow-100 border-yellow-300",
                              booking.status === "completed" && "bg-green-100 border-green-300",
                              booking.status === "cancelled" && "bg-gray-100 border-gray-300",
                              showSavedIndicator === booking.id && "ring-2 ring-green-400",
                              "border"
                            )}
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <PulseOverlay visible={updatingBookingId === booking.id} />
                            
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">
                                  {booking.customerName}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {booking.serviceName}
                                </p>
                              </div>
                              
                              {updatingBookingId === booking.id ? (
                                <Spinner className="h-4 w-4" />
                              ) : showSavedIndicator === booking.id ? (
                                <SuccessCheck className="h-4 w-4" />
                              ) : (
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "text-xs",
                                    booking.status === "confirmed" && "bg-blue-200",
                                    booking.status === "in-progress" && "bg-yellow-200",
                                    booking.status === "completed" && "bg-green-200"
                                  )}
                                >
                                  {booking.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </FadeIn>
                      )}
                      
                      {!booking && member.isAvailable && (
                        <button
                          className="w-full h-full hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            // Open booking creation with this time slot
                            setIsCreateBookingOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 text-gray-400 mx-auto" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Creation/Details Panels */}
      <BookingSlideOut
        isOpen={isCreateBookingOpen}
        onClose={() => setIsCreateBookingOpen(false)}
        onSuccess={() => {
          loadBookingsForDate();
          setIsCreateBookingOpen(false);
        }}
      />

      {selectedBooking && (
        <BookingDetailsSlideOut
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={(status) => updateBookingStatus(selectedBooking.id, status)}
          isUpdating={updatingBookingId === selectedBooking.id}
        />
      )}
    </div>
  );
}