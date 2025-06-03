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
  Home,
  CheckSquare,
  Square
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay, 
  isToday,
  parseISO,
  eachDayOfInterval,
  getDay,
  getDaysInMonth
} from "date-fns";
import { BookingSlideOut } from "@/components/BookingSlideOut";
import { BookingDetailsSlideOut } from "@/components/BookingDetailsSlideOut";

interface Staff {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isVisible: boolean;
  isAvailable: boolean;
}

interface BusinessHours {
  start: string;
  end: string;
  days: number[];
}

type TimeInterval = 15 | 30 | 60;
type ViewType = "day" | "week" | "month";

interface CalendarFilters {
  showCompleted: boolean;
  showCancelled: boolean;
  showBlocked: boolean;
  selectedStaffIds: string[];
}

interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
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

// Mock data
const mockStaff: Staff[] = [
  { id: "1", name: "Emma Wilson", color: "#7C3AED", isVisible: true, isAvailable: true },
  { id: "2", name: "James Brown", color: "#14B8A6", isVisible: true, isAvailable: true },
  { id: "3", name: "Sophie Chen", color: "#F59E0B", isVisible: true, isAvailable: false },
  { id: "4", name: "Michael Davis", color: "#EF4444", isVisible: true, isAvailable: true },
];

const mockBusinessHours: BusinessHours = {
  start: "09:00",
  end: "18:00",
  days: [1, 2, 3, 4, 5]
};

const mockBookings: Booking[] = [
  // Today's bookings
  {
    id: "1",
    customerId: "c1",
    customerName: "Sarah Johnson",
    customerPhone: "+1 (555) 123-4567",
    customerEmail: "sarah@example.com",
    serviceName: "Manicure & Pedicure",
    serviceIcon: "palette",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 0, 31, 10, 0),
    endTime: new Date(2025, 0, 31, 11, 0),
    status: "confirmed",
    isPaid: false,
    totalPrice: 85,
  },
  {
    id: "2",
    customerId: "c2",
    customerName: "Michael Chen",
    customerPhone: "+1 (555) 234-5678",
    customerEmail: "michael@example.com",
    serviceName: "Deep Tissue Massage",
    serviceIcon: "hand",
    staffId: "2",
    staffName: "James Brown",
    startTime: new Date(2025, 0, 31, 14, 0),
    endTime: new Date(2025, 0, 31, 15, 0),
    status: "in-progress",
    isPaid: true,
    totalPrice: 90,
  },
  {
    id: "3",
    customerId: "c3",
    customerName: "Emily Brown",
    customerPhone: "+1 (555) 345-6789",
    serviceName: "Haircut & Style",
    serviceIcon: "scissors",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 0, 31, 9, 0),
    endTime: new Date(2025, 0, 31, 9, 30),
    status: "completed",
    isPaid: true,
    totalPrice: 45,
  },
  {
    id: "4",
    customerId: "c4",
    customerName: "Lisa Wang",
    customerPhone: "+1 (555) 456-7890",
    serviceName: "Facial Treatment",
    serviceIcon: "sparkles",
    staffId: "4",
    staffName: "Michael Davis",
    startTime: new Date(2025, 0, 31, 11, 30),
    endTime: new Date(2025, 0, 31, 12, 30),
    status: "cancelled",
    isPaid: false,
    totalPrice: 110,
  },
  // Past bookings (yesterday)
  {
    id: "5",
    customerId: "c1",
    customerName: "Sarah Johnson",
    customerPhone: "+1 (555) 123-4567",
    serviceName: "Eyebrow Threading",
    serviceIcon: "sparkles",
    staffId: "4",
    staffName: "Michael Davis",
    startTime: new Date(2025, 0, 30, 15, 0),
    endTime: new Date(2025, 0, 30, 15, 30),
    status: "completed",
    isPaid: true,
    totalPrice: 35,
  },
  {
    id: "6",
    customerId: "c2",
    customerName: "Michael Chen",
    customerPhone: "+1 (555) 234-5678",
    serviceName: "Hair Color",
    serviceIcon: "scissors",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 0, 30, 13, 0),
    endTime: new Date(2025, 0, 30, 14, 30),
    status: "no-show",
    isPaid: false,
    totalPrice: 120,
  },
  // Tomorrow's bookings
  {
    id: "7",
    customerId: "c3",
    customerName: "Emily Brown",
    customerPhone: "+1 (555) 345-6789",
    serviceName: "Manicure & Pedicure",
    serviceIcon: "palette",
    staffId: "2",
    staffName: "James Brown",
    startTime: new Date(2025, 1, 1, 10, 0),
    endTime: new Date(2025, 1, 1, 11, 0),
    status: "confirmed",
    isPaid: false,
    totalPrice: 85,
  },
  {
    id: "8",
    customerId: "c4",
    customerName: "Lisa Wang",
    customerPhone: "+1 (555) 456-7890",
    serviceName: "Deep Tissue Massage",
    serviceIcon: "hand",
    staffId: "4",
    staffName: "Michael Davis",
    startTime: new Date(2025, 1, 1, 14, 30),
    endTime: new Date(2025, 1, 1, 15, 30),
    status: "confirmed",
    isPaid: false,
    totalPrice: 90,
  },
  // Next week bookings
  {
    id: "9",
    customerId: "c1",
    customerName: "Sarah Johnson",
    customerPhone: "+1 (555) 123-4567",
    serviceName: "Hair Color",
    serviceIcon: "scissors",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 1, 5, 10, 0),
    endTime: new Date(2025, 1, 5, 11, 30),
    status: "confirmed",
    isPaid: false,
    totalPrice: 120,
  },
  {
    id: "10",
    customerId: "c2",
    customerName: "Michael Chen",
    customerPhone: "+1 (555) 234-5678",
    serviceName: "Facial Treatment",
    serviceIcon: "sparkles",
    staffId: "2",
    staffName: "James Brown",
    startTime: new Date(2025, 1, 6, 15, 0),
    endTime: new Date(2025, 1, 6, 16, 0),
    status: "confirmed",
    isPaid: false,
    totalPrice: 110,
  },
  {
    id: "11",
    customerId: "c3",
    customerName: "Emily Brown",
    customerPhone: "+1 (555) 345-6789",
    serviceName: "Haircut & Style",
    serviceIcon: "scissors",
    staffId: "4",
    staffName: "Michael Davis",
    startTime: new Date(2025, 1, 7, 11, 0),
    endTime: new Date(2025, 1, 7, 11, 30),
    status: "confirmed",
    isPaid: false,
    totalPrice: 45,
  },
  // Two weeks out
  {
    id: "12",
    customerId: "c4",
    customerName: "Lisa Wang",
    customerPhone: "+1 (555) 456-7890",
    serviceName: "Manicure & Pedicure",
    serviceIcon: "palette",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 1, 14, 13, 0),
    endTime: new Date(2025, 1, 14, 14, 0),
    status: "confirmed",
    isPaid: false,
    totalPrice: 85,
  },
  {
    id: "13",
    customerId: "c1",
    customerName: "Sarah Johnson",
    customerPhone: "+1 (555) 123-4567",
    serviceName: "Deep Tissue Massage",
    serviceIcon: "hand",
    staffId: "2",
    staffName: "James Brown",
    startTime: new Date(2025, 1, 14, 16, 0),
    endTime: new Date(2025, 1, 14, 17, 0),
    status: "confirmed",
    isPaid: false,
    totalPrice: 90,
  },
  // More today bookings to fill the schedule
  {
    id: "14",
    customerId: "c2",
    customerName: "Michael Chen",
    customerPhone: "+1 (555) 234-5678",
    serviceName: "Haircut & Style",
    serviceIcon: "scissors",
    staffId: "4",
    staffName: "Michael Davis",
    startTime: new Date(2025, 0, 31, 15, 30),
    endTime: new Date(2025, 0, 31, 16, 0),
    status: "confirmed",
    isPaid: false,
    totalPrice: 45,
  },
  {
    id: "15",
    customerId: "c3",
    customerName: "Emily Brown",
    customerPhone: "+1 (555) 345-6789",
    serviceName: "Eyebrow Threading",
    serviceIcon: "sparkles",
    staffId: "1",
    staffName: "Emma Wilson",
    startTime: new Date(2025, 0, 31, 14, 0),
    endTime: new Date(2025, 0, 31, 14, 30),
    status: "confirmed",
    isPaid: true,
    totalPrice: 35,
  },
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

