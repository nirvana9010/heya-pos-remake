"use client";

import { useState, useEffect, useMemo } from "react";
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
  Scissors,
  Sparkles,
  Hand,
  Palette,
  Check,
  X,
  AlertTriangle,
  Play,
  Pause,
  CalendarDays,
  Home
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Card, CardContent } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { BookingSlideOut } from "@/components/BookingSlideOut";

interface Staff {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isVisible: boolean;
  isAvailable: boolean;
}

interface BusinessHours {
  start: string; // "09:00"
  end: string;   // "18:00"
  days: number[]; // [1,2,3,4,5] for Mon-Fri
}

type TimeInterval = 15 | 30 | 60;
type ViewType = "day" | "week" | "month";

interface CalendarFilters {
  showCompleted: boolean;
  showCancelled: boolean;
  showBlocked: boolean;
}

interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  serviceIcon: "scissors" | "sparkles" | "hand" | "palette";
  staffId: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  status: "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  isPaid: boolean;
  totalPrice: number;
  notes?: string;
}

const mockStaff: Staff[] = [
  { id: "1", name: "Emma Wilson", color: "#7C3AED", isVisible: true, isAvailable: true, avatar: "/placeholder-avatar.jpg" },
  { id: "2", name: "James Brown", color: "#14B8A6", isVisible: true, isAvailable: true, avatar: "/placeholder-avatar.jpg" },
  { id: "3", name: "Sophie Chen", color: "#F59E0B", isVisible: true, isAvailable: false, avatar: "/placeholder-avatar.jpg" },
  { id: "4", name: "Michael Davis", color: "#EF4444", isVisible: true, isAvailable: true, avatar: "/placeholder-avatar.jpg" },
];

const mockBusinessHours: BusinessHours = {
  start: "09:00",
  end: "18:00",
  days: [1, 2, 3, 4, 5] // Mon-Fri
};

const mockBookings: Booking[] = [
  {
    id: "1",
    customerId: "c1",
    customerName: "Sarah Johnson",
    customerPhone: "+1 (555) 123-4567",
    serviceName: "Manicure & Pedicure",
    serviceIcon: "palette",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 4, 29, 9, 30),
    endTime: new Date(2025, 4, 29, 10, 30),
    status: "confirmed",
    isPaid: true,
    totalPrice: 85,
    notes: "First time client"
  },
  {
    id: "2",
    customerId: "c2",
    customerName: "Michael Chen",
    customerPhone: "+1 (555) 234-5678",
    serviceName: "Hair Color",
    serviceIcon: "scissors",
    staffId: "2",
    staffName: "James Brown",
    startTime: new Date(2025, 4, 29, 10, 0),
    endTime: new Date(2025, 4, 29, 11, 0),
    status: "in-progress",
    isPaid: false,
    totalPrice: 120
  },
  {
    id: "3",
    customerId: "c3",
    customerName: "Emily Brown",
    customerPhone: "+1 (555) 345-6789",
    serviceName: "Facial Treatment",
    serviceIcon: "sparkles",
    staffId: "3",
    staffName: "Sophie Chen",
    startTime: new Date(2025, 4, 29, 11, 30),
    endTime: new Date(2025, 4, 29, 12, 0),
    status: "confirmed",
    isPaid: true,
    totalPrice: 110
  },
  {
    id: "4",
    customerId: "c4",
    customerName: "Lisa Wang",
    customerPhone: "+1 (555) 456-7890",
    serviceName: "Eyebrow Threading",
    serviceIcon: "sparkles",
    staffId: "4",
    staffName: "Michael Davis",
    startTime: new Date(2025, 4, 29, 14, 30),
    endTime: new Date(2025, 4, 29, 15, 0),
    status: "completed",
    isPaid: false,
    totalPrice: 35
  },
  {
    id: "5",
    customerId: "c5",
    customerName: "Jennifer Martinez",
    customerPhone: "+1 (555) 567-8901",
    serviceName: "Deep Tissue Massage",
    serviceIcon: "hand",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 4, 29, 13, 15),
    endTime: new Date(2025, 4, 29, 14, 15),
    status: "confirmed",
    isPaid: true,
    totalPrice: 90
  },
  {
    id: "6",
    customerId: "c6",
    customerName: "Robert Kim",
    customerPhone: "+1 (555) 678-9012",
    serviceName: "Haircut & Beard Trim",
    serviceIcon: "scissors",
    staffId: "2",
    staffName: "James Brown",
    startTime: new Date(2025, 4, 29, 15, 30),
    endTime: new Date(2025, 4, 29, 16, 30),
    status: "confirmed",
    isPaid: false,
    totalPrice: 65
  }
];