// Helper functions
const generateTimeSlots = (businessHours: BusinessHours, interval: TimeInterval) => {
  const slots = [];
  const [startHour, startMinute] = businessHours.start.split(':').map(Number);
  const [endHour, endMinute] = businessHours.end.split(':').map(Number);
  
  // Generate slots for the entire day to show non-business hours
  for (let hour = 0; hour <= 23; hour++) {
    const minutes = interval === 60 ? [0] : interval === 30 ? [0, 30] : [0, 15, 30, 45];
    
    for (const minute of minutes) {
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      
      const isHour = minute === 0;
      const isMinorInterval = interval === 15 && (minute === 15 || minute === 45);
      
      // Check if this slot is within business hours
      const totalMinutes = hour * 60 + minute;
      const businessStartMinutes = startHour * 60 + startMinute;
      const businessEndMinutes = endHour * 60 + endMinute;
      const isBusinessHours = totalMinutes >= businessStartMinutes && totalMinutes < businessEndMinutes;
      
      slots.push({
        time,
        label: format(time, isHour ? "h a" : "h:mm"),
        isHour,
        isMinorInterval,
        isBusinessHours,
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

const getStatusColor = (status: string, isPast: boolean = false) => {
  if (isPast && status !== "in-progress") {
    // Muted colors for past appointments
    switch (status) {
      case "completed": return "bg-gray-400 text-white border border-gray-500";
      case "cancelled": return "bg-red-400/50 text-white line-through border border-red-500";
      case "no-show": return "bg-orange-400/50 text-white border border-orange-500";
      default: return "bg-gray-300 text-gray-700 border border-gray-400";
    }
  }
  
  // Active colors for current/future appointments
  switch (status) {
    case "confirmed": return "bg-purple-600 text-white border border-purple-700 shadow-sm";
    case "in-progress": return "bg-teal-600 text-white border-2 border-teal-400 shadow-md animate-pulse";
    case "completed": return "bg-gray-500 text-white border border-gray-600";
    case "cancelled": return "bg-red-600/70 text-white line-through border border-red-700";
    case "no-show": return "bg-orange-500 text-white border border-orange-600";
    default: return "bg-gray-400 text-white border border-gray-500";
  }
};

// Helper to detect appointment conflicts
const detectConflicts = (bookings: Booking[], staffId: string) => {
  const staffBookings = bookings
    .filter(b => b.staffId === staffId)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  const conflicts = new Set<string>();
  
  for (let i = 0; i < staffBookings.length - 1; i++) {
    const current = staffBookings[i];
    const next = staffBookings[i + 1];
    
    if (current.endTime > next.startTime) {
      conflicts.add(current.id);
      conflicts.add(next.id);
    }
  }
  
  return conflicts;
};

// Helper to convert hex color to rgba
const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Calculate layout for overlapping bookings
const calculateBookingLayout = (dayBookings: Booking[]) => {
  const layoutMap = new Map();
  
  // Group bookings by time slots
  const timeGroups = new Map();
  
  dayBookings.forEach((booking) => {
    // Find all time slots this booking occupies (in 15-min increments)
    const startSlot = Math.floor(booking.startTime.getHours() * 4 + booking.startTime.getMinutes() / 15);
    const endSlot = Math.ceil(booking.endTime.getHours() * 4 + booking.endTime.getMinutes() / 15);
    
    for (let slot = startSlot; slot < endSlot; slot++) {
      if (!timeGroups.has(slot)) {
        timeGroups.set(slot, new Set());
      }
      timeGroups.get(slot).add(booking.id);
    }
  });
  
  // Find maximum concurrent bookings
  let maxConcurrent = 0;
  timeGroups.forEach((bookingIds) => {
    maxConcurrent = Math.max(maxConcurrent, bookingIds.size);
  });
  
  // For week view, use a more compact layout strategy
  const useCompactLayout = maxConcurrent > 4;
  
  // Sort bookings by start time and duration
  const sortedBookings = [...dayBookings].sort((a, b) => {
    if (a.startTime.getTime() !== b.startTime.getTime()) {
      return a.startTime.getTime() - b.startTime.getTime();
    }
    return b.endTime.getTime() - a.endTime.getTime();
  });

  // Assign columns to bookings
  sortedBookings.forEach((booking) => {
    const overlapping = new Set();
    
    // Find all overlapping bookings
    sortedBookings.forEach((other) => {
      if (booking.id !== other.id && 
          booking.startTime < other.endTime && 
          booking.endTime > other.startTime) {
        overlapping.add(other.id);
      }
    });
    
    // Find available column
    let column = 0;
    const usedColumns = new Set();
    
    overlapping.forEach((otherId) => {
      const otherLayout = layoutMap.get(otherId);
      if (otherLayout) {
        usedColumns.add(otherLayout.column);
      }
    });
    
    while (usedColumns.has(column)) {
      column++;
    }
    
    // Calculate actual number of columns needed for this time period
    const columnsNeeded = Math.max(column + 1, overlapping.size + 1);
    
    if (useCompactLayout) {
      // Compact mode: Show only time and initials, stack more densely
      layoutMap.set(booking.id, {
        column,
        totalColumns: columnsNeeded,
        left: 0, // Stack vertically instead
        width: 100,
        isCompact: true,
        stackIndex: column
      });
    } else {
      // Normal mode: Side by side up to 4 columns
      const maxColumns = Math.min(columnsNeeded, 4);
      layoutMap.set(booking.id, {
        column: column % maxColumns,
        totalColumns: maxColumns,
        left: (column % maxColumns) / maxColumns * 100,
        width: (1 / maxColumns) * 100 - 1,
        isCompact: false,
        isOverflow: columnsNeeded > 4
      });
    }
  });
  
  return { layoutMap, maxConcurrent, useCompactLayout };
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("day");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(15);
  const [businessHours] = useState<BusinessHours>(mockBusinessHours);
  const [filters, setFilters] = useState<CalendarFilters>({
    showCompleted: true,
    showCancelled: false,
    showBlocked: false,
    selectedStaffIds: [] // Will be populated when staff loads
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const weekHeaderRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Load bookings from API
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        
        // Pass date parameters based on view type
        let params: any = {};
        
        if (viewType === 'day') {
          // For day view, get bookings for the specific date
          params.date = currentDate.toISOString().split('T')[0];
        } else if (viewType === 'week') {
          // For week view, get bookings for the week
          const weekStart = startOfWeek(currentDate);
          const weekEnd = endOfWeek(currentDate);
          params.startDate = weekStart.toISOString().split('T')[0];
          params.endDate = weekEnd.toISOString().split('T')[0];
        } else if (viewType === 'month') {
          // For month view, get bookings for the month
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(currentDate);
          params.startDate = monthStart.toISOString().split('T')[0];
          params.endDate = monthEnd.toISOString().split('T')[0];
        }
        
        const apiBookings = await apiClient.getBookings(params);
        
        // API client already transforms the data, just adjust for calendar view
        const transformedBookings = apiBookings.map((booking: any) => ({
          id: booking.id,
          customerId: booking.customerId,
          customerName: booking.customerName || 'Unknown',
          customerPhone: booking.customerPhone || '',
          customerEmail: booking.customerEmail || booking.customer?.email || '',
          serviceName: booking.serviceName || 'Service',
          serviceIcon: 'scissors', // Default icon
          staffId: booking.providerId || booking.staffId || '1',
          staffName: booking.staffName || 'Staff',
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          status: (booking.status || 'pending').toLowerCase().replace('_', '-'),
          isPaid: booking.paidAmount > 0 || false,
          totalPrice: booking.totalAmount || booking.price || 0,
          notes: booking.notes || '',
        }));
        
        setBookings(transformedBookings);
      } catch (error) {
        console.error('Failed to load bookings:', error);
        // Fall back to mock data if API fails
        setBookings(mockBookings);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [currentDate, viewType]); // Reload when date or view type changes

  // Load staff from API
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const apiStaff = await apiClient.getStaff();
        
        // Transform API staff to match the calendar format
        const transformedStaff = apiStaff.map((member: any) => ({
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          color: member.calendarColor || '#7C3AED',
          isVisible: true,
          isAvailable: member.status === 'ACTIVE',
        }));
        
        setStaff(transformedStaff);
        
        // Update filters to include all staff IDs
        setFilters(prev => ({
          ...prev,
          selectedStaffIds: transformedStaff.map((s: Staff) => s.id)
        }));
      } catch (error) {
        console.error('Failed to load staff:', error);
        // Fall back to mock data if API fails
        setStaff(mockStaff);
      }
    };

    loadStaff();
  }, []);

  // Scroll to business hours on mount or view change
  useEffect(() => {
    if (calendarScrollRef.current) {
      let scrollPosition = 0;
      
      if (viewType === "day") {
        // Calculate scroll position for 8:30 AM (bit before business start)
        const slotHeight = timeInterval === 60 ? 60 : timeInterval === 30 ? 30 : 24;
        const slotsPerHour = 60 / timeInterval;
        scrollPosition = 8.5 * slotsPerHour * slotHeight; // 8:30 AM position
      } else if (viewType === "week") {
        // For week view, scroll to 8 AM (64px per hour)
        scrollPosition = 8 * 64; // 8 AM position
      }
      
      if (scrollPosition > 0) {
        setTimeout(() => {
          calendarScrollRef.current?.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [viewType, timeInterval]);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(businessHours, timeInterval);
  }, [businessHours, timeInterval]);
  const visibleStaff = staff.filter(s => filters.selectedStaffIds.includes(s.id));
  
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      if (!filters.showCompleted && booking.status === "completed") return false;
      if (!filters.showCancelled && booking.status === "cancelled") return false;
      if (!filters.selectedStaffIds.includes(booking.staffId)) return false;
      return true;
    });
  }, [filters, bookings]);

  // Navigation functions
  const navigatePrevious = () => {
    switch (viewType) {
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewType) {
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  // Get navigation labels
  const getNavigationLabel = (direction: "prev" | "next") => {
    switch (viewType) {
      case "day":
        const targetDay = direction === "prev" 
          ? subDays(currentDate, 1) 
          : addDays(currentDate, 1);
        return format(targetDay, "EEEE, MMM d");
      case "week":
        const targetWeek = direction === "prev" 
          ? subWeeks(currentDate, 1) 
          : addWeeks(currentDate, 1);
        return `Week of ${format(startOfWeek(targetWeek), "MMM d")}`;
      case "month":
        const targetMonth = direction === "prev" 
          ? subMonths(currentDate, 1) 
          : addMonths(currentDate, 1);
        return format(targetMonth, "MMMM yyyy");
    }
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!filters.showCompleted) count++;
    if (filters.showCancelled) count++;
    if (filters.showBlocked) count++;
    if (filters.selectedStaffIds.length < mockStaff.length) count++;
    return count;
  }, [filters]);

  // Toggle all staff
  const toggleAllStaff = () => {
    if (filters.selectedStaffIds.length === staff.length) {
      setFilters(prev => ({ ...prev, selectedStaffIds: [] }));
    } else {
      setFilters(prev => ({ ...prev, selectedStaffIds: staff.map(s => s.id) }));
    }
  };

  // Toggle individual staff
  const toggleStaff = (staffId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedStaffIds: prev.selectedStaffIds.includes(staffId)
        ? prev.selectedStaffIds.filter(id => id !== staffId)
        : [...prev.selectedStaffIds, staffId]
    }));
  };

  // Get current time position for indicator
  const getCurrentTimePosition = () => {
    const now = currentTime;
    if (!isSameDay(now, currentDate) && viewType === 'day') return null;
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Calculate position based on view type
    let slotHeight, timeDiv;
    if (viewType === 'week') {
      slotHeight = 30; // Week view uses 30min slots
      timeDiv = 30;
    } else {
      slotHeight = timeInterval === 60 ? 60 : timeInterval === 30 ? 30 : 24;
      timeDiv = timeInterval;
    }
    
    const position = (totalMinutes / timeDiv) * slotHeight;
    
    return { position, time: format(now, "h:mm a") };
  };

  const currentTimeInfo = getCurrentTimePosition();

  // Render different views
  const renderDayView = () => {
    // Create grid template columns based on staff count
    const gridColumns = `80px repeat(${visibleStaff.length}, minmax(150px, 1fr))`;
    
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Fixed header row */}
        <div 
          className="grid sticky top-0 z-20 bg-white border-b min-w-[600px]"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <div className="h-14 border-r" /> {/* Time column header */}
          {visibleStaff.map((staffMember) => (
            <div key={staffMember.id} className="h-14 px-4 flex items-center justify-between border-r last:border-r-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staffMember.color }} />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{staffMember.name}</span>
                  <span className="text-xs text-gray-500">
                    {filteredBookings.filter(b => 
                      b.staffId === staffMember.id && 
                      isSameDay(b.startTime, currentDate)
                    ).length} bookings
                  </span>
                </div>
              </div>
              {!staffMember.isAvailable && (
                <Badge variant="secondary" className="text-xs">Off</Badge>
              )}
            </div>
          ))}
        </div>

        {/* Scrollable calendar grid */}
        <div className="flex-1 overflow-auto" ref={calendarScrollRef}>
          <div 
            className="grid min-w-[600px] relative"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {/* Render each time slot as a full row */}
            {timeSlots.map((slot, slotIndex) => (
              <React.Fragment key={slotIndex}>
                {/* Time label cell */}
                <div
                  className={cn(
                    "text-right pr-3 text-xs border-b border-r relative flex items-center justify-end",
                    slot.isHour ? "border-t-gray-400 border-t" : "",
                    !slot.isBusinessHours && "bg-gray-100"
                  )}
                  style={{ height: `${slot.height}px` }}
                >
                  {/* Show time only on hour marks */}
                  {slot.isHour && (
                    <span className={cn(
                      "font-bold",
                      !slot.isBusinessHours ? "text-gray-500" : "text-gray-700"
                    )}>
                      {slot.label}
                    </span>
                  )}
                </div>

                {/* Staff cells for this time slot */}
                {visibleStaff.map((staffMember) => {
                  const slotBookings = filteredBookings.filter(b => 
                    b.staffId === staffMember.id &&
                    isSameDay(b.startTime, currentDate) &&
                    b.startTime.getHours() === slot.time.getHours() &&
                    b.startTime.getMinutes() === slot.time.getMinutes()
                  );

                  const conflicts = detectConflicts(filteredBookings, staffMember.id);
                  
                  return (
                    <div
                      key={`${staffMember.id}-${slotIndex}`}
                      className={cn(
                        "border-b border-r last:border-r-0 cursor-pointer relative group",
                        slot.isHour ? "border-t-gray-400 border-t" : "",
                        !slot.isBusinessHours ? "bg-gray-50" : "bg-white"
                      )}
                      style={{ height: `${slot.height}px` }}
                      onClick={() => {
                        if (!staffMember.isAvailable) return;
                        const clickedTime = new Date(currentDate);
                        clickedTime.setHours(slot.time.getHours(), slot.time.getMinutes(), 0, 0);
                        
                        setNewBookingData({
                          date: currentDate,
                          time: clickedTime,
                          staffId: staffMember.id
                        });
                        setIsBookingOpen(true);
                      }}
                      onMouseEnter={() => {
                        if (!staffMember.isAvailable) return;
                        setHoveredSlot({ staffId: staffMember.id, time: slot.time });
                      }}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {/* Non-business hours overlay */}
                      {!slot.isBusinessHours && (
                        <div className="absolute inset-0 bg-gray-900/5 pointer-events-none" />
                      )}

                      {/* Hover effect - simple */}
                      {hoveredSlot?.staffId === staffMember.id && 
                       hoveredSlot?.time.getHours() === slot.time.getHours() &&
                       hoveredSlot?.time.getMinutes() === slot.time.getMinutes() && 
                       slotBookings.length === 0 && 
                       staffMember.isAvailable && 
                       slot.isBusinessHours && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                        
                      {/* Appointments */}
                      {slotBookings.map((booking, bookingIndex) => {
                        const duration = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60);
                        const isPast = booking.startTime < currentTime && booking.status !== "in-progress";
                        const hasConflict = conflicts.has(booking.id);
                        
                        // Calculate side-by-side layout for overlapping bookings
                        const overlapCount = slotBookings.length;
                        const bookingWidth = overlapCount > 1 ? (100 / overlapCount) - 2 : 100; // Leave small gap between
                        const bookingLeft = overlapCount > 1 ? (bookingIndex * (100 / overlapCount)) : 0;
                        
                        // Determine opacity based on status
                        let bgOpacity = 0.7; // Default for confirmed - reduced for better contrast
                        if (booking.status === "in-progress") bgOpacity = 0.85; // Still prominent but with contrast
                        else if (booking.status === "completed" || isPast) bgOpacity = 0.15; // Very light
                        else if (booking.status === "cancelled") bgOpacity = 0.1; // Almost transparent
                        else if (booking.status === "no-show") bgOpacity = 0.12; // Very light
                        
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              "absolute top-0.5 rounded cursor-pointer border-2 text-xs",
                              "transition-all hover:shadow-md hover:z-30",
                              booking.status === "in-progress" && "animate-pulse",
                              booking.status === "cancelled" && "line-through",
                              hasConflict && "ring-2 ring-red-500 ring-offset-1"
                            )}
                            style={{
                              left: `${bookingLeft}%`,
                              width: `${bookingWidth}%`,
                              height: `${(duration / timeInterval) * slot.height - 3}px`,
                              backgroundColor: hexToRgba(staffMember.color, bgOpacity),
                              borderColor: staffMember.color,
                              zIndex: 15 + bookingIndex, // Ensure proper stacking
                              marginLeft: bookingIndex > 0 ? '2px' : '4px',
                              marginRight: bookingIndex < overlapCount - 1 ? '2px' : '4px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(booking);
                            }}
                            onMouseEnter={() => setHoveredBooking(booking.id)}
                            onMouseLeave={() => setHoveredBooking(null)}
                          >
                            <div className="p-1 h-full flex flex-col justify-between relative overflow-hidden">
                              {/* Payment indicator */}
                              <div className="absolute top-0.5 right-0.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  booking.isPaid ? "bg-green-600" : "bg-orange-500"
                                )} />
                              </div>
                              
                              {/* Content - adjusted for smaller width */}
                              <div className="pr-2">
                                <div className="font-semibold truncate text-gray-900 text-xs">
                                  {booking.customerName}
                                </div>
                                {overlapCount <= 2 && ( // Only show service name if not too crowded
                                  <div className="truncate text-gray-700" style={{ fontSize: '10px' }}>
                                    {booking.serviceName}
                                  </div>
                                )}
                              </div>
                              
                              {/* Duration for longer appointments - only if space allows */}
                              {duration >= 45 && overlapCount === 1 && (
                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {duration}m
                                </div>
                              )}
                              
                              {/* Overlap indicator */}
                              {overlapCount > 1 && (
                                <div className="absolute -top-1 -left-1 bg-red-500 text-white rounded-br-md px-1" style={{ fontSize: '10px' }}>
                                  {bookingIndex + 1}/{overlapCount}
                                </div>
                              )}
                              
                              {/* Status badge - only show for non-confirmed statuses */}
                              {booking.status !== 'confirmed' && (
                                <div className={cn(
                                  "absolute bottom-0.5 right-0.5 flex items-center gap-0.5 rounded-full text-white",
                                  overlapCount > 2 ? "p-1" : "px-1.5 py-0.5", // Icon only when crowded
                                  booking.status === 'completed' && "bg-green-600/80",
                                  booking.status === 'in-progress' && "bg-teal-600/80 animate-pulse",
                                  booking.status === 'cancelled' && "bg-red-600/80",
                                  booking.status === 'no-show' && "bg-orange-600/80"
                                )} style={{ fontSize: '9px' }}>
                                  {booking.status === 'completed' && (
                                    <>
                                      <Check className="h-3 w-3" />
                                      {overlapCount <= 2 && <span>Done</span>}
                                    </>
                                  )}
                                  {booking.status === 'in-progress' && (
                                    <>
                                      <Play className="h-3 w-3" />
                                      {overlapCount <= 2 && <span>Active</span>}
                                    </>
                                  )}
                                  {booking.status === 'cancelled' && (
                                    <>
                                      <X className="h-3 w-3" />
                                      {overlapCount <= 2 && <span>Cancel</span>}
                                    </>
                                  )}
                                  {booking.status === 'no-show' && (
                                    <>
                                      <AlertTriangle className="h-3 w-3" />
                                      {overlapCount <= 2 && <span>NoShow</span>}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Hover tooltip for crowded slots */}
                            {hoveredBooking === booking.id && overlapCount > 2 && (
                              <div className="absolute z-50 -top-2 left-full ml-2 bg-white shadow-lg rounded-lg p-3 w-48 pointer-events-none">
                                <div className="font-semibold text-sm">{booking.customerName}</div>
                                <div className="text-xs text-gray-600">{booking.serviceName}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {format(booking.startTime, 'h:mm a')} - {format(booking.endTime, 'h:mm a')}
                                </div>
                              </div>
                            )}
                          </div>
                          );
                        })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Current time indicator - positioned over the grid */}
            {currentTimeInfo && (
              <div 
                className="absolute pointer-events-none"
                style={{ 
                  top: `${currentTimeInfo.position}px`,
                  left: '80px', // Start after time column
                  right: '0',
                  height: '2px',
                  zIndex: 30
                }}
              >
                <div className="relative h-full">
                  <div className="absolute inset-0 bg-red-500 shadow-sm" />
                  <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
                  <div className="absolute left-3 -top-6 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md font-medium">
                    {currentTimeInfo.time}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Fixed header row - matching scrollable area structure */}
        <div className="h-20 border-b bg-white overflow-hidden">
          <div className="flex h-full">
            <div className="w-20 flex-shrink-0 border-r bg-gray-50 h-full" />
            <div className="flex flex-1 min-w-[860px]">
              {weekDays.map((day) => {
                const dayBookings = filteredBookings.filter(b => 
                  isSameDay(b.startTime, day)
                );
                const totalRevenue = dayBookings
                  .filter(b => b.status !== 'cancelled' && b.status !== 'no-show')
                  .reduce((sum, b) => sum + b.totalPrice, 0);

                return (
                  <div key={day.toISOString()} className="flex-1 border-r last:border-r-0 px-3 py-2 h-full">
                    <div className="flex items-center justify-between h-full">
                      <div>
                        <div className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          isToday(day) && "text-purple-600"
                        )}>
                          {format(day, "EEE")}
                        </div>
                        <div className={cn(
                          "text-2xl font-bold mt-0.5",
                          isToday(day) && "text-purple-600"
                        )}>
                          {format(day, "d")}
                        </div>
                      </div>
                      {dayBookings.length > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ${totalRevenue}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dayBookings.length} bookings
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable content area - includes both time and day columns */}
        <div 
          className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
          ref={calendarScrollRef} 
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 bg-gray-50 border-r sticky left-0 z-10" style={{ height: `${24 * 64}px` }}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="h-16 border-b text-right pr-3 text-xs font-medium text-gray-700 flex items-center justify-end bg-gray-50"
                >
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex flex-1 min-w-[860px]" style={{ minHeight: `${24 * 64}px` }}>
              {weekDays.map((day) => {
                const dayBookings = filteredBookings.filter(b => 
                  isSameDay(b.startTime, day)
                );

                return (
                  <div key={day.toISOString()} className="flex-1 border-r last:border-r-0 relative" style={{ height: `${24 * 64}px` }}>
                    {/* Hour blocks */}
                    {Array.from({ length: 24 }, (_, hour) => {
                      const isBusinessHour = hour >= 9 && hour < 18;
                      return (
                        <div
                          key={hour}
                          className={cn(
                            "h-16 border-b relative",
                            "cursor-pointer hover:bg-gray-50 transition-colors"
                          )}
                          onClick={() => {
                            const clickedTime = new Date(day);
                            clickedTime.setHours(hour, 0, 0, 0);
                            setNewBookingData({
                              date: day,
                              time: clickedTime,
                              staffId: visibleStaff[0]?.id
                            });
                            setIsBookingOpen(true);
                          }}
                        >
                          {!isBusinessHour && (
                            <div className="absolute inset-0 bg-gray-900/5 pointer-events-none" />
                          )}
                        </div>
                      );
                    })}

                    {/* Bookings with smart layout */}
                    {(() => {
                      const { layoutMap, maxConcurrent, useCompactLayout } = calculateBookingLayout(dayBookings);
                      
                      return dayBookings.map((booking) => {
                        const startHour = booking.startTime.getHours();
                        const startMinute = booking.startTime.getMinutes();
                        const duration = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60);
                        const topPosition = (startHour * 64) + (startMinute / 60 * 64);
                        const height = (duration / 60) * 64;
                        const staffMember = staff.find(s => s.id === booking.staffId);
                        const staffColor = staffMember?.color || '#7C3AED';
                        
                        const layout = layoutMap.get(booking.id) || { left: 0, width: 100, isCompact: false };
                        
                        const isPast = booking.startTime < currentTime && booking.status !== "in-progress";
                        let bgOpacity = 0.85;
                        if (booking.status === "in-progress") bgOpacity = 0.95;
                        else if (booking.status === "completed" || isPast) bgOpacity = 0.4;
                        else if (booking.status === "cancelled") bgOpacity = 0.3;
                        else if (booking.status === "no-show") bgOpacity = 0.35;

                        // In compact mode, create a simple badge-like display
                        if (layout.isCompact) {
                          return (
                            <div
                              key={booking.id}
                              className={cn(
                                "absolute left-1 right-1 flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer",
                                "transition-all hover:z-20 text-xs",
                                booking.status === "cancelled" && "line-through opacity-60"
                              )}
                              style={{
                                top: `${topPosition + (layout.stackIndex * 12)}px`,
                                height: '11px',
                                backgroundColor: hexToRgba(staffColor, 0.2),
                                borderLeft: `3px solid ${staffColor}`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(booking);
                              }}
                              onMouseEnter={() => setHoveredBooking(booking.id)}
                              onMouseLeave={() => setHoveredBooking(null)}
                            >
                              <div className="font-medium truncate" style={{ fontSize: '10px' }}>
                                {format(booking.startTime, 'HH:mm')} {booking.customerName.split(' ').map(n => n[0]).join('')}
                              </div>
                              {booking.isPaid && <div className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0" />}
                              
                              {/* Hover tooltip is essential in compact mode */}
                              {hoveredBooking === booking.id && (
                                <div className="absolute z-50 top-full left-0 mt-1 bg-white shadow-lg rounded-lg p-3 w-64 pointer-events-none">
                                  <div className="space-y-1">
                                    <div className="font-semibold">{booking.customerName}</div>
                                    <div className="text-sm text-gray-600">{booking.serviceName}</div>
                                    <div className="text-sm">
                                      <span className="text-gray-500">Time:</span> {format(booking.startTime, 'h:mm a')} - {format(booking.endTime, 'h:mm a')}
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-500">Staff:</span> {booking.staffName}
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-500">Status:</span> {booking.status}
                                      {booking.isPaid && <span className="text-green-600 ml-1">(Paid)</span>}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Normal layout (up to 4 columns)
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              "absolute rounded cursor-pointer border-l-4 bg-white shadow-sm",
                              "transition-all hover:shadow-md hover:z-10 text-xs p-1",
                              booking.status === "in-progress" && "animate-pulse ring-2 ring-teal-400",
                              booking.status === "cancelled" && "opacity-60",
                              layout.isOverflow && "ring-1 ring-orange-400"
                            )}
                            style={{
                              top: `${topPosition}px`,
                              height: `${Math.max(height - 4, 20)}px`,
                              left: `${layout.left}%`,
                              width: `${layout.width}%`,
                              borderLeftColor: staffColor,
                              backgroundColor: hexToRgba(staffColor, bgOpacity * 0.15)
                            }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          onMouseEnter={() => setHoveredBooking(booking.id)}
                          onMouseLeave={() => setHoveredBooking(null)}
                        >
                          <div className="h-full flex flex-col">
                            {/* For narrow columns, show minimal info */}
                            {layout.width < 35 ? (
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 truncate" style={{ fontSize: '10px' }}>
                                  {booking.customerName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {booking.status === 'in-progress' && <Play className="h-2.5 w-2.5 text-teal-600" />}
                                  {booking.status === 'cancelled' && <X className="h-2.5 w-2.5 text-red-600" />}
                                  <div className={cn(
                                    "w-1 h-1 rounded-full",
                                    booking.isPaid ? "bg-green-500" : "bg-orange-500"
                                  )} />
                                </div>
                              </div>
                            ) : (
                              /* Normal width - show more info */
                              <>
                                <div className="font-semibold text-gray-900 truncate" style={{ fontSize: '11px' }}>
                                  {booking.customerName}
                                </div>
                                {height > 35 && (
                                  <div className="text-gray-600 truncate" style={{ fontSize: '10px' }}>
                                    {booking.serviceName}
                                  </div>
                                )}
                                {height > 50 && (
                                  <div className="flex items-center gap-0.5 mt-auto">
                                    {booking.status !== 'confirmed' && (
                                      <>
                                        {booking.status === 'completed' && <Check className="h-2.5 w-2.5 text-green-600" />}
                                        {booking.status === 'in-progress' && <Play className="h-2.5 w-2.5 text-teal-600" />}
                                        {booking.status === 'cancelled' && <X className="h-2.5 w-2.5 text-red-600" />}
                                        {booking.status === 'no-show' && <AlertTriangle className="h-2.5 w-2.5 text-orange-600" />}
                                      </>
                                    )}
                                    <div className={cn(
                                      "w-1 h-1 rounded-full",
                                      booking.isPaid ? "bg-green-500" : "bg-orange-500"
                                    )} />
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Hover tooltip */}
                          {hoveredBooking === booking.id && (
                            <div className="absolute z-50 top-full left-0 mt-1 bg-white shadow-lg rounded-lg p-3 w-64 pointer-events-none">
                              <div className="space-y-1">
                                <div className="font-semibold">{booking.customerName}</div>
                                <div className="text-sm text-gray-600">{booking.serviceName}</div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Staff:</span> {booking.staffName}
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Duration:</span> {duration} minutes
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Price:</span> ${booking.totalPrice}
                                  {booking.isPaid && <span className="text-green-600 ml-1">(Paid)</span>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                    })()}

                    {/* Current time line */}
                    {isToday(day) && currentTimeInfo && (
                      <div 
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{ 
                          top: `${(currentTime.getHours() * 64) + (currentTime.getMinutes() / 60 * 64)}px`,
                          height: '2px',
                          zIndex: 20
                        }}
                      >
                        <div className="relative h-full">
                          <div className="absolute inset-0 bg-red-500 shadow-sm" />
                          <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayBookings = filteredBookings.filter(b => 
                isSameDay(b.startTime, day)
              );
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              // Calculate business metrics
              const totalRevenue = dayBookings
                .filter(b => b.status !== 'cancelled' && b.status !== 'no-show')
                .reduce((sum, b) => sum + b.totalPrice, 0);
              
              const confirmedBookings = dayBookings.filter(b => 
                b.status === 'confirmed' || b.status === 'completed' || b.status === 'in-progress'
              ).length;
              
              const maxBookingsPerDay = visibleStaff.length * 12; // Rough estimate for utilization color
              const utilization = (confirmedBookings / maxBookingsPerDay) * 100;
              
              // Get unique staff with bookings
              const staffWithBookings = [...new Set(dayBookings.map(b => b.staffId))];
              const staffColors = staffWithBookings
                .map(id => staff.find(s => s.id === id)?.color)
                .filter(Boolean);
              
              // Determine heat map color based on utilization
              let bgIntensity = 'bg-white';
              if (isCurrentMonth && confirmedBookings > 0) {
                if (utilization >= 80) bgIntensity = 'bg-red-50';
                else if (utilization >= 60) bgIntensity = 'bg-orange-50';
                else if (utilization >= 40) bgIntensity = 'bg-yellow-50';
                else if (utilization >= 20) bgIntensity = 'bg-green-50';
                else bgIntensity = 'bg-blue-50';
              }

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-32 p-2 border-r border-b cursor-pointer transition-all relative group",
                    !isCurrentMonth && "bg-gray-50 text-gray-400",
                    isCurrentMonth && bgIntensity,
                    isCurrentMonth && isWeekend && "bg-gray-50/50",
                    isToday(day) && "ring-2 ring-purple-600 ring-inset",
                    "hover:shadow-inner"
                  )}
                  onClick={() => {
                    setCurrentDate(day);
                    setViewType("day");
                  }}
                >
                  {/* Date header */}
                  <div className="flex items-start justify-between mb-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isToday(day) && "bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    )}>
                      {format(day, "d")}
                    </span>
                    {isCurrentMonth && utilization > 0 && (
                      <div className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded",
                        utilization >= 80 && "bg-red-100 text-red-700",
                        utilization >= 60 && utilization < 80 && "bg-orange-100 text-orange-700",
                        utilization >= 40 && utilization < 60 && "bg-yellow-100 text-yellow-700",
                        utilization < 40 && "bg-green-100 text-green-700"
                      )}>
                        {Math.round(utilization)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Revenue display */}
                  {isCurrentMonth && totalRevenue > 0 && (
                    <div className="mb-2">
                      <div className="text-lg font-semibold text-gray-900">
                        ${totalRevenue}
                      </div>
                      <div className="text-xs text-gray-500">
                        {confirmedBookings} bookings
                      </div>
                    </div>
                  )}
                  
                  {/* Staff availability dots */}
                  {isCurrentMonth && staffColors.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {staffColors.slice(0, 4).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      {staffColors.length > 4 && (
                        <div className="text-xs text-gray-500">
                          +{staffColors.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Hover tooltip */}
                  <div className="absolute z-10 invisible group-hover:visible bg-white shadow-lg rounded-lg p-3 -top-2 left-full ml-2 w-48 pointer-events-none">
                    <div className="text-sm font-medium mb-1">
                      {format(day, "EEEE, MMM d")}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>Revenue: ${totalRevenue}</div>
                      <div>Bookings: {confirmedBookings}</div>
                      <div>Utilization: {Math.round(utilization)}%</div>
                      {dayBookings.filter(b => b.status === 'cancelled').length > 0 && (
                        <div className="text-red-600">
                          {dayBookings.filter(b => b.status === 'cancelled').length} cancelled
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
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
                    <p>{getNavigationLabel("prev")}</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="px-4 py-1 min-w-[240px] text-center">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {viewType === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
                    {viewType === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
                    {viewType === "month" && format(currentDate, "MMMM yyyy")}
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
                    <p>{getNavigationLabel("next")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Center: View Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(["day", "week", "month"] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-50 capitalize min-w-[60px]",
                    viewType === view
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              {/* Time Interval - only for day view */}
              {viewType === "day" && (
                <>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    {[15, 30, 60].map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setTimeInterval(interval as TimeInterval)}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-50 min-w-[45px]",
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
                </>
              )}
              
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
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-white shadow-lg z-50" align="end" sideOffset={5}>
                  <div className="p-4 space-y-4">
                    {/* Display Options */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">Display Options</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={filters.showCompleted}
                            onCheckedChange={(checked) => 
                              setFilters(prev => ({ ...prev, showCompleted: !!checked }))
                            }
                          />
                          <span className="flex-1">Completed bookings</span>
                          <Badge variant="secondary" className="text-xs">
                            {bookings.filter(b => b.status === "completed").length}
                          </Badge>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={filters.showCancelled}
                            onCheckedChange={(checked) => 
                              setFilters(prev => ({ ...prev, showCancelled: !!checked }))
                            }
                          />
                          <span className="flex-1">Cancelled bookings</span>
                          <Badge variant="secondary" className="text-xs">
                            {bookings.filter(b => b.status === "cancelled").length}
                          </Badge>
                        </label>
                        <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                          <Checkbox
                            checked={filters.showBlocked}
                            onCheckedChange={(checked) => 
                              setFilters(prev => ({ ...prev, showBlocked: !!checked }))
                            }
                          />
                          <span className="flex-1">Blocked time slots</span>
                        </label>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Staff Members */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-gray-900">Staff Members</h4>
                        <button
                          onClick={toggleAllStaff}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          {filters.selectedStaffIds.length === staff.length ? "Clear all" : "Select all"}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {staff.map((member) => (
                          <label key={member.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-md -mx-2">
                            <Checkbox
                              checked={filters.selectedStaffIds.includes(member.id)}
                              onCheckedChange={() => toggleStaff(member.id)}
                            />
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: member.color }}
                            />
                            <span className="flex-1">{member.name}</span>
                            {!member.isAvailable && (
                              <Badge variant="secondary" className="text-xs bg-gray-100">
                                Unavailable
                              </Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFilters({
                            showCompleted: true,
                            showCancelled: false,
                            showBlocked: false,
                            selectedStaffIds: staff.map(s => s.id)
                          });
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
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
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden relative">
          {viewType === "day" && renderDayView()}
          {viewType === "week" && renderWeekView()}
          {viewType === "month" && renderMonthView()}
        </div>

        {/* New Booking Slide-Out */}
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
            setIsBookingOpen(false);
            setNewBookingData({});
          }}
        />

        {/* Booking Details Slide-Out */}
        {selectedBooking && (
          <BookingDetailsSlideOut
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
            booking={selectedBooking}
            staff={visibleStaff}
            onSave={(updatedBooking) => {
              console.log("Updated booking:", updatedBooking);
              // Update the booking in the list
              setBookings(prev => prev.map(b => 
                b.id === updatedBooking.id ? updatedBooking : b
              ));
              setSelectedBooking(null);
            }}
            onDelete={(bookingId) => {
              console.log("Delete booking:", bookingId);
              // Remove the booking from the list
              setBookings(prev => prev.filter(b => b.id !== bookingId));
              setSelectedBooking(null);
            }}
            onStatusChange={(bookingId, newStatus) => {
              // Update booking status
              setBookings(prev => prev.map(b => 
                b.id === bookingId ? { ...b, status: newStatus as any } : b
              ));
              setSelectedBooking(prev => prev ? { ...prev, status: newStatus as any } : null);
            }}
            onPaymentStatusChange={(bookingId, isPaid) => {
              // Update payment status
              setBookings(prev => prev.map(b => 
                b.id === bookingId ? { ...b, isPaid } : b
              ));
              setSelectedBooking(prev => prev ? { ...prev, isPaid } : null);
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}