const mockServices = [
  { id: "1", name: "Haircut & Style", price: 45, duration: 30, categoryName: "Hair" },
  { id: "2", name: "Hair Color", price: 120, duration: 90, categoryName: "Hair" },
  { id: "3", name: "Manicure & Pedicure", price: 85, duration: 60, categoryName: "Nails" },
  { id: "4", name: "Facial Treatment", price: 110, duration: 60, categoryName: "Facials" },
  { id: "5", name: "Deep Tissue Massage", price: 90, duration: 60, categoryName: "Massages" },
  { id: "6", name: "Eyebrow Threading", price: 35, duration: 30, categoryName: "Facials" }
];

const mockCustomers = [
  { id: "c1", name: "Sarah Johnson", phone: "+1 (555) 123-4567", email: "sarah@example.com" },
  { id: "c2", name: "Michael Chen", phone: "+1 (555) 234-5678", email: "michael@example.com" },
  { id: "c3", name: "Emily Brown", phone: "+1 (555) 345-6789", email: "emily@example.com" },
  { id: "c4", name: "Lisa Wang", phone: "+1 (555) 456-7890", email: "lisa@example.com" }
];

// Generate time slots based on business hours and interval
const generateTimeSlots = (businessHours: BusinessHours, interval: TimeInterval) => {
  const slots = [];
  const [startHour, startMinute] = businessHours.start.split(':').map(Number);
  const [endHour, endMinute] = businessHours.end.split(':').map(Number);
  
  for (let hour = startHour; hour < endHour || (hour === endHour && startMinute === 0); hour++) {
    if (hour >= endHour && endMinute === 0) break;
    
    const minutes = interval === 60 ? [0] : interval === 30 ? [0, 30] : [0, 15, 30, 45];
    
    for (const minute of minutes) {
      if (hour === endHour && minute >= endMinute) break;
      if (hour === startHour && minute < startMinute) continue;
      
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      
      const isHour = minute === 0;
      const isMinorInterval = interval === 15 && (minute === 15 || minute === 45);
      
      slots.push({
        time,
        label: format(time, isHour ? "h a" : "h:mm"),
        isHour,
        isMinorInterval,
        height: interval === 60 ? 60 : interval === 30 ? 30 : 24
      });
    }
  }
  
  return slots;
};

const getServiceIcon = (icon: string) => {
  switch (icon) {
    case "scissors": return <Scissors className="h-3 w-3" />;
    case "sparkles": return <Sparkles className="h-3 w-3" />;
    case "hand": return <Hand className="h-3 w-3" />;
    case "palette": return <Palette className="h-3 w-3" />;
    default: return <Scissors className="h-3 w-3" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed": return "bg-purple-600 text-white";
    case "in-progress": return "bg-teal-600 text-white animate-pulse";
    case "completed": return "bg-gray-500 text-white";
    case "cancelled": return "bg-red-600/70 text-white line-through";
    case "no-show": return "bg-orange-500 text-white";
    default: return "bg-gray-400 text-white";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "confirmed": return <Clock className="h-3 w-3" />;
    case "in-progress": return <Play className="h-3 w-3" />;
    case "completed": return <Check className="h-3 w-3" />;
    case "cancelled": return <X className="h-3 w-3" />;
    case "no-show": return <AlertTriangle className="h-3 w-3" />;
    default: return <Clock className="h-3 w-3" />;
  }
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("day");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(15);
  const [businessHours] = useState<BusinessHours>(mockBusinessHours);
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [filters, setFilters] = useState<CalendarFilters>({
    showCompleted: true,
    showCancelled: false,
    showBlocked: false
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{staffId: string, time: Date} | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [newBookingData, setNewBookingData] = useState<{
    date?: Date;
    time?: Date;
    staffId?: string;
  }>({});

  const timeSlots = useMemo(() => generateTimeSlots(businessHours, timeInterval), [businessHours, timeInterval]);
  const visibleStaff = staff.filter(s => s.isVisible);
  
  const filteredBookings = useMemo(() => {
    return mockBookings.filter(booking => {
      if (!filters.showCompleted && booking.status === "completed") return false;
      if (!filters.showCancelled && booking.status === "cancelled") return false;
      if (!visibleStaff.find(s => s.id === booking.staffId)) return false;
      return isSameDay(booking.startTime, currentDate);
    });
  }, [currentDate, filters, visibleStaff]);

  const toggleStaffVisibility = (staffId: string) => {
    setStaff(prev => prev.map(s => 
      s.id === staffId ? { ...s, isVisible: !s.isVisible } : s
    ));
  };

  const getBookingPosition = (booking: Booking) => {
    const [businessStartHour, businessStartMinute] = businessHours.start.split(':').map(Number);
    const startHour = booking.startTime.getHours();
    const startMinute = booking.startTime.getMinutes();
    const endHour = booking.endTime.getHours();
    const endMinute = booking.endTime.getMinutes();
    
    // Calculate position based on time interval
    const slotHeight = timeInterval === 60 ? 60 : timeInterval === 30 ? 30 : 24;
    const slotsPerHour = 60 / timeInterval;
    
    const startTotalMinutes = (startHour - businessStartHour) * 60 + (startMinute - businessStartMinute);
    const endTotalMinutes = (endHour - businessStartHour) * 60 + (endMinute - businessStartMinute);
    
    const top = (startTotalMinutes / timeInterval) * slotHeight;
    const height = Math.max(((endTotalMinutes - startTotalMinutes) / timeInterval) * slotHeight, slotHeight);
    
    return { top, height };
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    if (!isSameDay(now, currentDate)) return null;
    
    const [businessStartHour, businessStartMinute] = businessHours.start.split(':').map(Number);
    const [businessEndHour, businessEndMinute] = businessHours.end.split(':').map(Number);
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const businessStart = businessStartHour * 60 + businessStartMinute;
    const businessEnd = businessEndHour * 60 + businessEndMinute;
    const currentTime = hour * 60 + minute;
    
    if (currentTime < businessStart || currentTime >= businessEnd) return null;
    
    const slotHeight = timeInterval === 60 ? 60 : timeInterval === 30 ? 30 : 24;
    const totalMinutes = currentTime - businessStart;
    const position = (totalMinutes / timeInterval) * slotHeight;
    
    return { position, time: format(now, "h:mm a") };
  };

  const currentTimeInfo = getCurrentTimePosition();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Left: Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3 hover:bg-gray-100 font-medium"
              onClick={() => setCurrentDate(new Date())}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Today
            </Button>
            
            <div className="flex items-center bg-gray-100 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-200 rounded-l-lg rounded-r-none"
                onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-1 min-w-[200px] text-center">
                <h2 className="text-sm font-semibold text-gray-900">
                  {format(currentDate, "EEEE, MMMM d, yyyy")}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-200 rounded-r-lg rounded-l-none"
                onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Center: View Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(["day", "week", "month"] as ViewType[]).map((view) => (
              <button
                key={view}
                onClick={() => setViewType(view)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize min-w-[60px]",
                  viewType === view
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {view === "day" && <CalendarDays className="h-4 w-4 inline mr-1.5" />}
                {view}
              </button>
            ))}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Time Interval */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {[15, 30, 60].map((interval) => (
                <button
                  key={interval}
                  onClick={() => setTimeInterval(interval as TimeInterval)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all min-w-[45px]",
                    timeInterval === interval
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {interval === 60 ? "1h" : `${interval}m`}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-px bg-gray-300" />
            
            {/* Filters */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 gap-2 hover:bg-gray-50 border-gray-200"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Booking Status</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={filters.showCompleted}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, showCompleted: !!checked }))
                          }
                        />
                        <span className="flex-1">Show completed</span>
                        <Badge variant="secondary" className="bg-gray-100">
                          {mockBookings.filter(b => b.status === "completed").length}
                        </Badge>
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={filters.showCancelled}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, showCancelled: !!checked }))
                          }
                        />
                        <span className="flex-1">Show cancelled</span>
                        <Badge variant="secondary" className="bg-gray-100">
                          {mockBookings.filter(b => b.status === "cancelled").length}
                        </Badge>
                      </label>
                      <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                        <Checkbox
                          checked={filters.showBlocked}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, showBlocked: !!checked }))
                          }
                        />
                        <span className="flex-1">Show blocked time</span>
                      </label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Staff Members</h4>
                    <div className="space-y-2">
                      {staff.map((member) => (
                        <label key={member.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={member.isVisible}
                            onCheckedChange={() => toggleStaffVisibility(member.id)}
                          />
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: member.color }}
                          />
                          <span className="flex-1">{member.name}</span>
                          {!member.isAvailable && (
                            <Badge variant="secondary" className="bg-gray-100 text-xs">
                              Unavailable
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilters({ showCompleted: true, showCancelled: false, showBlocked: false });
                        staff.forEach(s => s.isVisible = true);
                        setStaff([...staff]);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button 
              className="h-10 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
              onClick={() => {
                setNewBookingData({
                  date: currentDate,
                  time: new Date(),
                  staffId: visibleStaff[0]?.id
                });
                setIsBookingOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="flex-1 overflow-hidden relative bg-white">
        <div className="h-full overflow-auto relative">
          {/* Sticky Header Container */}
          <div 
            className="sticky top-0 z-20 bg-white border-b border-gray-200"
            style={{
              display: "grid",
              gridTemplateColumns: `60px repeat(${visibleStaff.length}, minmax(200px, 1fr))`,
              minWidth: `${60 + visibleStaff.length * 200}px`
            }}
          >
            {/* Time Header */}
            <div className="h-16 bg-gray-50 border-r border-gray-200" />
            
            {/* Staff Headers */}
            {visibleStaff.map((staffMember, index) => (
              <div 
                key={`header-${staffMember.id}`}
                className={cn(
                  "h-16 bg-gray-50 p-3 flex items-center gap-3",
                  index < visibleStaff.length - 1 ? "border-r border-dotted border-gray-300" : "border-r border-gray-200"
                )}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={staffMember.avatar} />
                    <AvatarFallback 
                      className="text-white text-xs font-medium"
                      style={{ backgroundColor: staffMember.color }}
                    >
                      {staffMember.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={cn(
                      "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                      staffMember.isAvailable ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-900">{staffMember.name}</div>
                  <div className="text-xs text-gray-600">
                    {filteredBookings.filter(b => b.staffId === staffMember.id).length} bookings
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Body Grid */}
          <div 
            style={{
              display: "grid",
              gridTemplateColumns: `60px repeat(${visibleStaff.length}, minmax(200px, 1fr))`,
              minWidth: `${60 + visibleStaff.length * 200}px`
            }}
          >
            {/* Time Column */}
            <div className="relative bg-white border-r border-gray-200">
              {timeSlots.map((slot, index) => (
                <div
                  key={`time-${index}`}
                  className={cn(
                    "border-b border-gray-100 px-2 text-xs flex items-center",
                    slot.isHour ? "font-medium text-gray-900 bg-gray-50" : slot.isMinorInterval ? "text-gray-400" : "text-gray-600",
                    slot.isHour && "border-b-gray-200"
                  )}
                  style={{ height: `${slot.height}px` }}
                >
                  {(slot.isHour || !slot.isMinorInterval) && slot.label}
                </div>
              ))}
            </div>

            {/* Staff Columns */}
            {visibleStaff.map((staffMember, staffIndex) => (
              <div 
                key={`column-${staffMember.id}`}
                className={cn(
                  "relative bg-white",
                  staffIndex < visibleStaff.length - 1 ? "border-r border-dotted border-gray-300" : "border-r border-gray-200"
                )}
              >
                {/* Time Slots */}
                {timeSlots.map((slot, timeIndex) => {
                  const isHovered = hoveredSlot?.staffId === staffMember.id && hoveredSlot?.time.getTime() === slot.time.getTime();
                  return (
                    <div
                      key={`slot-${staffMember.id}-${timeIndex}`}
                      className={cn(
                        "border-b border-gray-100 cursor-pointer transition-all relative group",
                        slot.isHour && "border-b-gray-200 bg-gray-50/30",
                        isHovered && "bg-blue-50 border-blue-200"
                      )}
                      style={{ height: `${slot.height}px` }}
                      onClick={() => {
                        const clickedTime = new Date(currentDate);
                        clickedTime.setHours(slot.time.getHours(), slot.time.getMinutes(), 0, 0);
                        
                        setNewBookingData({
                          date: currentDate,
                          time: clickedTime,
                          staffId: staffMember.id
                        });
                        setIsBookingOpen(true);
                      }}
                      onMouseEnter={() => setHoveredSlot({ staffId: staffMember.id, time: slot.time })}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {isHovered && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      {isHovered && (
                        <div className="absolute inset-x-0 border-2 border-dashed border-blue-300 h-full" />
                      )}
                    </div>
                  );
                })}

                {/* Current Time Indicator */}
                {currentTimeInfo && staffIndex === 0 && (
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{ 
                      top: `${currentTimeInfo.position}px`,
                      width: `calc(100% * ${visibleStaff.length} + 60px)`,
                      left: "-60px"
                    }}
                  >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                    <div className="absolute left-0 -top-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {currentTimeInfo.time}
                    </div>
                  </div>
                )}

                {/* Booking Cards */}
                {filteredBookings
                  .filter(booking => booking.staffId === staffMember.id)
                  .map((booking) => {
                    const { top, height } = getBookingPosition(booking);
                    const isHovered = hoveredBooking === booking.id;
                    
                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          "absolute left-1 right-1 rounded-md border cursor-pointer transition-all duration-200 z-10",
                          "hover:shadow-lg hover:z-20 hover:scale-[1.02]",
                          isHovered && "shadow-xl z-30"
                        )}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: "white",
                          borderLeftWidth: "4px",
                          borderLeftColor: staffMember.color,
                          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
                        }}
                        onClick={() => setSelectedBooking(booking)}
                        onMouseEnter={() => setHoveredBooking(booking.id)}
                        onMouseLeave={() => setHoveredBooking(null)}
                      >
                        <div className="p-2 h-full flex flex-col">
                          {/* Header with status */}
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-1 text-xs">
                              {getServiceIcon(booking.serviceIcon)}
                              <span className="font-medium text-gray-900 truncate">
                                {booking.customerName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div 
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  booking.isPaid ? "bg-green-500" : "bg-red-500"
                                )}
                              />
                              <Badge 
                                className={cn(
                                  "text-xs px-1 py-0 h-4 flex items-center gap-1",
                                  getStatusColor(booking.status)
                                )}
                              >
                                {getStatusIcon(booking.status)}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Service name */}
                          <div className="text-xs text-gray-600 truncate mb-1">
                            {booking.serviceName}
                          </div>
                          
                          {/* Time */}
                          <div className="text-xs text-gray-500 mt-auto">
                            {format(booking.startTime, "h:mm")} - {format(booking.endTime, "h:mm a")}
                          </div>
                          
                          {/* Hover Details */}
                          {isHovered && height > 48 && (
                            <div className="absolute inset-x-2 bottom-2 bg-white/95 backdrop-blur-sm rounded border p-2 text-xs space-y-1">
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.customerPhone}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${booking.totalPrice}
                              </div>
                              {booking.notes && (
                                <div className="text-gray-600 italic">{booking.notes}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-600 rounded" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-600 rounded animate-pulse" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600/70 rounded" />
            <span>Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>No-show</span>
          </div>
          <div className="flex items-center gap-2 ml-6">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>Unpaid</span>
          </div>
        </div>
      </div>

      {/* Booking Slide-Out */}
      <BookingSlideOut
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setNewBookingData({});
        }}
        initialDate={newBookingData.date}
        initialTime={newBookingData.time}
        initialStaffId={newBookingData.staffId}
        staff={visibleStaff}
        services={mockServices}
        customers={mockCustomers}
        onSave={(booking) => {
          console.log("New booking:", booking);
          // Here you would typically call an API to save the booking
          // For now, just close the panel
          setIsBookingOpen(false);
          setNewBookingData({});
          // You could also refresh the bookings list here
        }}
      />
    </div>
  );
}