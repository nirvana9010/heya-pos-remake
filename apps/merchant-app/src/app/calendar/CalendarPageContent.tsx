"use client";

// Import debugging helper in development
// Temporarily disabled to test if this is causing issues
// if (process.env.NODE_ENV === 'development') {
//   require('./debug-calendar');
// }

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
import { DndContext, DragStartEvent, DragEndEvent, pointerWithin, useSensor, useSensors, PointerSensor, TouchSensor, KeyboardSensor } from '@dnd-kit/core';
import { DraggableBooking } from '@/components/calendar/DraggableBooking';
import { DroppableTimeSlot } from '@/components/calendar/DroppableTimeSlot';
import { CalendarDragOverlay } from '@/components/calendar/DragOverlay';
import { validateBookingDrop, detectTimeConflicts } from '@/lib/calendar-drag-utils';
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
import { useToast } from "@heya-pos/ui";
import { safeFormat, isValidDate, getSafeNavigationLabel } from "./calendar-safe";
import { TimeDisplay, TimezoneIndicator } from "@/components/TimeDisplay";
import { initializeConsoleLogger } from "@/lib/console-logger";
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

// Safe component wrapper that prevents Date objects from being rendered
const SafeRender: React.FC<{ children: any }> = ({ children }) => {
  if (children instanceof Date) {
    console.error('Attempted to render Date object:', children);
    return <>{safeFormat(children, 'PPP')}</>;
  }
  
  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, index) => 
          child instanceof Date ? (
            <span key={index}>{safeFormat(child, 'PPP')}</span>
          ) : (
            <React.Fragment key={index}>{child}</React.Fragment>
          )
        )}
      </>
    );
  }
  
  return <>{children}</>;
};

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
  duration?: number; // in minutes
  status: "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  displayStartTime?: string;
  displayEndTime?: string;
  displayDate?: string;
  isPaid: boolean;
  totalPrice: number;
  notes?: string;
  services?: any[]; // for multi-service bookings
}

// Mock data - ONLY FOR DEVELOPMENT
const mockStaff: Staff[] = process.env.NODE_ENV === 'development' ? [
  { id: "1", name: "Emma Wilson", color: "#7C3AED", isVisible: true, isAvailable: true },
  { id: "2", name: "James Brown", color: "#14B8A6", isVisible: true, isAvailable: true },
  { id: "3", name: "Sophie Chen", color: "#F59E0B", isVisible: true, isAvailable: false },
  { id: "4", name: "Michael Davis", color: "#EF4444", isVisible: true, isAvailable: true },
] : [];

const mockBusinessHours: BusinessHours = {
  start: "09:00",
  end: "18:00",
  days: [1, 2, 3, 4, 5]
};

// Generate comprehensive mock bookings
const generateMockBookings = (): Booking[] => {
  const bookings: Booking[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Service details with durations
  const serviceDetails = [
    { name: "Haircut & Style", icon: "scissors", duration: 30, price: 45 },
    { name: "Hair Color", icon: "scissors", duration: 90, price: 120 },
    { name: "Manicure & Pedicure", icon: "palette", duration: 60, price: 85 },
    { name: "Facial Treatment", icon: "sparkles", duration: 60, price: 110 },
    { name: "Deep Tissue Massage", icon: "hand", duration: 60, price: 90 },
    { name: "Eyebrow Threading", icon: "sparkles", duration: 30, price: 35 },
    { name: "Highlights", icon: "scissors", duration: 120, price: 150 },
    { name: "Hair Treatment", icon: "scissors", duration: 45, price: 65 },
    { name: "Nail Art", icon: "palette", duration: 45, price: 55 },
    { name: "Swedish Massage", icon: "hand", duration: 60, price: 80 },
  ];
  
  const customers = [
    { id: "c1", name: "Sarah Johnson", phone: "+1 (555) 123-4567" },
    { id: "c2", name: "Michael Chen", phone: "+1 (555) 234-5678" },
    { id: "c3", name: "Emily Brown", phone: "+1 (555) 345-6789" },
    { id: "c4", name: "Lisa Wang", phone: "+1 (555) 456-7890" },
    { id: "c5", name: "David Kim", phone: "+1 (555) 567-8901" },
    { id: "c6", name: "Jennifer Lee", phone: "+1 (555) 678-9012" },
    { id: "c7", name: "Robert Taylor", phone: "+1 (555) 789-0123" },
    { id: "c8", name: "Maria Garcia", phone: "+1 (555) 890-1234" },
    { id: "c9", name: "James Wilson", phone: "+1 (555) 901-2345" },
    { id: "c10", name: "Patricia Martinez", phone: "+1 (555) 012-3456" },
  ];
  
  const staff = [
    { id: "1", name: "Emma Wilson" },
    { id: "2", name: "James Brown" },
    { id: "3", name: "Sophie Chen" },
    { id: "4", name: "Michael Davis" },
  ];
  
  const statuses: Array<"pending" | "confirmed" | "completed" | "cancelled" | "no-show" | "in-progress"> = 
    ["pending", "confirmed", "completed", "cancelled", "no-show", "confirmed", "confirmed", "completed"];
  
  let bookingId = 1;
  
  // Generate bookings for 14 days (7 past, 7 future)
  for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
    const currentDay = new Date(today);
    currentDay.setDate(today.getDate() + dayOffset);
    const dayOfWeek = currentDay.getDay();
    
    // Determine booking density based on day of week
    let bookingDensity: number;
    let allowOverlaps = true;
    
    switch (dayOfWeek) {
      case 0: // Sunday
        bookingDensity = 0.4;
        allowOverlaps = false; // No overlaps on Sundays
        break;
      case 1: // Monday
      case 2: // Tuesday
        bookingDensity = 0.6;
        allowOverlaps = dayOffset % 2 === 0; // Alternate overlaps
        break;
      case 3: // Wednesday
      case 4: // Thursday
        bookingDensity = 0.75;
        allowOverlaps = true;
        break;
      case 5: // Friday
      case 6: // Saturday
        bookingDensity = 0.9;
        allowOverlaps = true;
        break;
      default:
        bookingDensity = 0.7;
        allowOverlaps = true;
    }
    
    // Track staff schedules for the day to manage overlaps
    const staffSchedules: Map<string, Array<{start: Date, end: Date}>> = new Map();
    staff.forEach(s => staffSchedules.set(s.id, []));
    
    // Generate time slots starting from 9 AM
    let currentTime = new Date(currentDay);
    currentTime.setHours(9, 0, 0, 0);
    const endTime = new Date(currentDay);
    endTime.setHours(19, 0, 0, 0); // 7 PM
    
    while (currentTime < endTime) {
      // Random chance to create booking based on density
      if (Math.random() < bookingDensity) {
        const service = serviceDetails[Math.floor(Math.random() * serviceDetails.length)];
        const customer = customers[Math.floor(Math.random() * customers.length)];
        
        // Find available staff member
        let selectedStaff = null;
        const shuffledStaff = [...staff].sort(() => Math.random() - 0.5);
        
        for (const staffMember of shuffledStaff) {
          const schedule = staffSchedules.get(staffMember.id) || [];
          const bookingEnd = new Date(currentTime.getTime() + service.duration * 60000);
          
          // Check if staff is available
          const hasConflict = schedule.some(slot => {
            return (currentTime >= slot.start && currentTime < slot.end) ||
                   (bookingEnd > slot.start && bookingEnd <= slot.end) ||
                   (currentTime <= slot.start && bookingEnd >= slot.end);
          });
          
          if (!hasConflict || (allowOverlaps && Math.random() < 0.3)) {
            selectedStaff = staffMember;
            schedule.push({ start: new Date(currentTime), end: bookingEnd });
            staffSchedules.set(staffMember.id, schedule);
            break;
          }
        }
        
        if (selectedStaff) {
          const bookingStart = new Date(currentTime);
          const bookingEnd = new Date(currentTime.getTime() + service.duration * 60000);
          
          // Determine status based on time
          let status: typeof statuses[number];
          if (dayOffset < -1) {
            status = "completed";
          } else if (dayOffset === -1) {
            status = Math.random() < 0.1 ? "no-show" : "completed";
          } else if (dayOffset === 0) {
            const now = new Date();
            if (bookingEnd < now) {
              status = "completed";
            } else if (bookingStart < now && bookingEnd > now) {
              status = "in-progress";
            } else {
              status = "confirmed";
            }
          } else {
            status = Math.random() < 0.8 ? "confirmed" : "pending";
          }
          
          // Add some cancelled bookings
          if (Math.random() < 0.05) {
            status = "cancelled";
          }
          
          bookings.push({
            id: bookingId.toString(),
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            serviceName: service.name,
            serviceIcon: service.icon,
            staffId: selectedStaff.id,
            staffName: selectedStaff.name,
            startTime: bookingStart,
            endTime: bookingEnd,
            displayStartTime: format(bookingStart, 'h:mm a'),
            displayEndTime: format(bookingEnd, 'h:mm a'),
            status: status,
            isPaid: status === "completed" || (status === "confirmed" && Math.random() < 0.3),
            totalPrice: service.price,
          });
          
          bookingId++;
        }
      }
      
      // Move to next time slot (15-30 minute increments)
      const increment = Math.random() < 0.7 ? 15 : 30;
      currentTime.setMinutes(currentTime.getMinutes() + increment);
    }
  }
  
  return bookings;
};

const mockBookings: Booking[] = process.env.NODE_ENV === 'development' ? generateMockBookings() : [];

// Log booking summary
const bookingSummary = mockBookings.reduce((acc, booking) => {
  const date = format(booking.startTime, 'yyyy-MM-dd');
  const staffName = booking.staffName;
  
  if (!acc[date]) {
    acc[date] = { total: 0, byStaff: {} };
  }
  
  acc[date].total++;
  acc[date].byStaff[staffName] = (acc[date].byStaff[staffName] || 0) + 1;
  
  return acc;
}, {} as Record<string, { total: number; byStaff: Record<string, number> }>);

// Commenting out console.logs that might cause issues in some environments
// console.log(`Generated ${mockBookings.length} mock bookings for 14 days`);
// console.log('Booking distribution by day:', bookingSummary);

// Keep original mock bookings as fallback
const originalMockBookings: Booking[] = [
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
const generateTimeSlots = (businessHours: BusinessHours, interval: TimeInterval, baseDate: Date = new Date()) => {
  const slots = [];
  const [startHour, startMinute] = businessHours.start.split(':').map(Number);
  const [endHour, endMinute] = businessHours.end.split(':').map(Number);
  
  // Generate slots for the entire day to show non-business hours
  for (let hour = 0; hour <= 23; hour++) {
    const minutes = interval === 60 ? [0] : interval === 30 ? [0, 30] : [0, 15, 30, 45];
    
    for (const minute of minutes) {
      // Use the baseDate to ensure slots have the correct date
      const time = new Date(baseDate);
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
        hour,
        minute,
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
    case "confirmed": return "bg-teal-600 text-white border border-teal-700 shadow-sm";
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

export default function CalendarPageContent() {
  const { toast } = useToast();
  
  console.log('🔄 CalendarPageContent rendering at', new Date().toISOString());
  
  // Ensure initial date is valid 
  const [currentDate, setCurrentDate] = useState(() => {
    const date = new Date();
    if (!isValidDate(date)) {
      console.error('Invalid initial date, using fallback');
      return new Date('2025-01-01');
    }
    return date;
  });
  const [viewType, setViewType] = useState<ViewType>("day");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(15);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(mockBusinessHours);
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
  const [bookings, setBookings] = useState<Booking[]>(() => {
    console.log('📅 Initial bookings state: empty array');
    return [];
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const weekHeaderRef = useRef<HTMLDivElement>(null);
  
  // Drag and drop state
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<{
    staffId: string;
    staffName: string;
    startTime: Date;
    endTime: Date;
  } | null>(null);
  
  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Small distance to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // Initialize console logger
  useEffect(() => {
    initializeConsoleLogger();
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const booking = bookings.find(b => b.id === active.id);
    if (booking) {
      setActiveBooking(booking);
      setIsDragging(true);
    }
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    
    if (over && over.data.current?.type === 'timeSlot') {
      const targetSlot = over.data.current;
      const staffMember = staff.find(s => s.id === targetSlot.staffId);
      
      setDragOverSlot({
        staffId: targetSlot.staffId,
        staffName: staffMember?.name || 'Staff',
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      });
    } else {
      setDragOverSlot(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended:', { active: active?.id, over: over?.id });
    
    // Quick debug - write to file
    if (typeof window !== 'undefined') {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        event: 'drag_end',
        activeId: active?.id,
        overId: over?.id,
        activeBooking: activeBooking ? {
          id: activeBooking.id,
          staffId: activeBooking.staffId,
          staffName: activeBooking.staffName,
        } : null,
        targetSlot: over?.data?.current || null,
      };
      
      // Debug logging removed for production
    }
    
    setIsDragging(false);
    setActiveBooking(null);
    setDragOverSlot(null);
    
    if (!over || !activeBooking) {
      console.log('No over target or active booking');
      return;
    }
    
    const targetSlot = over.data.current;
    console.log('Target slot:', targetSlot);
    
    if (!targetSlot || targetSlot.type !== 'timeSlot') {
      console.log('Invalid target slot type');
      return;
    }
    
    // Validate the drop
    const validation = validateBookingDrop(
      activeBooking,
      {
        staffId: targetSlot.staffId,
        startTime: targetSlot.startTime,
        endTime: targetSlot.endTime,
      },
      bookings,
      {
        start: parseInt(businessHours.start.split(':')[0]),
        end: parseInt(businessHours.end.split(':')[0]),
      }
    );
    
    console.log('Validation result:', validation);
    console.log('Active booking:', activeBooking);
    
    if (!validation.canDrop) {
      toast({
        title: "Cannot move booking",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }
    
    // Optimistic update
    const previousBookings = [...bookings];
    console.log('Previous bookings count:', previousBookings.length);
    
    const updatedBooking = {
      ...activeBooking,
      staffId: targetSlot.staffId,
      staffName: staff.find(s => s.id === targetSlot.staffId)?.name || activeBooking.staffName,
      startTime: targetSlot.startTime,
      endTime: new Date(targetSlot.startTime.getTime() + (activeBooking.duration || 60) * 60000),
    };
    
    console.log('Updating booking:', {
      id: activeBooking.id,
      oldTime: activeBooking.startTime,
      newTime: targetSlot.startTime
    });
    
    const newBookings = bookings.map(b => b.id === activeBooking.id ? updatedBooking : b);
    console.log('New bookings count:', newBookings.length);
    
    setBookings(newBookings);
    
    try {
      // Call API to update booking
      console.log('Calling API to reschedule booking:', {
        bookingId: activeBooking.id,
        oldStaffId: activeBooking.staffId,
        newStaffId: targetSlot.staffId,
        staffChanged: activeBooking.staffId !== targetSlot.staffId,
        startTime: targetSlot.startTime.toISOString(),
      });
      
      // Check if we're changing staff
      const isChangingStaff = activeBooking.staffId !== targetSlot.staffId;
      
      let reschedulePromise;
      
      // V2 API now properly handles both time and staff updates together
      console.log('Updating booking with V2 API - time and staff together');
      reschedulePromise = apiClient.rescheduleBooking(activeBooking.id, {
        startTime: targetSlot.startTime.toISOString(),
        staffId: targetSlot.staffId, // V2 API accepts staffId directly
      });
      
      // Add a timeout to detect if the API is hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), 10000)
      );
      
      const result = await Promise.race([reschedulePromise, timeoutPromise]);
      
      console.log('Reschedule successful, result:', result);
      
      // Debug logging removed for production
      
      toast({
        title: "Booking moved",
        description: "The booking has been rescheduled successfully.",
      });
      
      // Refresh bookings to get latest data
      console.log('Refreshing bookings after successful reschedule...');
      await loadBookings();
    } catch (error: any) {
      // Rollback on failure
      console.error('Reschedule error:', error);
      console.error('Error response:', error?.response);
      console.error('Full error object:', {
        message: error?.message,
        stack: error?.stack,
        config: error?.config,
        code: error?.code
      });
      
      // Debug logging removed for production
        }).catch(() => {});
      }
      
      console.log('Rolling back to previous bookings...');
      console.log('Bookings before rollback:', bookings.length);
      console.log('Rolling back to:', previousBookings.length);
      
      setBookings(previousBookings);
      
      // Double-check the booking wasn't lost
      setTimeout(() => {
        console.log('Bookings after rollback:', bookings.length);
        if (bookings.length === 0 && previousBookings.length > 0) {
          console.error('CRITICAL: Bookings were lost! Reloading...');
          loadBookings();
        }
      }, 100);
      
      let errorMessage = "Failed to move booking";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Load bookings from API
  const loadBookings = async () => {
    console.log('📚 loadBookings called');
    
    // Check if we have a token
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No access token found, redirecting to login...');
      window.location.href = '/login';
      return;
    }
    
    try {
      setLoading(true);
      
      // Pass date parameters based on view type
      let params: any = {};
      
      console.log('Loading bookings for:', {
        viewType,
        currentDate: currentDate.toISOString(),
        currentDateLocal: currentDate.toLocaleDateString()
      });
      
      if (viewType === 'day') {
        // For day view, get bookings for the specific date
        params.date = currentDate.toISOString().split('T')[0];
        console.log('Day view params:', params);
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
        
        console.log('🔍 Calling apiClient.getBookings with params:', params);
        const apiBookings = await apiClient.getBookings(params);
        
        console.log('=== API BOOKINGS LOADED ===');
        console.log('Number of bookings from API:', apiBookings.length);
        console.log('API response:', apiBookings);
        if (apiBookings.length > 0) {
          console.log('First booking from API:', apiBookings[0]);
          console.log('Booking fields:', Object.keys(apiBookings[0]));
          console.log('First booking startTime raw:', apiBookings[0].startTime);
          console.log('First booking startTime as Date:', new Date(apiBookings[0].startTime));
          console.log('User timezone offset:', new Date().getTimezoneOffset());
        }
        console.log('=== END API BOOKINGS ===');
        
        // API client already transforms the data, just adjust for calendar view
        const transformedBookings = apiBookings.map((booking: any) => {
          // Ensure dates are Date objects (they might be strings from API)
          const startTime = booking.startTime instanceof Date ? booking.startTime : new Date(booking.startTime);
          const endTime = booking.endTime instanceof Date ? booking.endTime : new Date(booking.endTime);
          
          return {
            id: booking.id,
            customerId: booking.customerId,
            customerName: booking.customerName || 'Unknown',
            customerPhone: booking.customerPhone || '',
            customerEmail: booking.customerEmail || booking.customer?.email || '',
            serviceName: booking.serviceName || 'Service',
            serviceIcon: 'scissors' as const, // Default icon
            staffId: booking.staffId || booking.providerId || 'unknown',
            staffName: booking.staffName || 'Staff',
            startTime,
            endTime,
            status: (booking.status || 'pending').toLowerCase().replace('_', '-') as any,
            isPaid: booking.paidAmount > 0 || false,
            totalPrice: booking.totalAmount || booking.price || 0,
            notes: booking.notes || '',
            // Add display times for timezone-aware display
            displayStartTime: booking.displayStartTime,
            displayEndTime: booking.displayEndTime,
            displayDate: booking.displayDate,
          };
        });
        
        setBookings(transformedBookings);
        console.log('Successfully loaded', transformedBookings.length, 'bookings from API');
      } catch (error: any) {
        console.error('Failed to load bookings:', error);
        console.error('Error details:', {
          message: error?.message,
          response: error?.response,
          status: error?.response?.status,
          data: error?.response?.data
        });
        
        // If it's a 401, redirect to login
        if (error?.response?.status === 401) {
          console.error('Authentication failed, redirecting to login...');
          window.location.href = '/login';
          return;
        }
        
        toast({
          title: "Error loading bookings",
          description: "Unable to load booking data. Please check your connection and refresh.",
          variant: "destructive",
        });
        // Only use mock data in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Using MOCK bookings - drag and drop will not work with API!');
          setBookings(mockBookings);
        }
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
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
        toast({
          title: "Error loading staff",
          description: "Unable to load staff data. Please refresh the page.",
          variant: "destructive",
        });
        // Don't use mock data in production
        if (process.env.NODE_ENV === 'development') {
          setStaff(mockStaff);
        }
      }
    };

    loadStaff();
  }, []);

  // Load location data to get actual business hours
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        const locations = await apiClient.getLocations();
        if (locations && locations.length > 0) {
          const location = locations[0]; // Use first location
          
          // Check if businessHours exists in the location data
          if (location.businessHours && typeof location.businessHours === 'object') {
            // Parse business hours from the location
            const hours = location.businessHours;
            
            // Expected format: { monday: { open: "09:00", close: "18:00" }, ... }
            // or: { start: "09:00", end: "18:00", days: [1,2,3,4,5] }
            
            if (hours.start && hours.end) {
              setBusinessHours({
                start: hours.start,
                end: hours.end,
                days: hours.days || [1, 2, 3, 4, 5] // Default to Mon-Fri if not specified
              });
            } else {
              // Try to extract from weekly schedule
              const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const openDays: number[] = [];
              let earliestStart = '';
              let latestEnd = '';
              
              daysOfWeek.forEach((day, index) => {
                const dayHours = hours[day];
                if (dayHours && (dayHours.open || dayHours.start)) {
                  openDays.push(index);
                  const dayStart = dayHours.open || dayHours.start;
                  const dayEnd = dayHours.close || dayHours.end;
                  
                  // Find the earliest opening time
                  if (!earliestStart || dayStart < earliestStart) {
                    earliestStart = dayStart;
                  }
                  // Find the latest closing time
                  if (!latestEnd || dayEnd > latestEnd) {
                    latestEnd = dayEnd;
                  }
                }
              });
              
              if (earliestStart && latestEnd && openDays.length > 0) {
                setBusinessHours({
                  start: earliestStart,
                  end: latestEnd,
                  days: openDays
                });
                console.log('Loaded business hours:', { start: earliestStart, end: latestEnd, days: openDays });
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load location data:', error);
        // Keep using mock business hours if load fails
      }
    };

    loadLocationData();
  }, []);

  // Scroll to business hours on mount or view change
  useEffect(() => {
    if (calendarScrollRef.current && businessHours) {
      let scrollPosition = 0;
      
      // Parse business hours start time
      const [startHour, startMinute] = businessHours.start.split(':').map(Number);
      const scrollToHour = Math.max(0, startHour - 0.5); // 30 minutes before business start
      
      if (viewType === "day") {
        // Calculate scroll position based on business hours
        const slotHeight = timeInterval === 60 ? 60 : timeInterval === 30 ? 30 : 24;
        const slotsPerHour = 60 / timeInterval;
        scrollPosition = scrollToHour * slotsPerHour * slotHeight;
      } else if (viewType === "week") {
        // For week view, scroll to 30 minutes before business start
        scrollPosition = scrollToHour * 64; // 64px per hour in week view
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
  }, [viewType, timeInterval, businessHours]);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(businessHours, timeInterval, currentDate);
  }, [businessHours, timeInterval, currentDate]);
  
  // If no staff are selected, show all staff. Otherwise show only selected staff.
  const visibleStaff = filters.selectedStaffIds.length === 0 
    ? staff 
    : staff.filter(s => filters.selectedStaffIds.includes(s.id));
  
  const filteredBookings = useMemo(() => {
    console.log('=== FILTERING BOOKINGS ===');
    console.log('Total bookings to filter:', bookings.length);
    console.log('Filter settings:', {
      showCompleted: filters.showCompleted,
      showCancelled: filters.showCancelled,
      selectedStaffIds: filters.selectedStaffIds,
      selectedStaffIdsLength: filters.selectedStaffIds.length
    });
    
    const filtered = bookings.filter((booking, index) => {
      // Log first 3 bookings in detail
      if (index < 3) {
        console.log(`Booking ${index}:`, {
          id: booking.id,
          staffId: booking.staffId,
          status: booking.status,
          customerName: booking.customerName
        });
      }
      
      if (!filters.showCompleted && booking.status === "completed") {
        console.log(`Filtered out booking ${booking.id} - completed and showCompleted=false`);
        return false;
      }
      if (!filters.showCancelled && booking.status === "cancelled") {
        console.log(`Filtered out booking ${booking.id} - cancelled and showCancelled=false`);
        return false;
      }
      // If no staff are selected (initial state), show all bookings
      // Otherwise, filter by selected staff
      if (filters.selectedStaffIds.length > 0 && !filters.selectedStaffIds.includes(booking.staffId)) {
        if (index < 3) {
          console.log(`Filtered out booking ${booking.id} - staffId ${booking.staffId} not in selected:`, filters.selectedStaffIds);
        }
        return false;
      }
      return true;
    });
    
    console.log('Filtered bookings count:', filtered.length);
    console.log('=== END FILTERING ===');
    
    return filtered;
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
    return getSafeNavigationLabel(currentDate, viewType, direction);
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!filters.showCompleted) count++;
    if (filters.showCancelled) count++;
    if (filters.showBlocked) count++;
    if (filters.selectedStaffIds.length < staff.length) count++;
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
          className="grid sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm min-w-[600px]"
          style={{ gridTemplateColumns: gridColumns }}
        >
          <div className="h-16 border-r border-gray-100 bg-gray-50" /> {/* Time column header */}
          {visibleStaff.map((staffMember) => {
            const todayBookings = filteredBookings.filter(b => 
              b.staffId === staffMember.id && 
              isSameDay(b.startTime, currentDate)
            );
            const confirmedCount = todayBookings.filter(b => b.status === 'confirmed' || b.status === 'in-progress').length;
            
            return (
              <div key={staffMember.id} className="h-16 px-4 flex items-center justify-between border-r border-gray-100 last:border-r-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm" 
                         style={{ backgroundColor: staffMember.color }}>
                      {staffMember.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {staffMember.isAvailable && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-900">{staffMember.name}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 font-medium">
                        {confirmedCount} active
                      </span>
                      {todayBookings.length > confirmedCount && (
                        <span className="text-gray-400">
                          • {todayBookings.length - confirmedCount} other
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!staffMember.isAvailable && (
                  <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200">Unavailable</Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable calendar grid */}
        <div 
          className="flex-1 overflow-auto calendar-scroll-container" 
          ref={calendarScrollRef}
        >
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
                    "text-right pr-3 text-xs relative flex items-center justify-end",
                    slot.isHour ? "border-b border-gray-200" : slot.isMinorInterval ? "border-b border-gray-50" : "border-b border-gray-100",
                    "border-r border-gray-100",
                    !slot.isBusinessHours && "bg-gray-50/50"
                  )}
                  style={{ height: `${slot.height}px` }}
                >
                  {/* Show time only on hour marks */}
                  {slot.isHour && (
                    <span className={cn(
                      "font-medium",
                      !slot.isBusinessHours ? "text-gray-400" : "text-gray-600"
                    )}>
                      {slot.label}
                    </span>
                  )}
                </div>

                {/* Staff cells for this time slot */}
                {visibleStaff.map((staffMember) => {
                  // Debug logging for first slot and first staff member
                  if (slotIndex === 0 && staffMember === visibleStaff[0]) {
                    const todayBookings = filteredBookings.filter(b => isSameDay(b.startTime, currentDate));
                    
                    // Log EVERYTHING to find the issue
                    console.log('=== CALENDAR DEBUG ===');
                    console.log('View Type:', viewType);
                    console.log('Current Date:', currentDate.toDateString());
                    console.log('Staff Info:', {
                      totalStaff: staff.length,
                      visibleStaffCount: visibleStaff.length,
                      visibleStaffIds: visibleStaff.map(s => s.id),
                      currentStaffId: staffMember.id,
                      currentStaffName: staffMember.name
                    });
                    
                    console.log('Booking Info:', {
                      totalBookings: bookings.length,
                      filteredBookings: filteredBookings.length,
                      bookingsForToday: todayBookings.length,
                      allBookingStaffIds: [...new Set(filteredBookings.map(b => b.staffId))],
                      rawBookingsFirst3: bookings.slice(0, 3).map(b => ({
                        id: b.id,
                        staffId: b.staffId,
                        status: b.status,
                        startTime: b.startTime
                      })),
                      firstThreeBookings: filteredBookings.slice(0, 3).map(b => ({
                        id: b.id,
                        staffId: b.staffId,
                        staffName: b.staffName,
                        customerName: b.customerName,
                        startTime: b.startTime,
                        startTimeString: b.startTime?.toString(),
                        status: b.status
                      }))
                    });
                    
                    console.log('Time Slot Info:', {
                      slotTime: slot.time,
                      slotHour: slot.hour,
                      slotMinute: slot.minute,
                      slotTimeString: slot.time?.toString()
                    });
                    
                    // Check if ANY booking would match this slot
                    const potentialMatches = filteredBookings.filter(b => {
                      const sameStaff = b.staffId === staffMember.id;
                      const sameDay = isSameDay(b.startTime, currentDate);
                      const sameHour = b.startTime.getHours() === slot.hour;
                      const sameMinute = b.startTime.getMinutes() === slot.minute;
                      
                      if (!sameStaff || !sameDay) return false;
                      
                      console.log('Checking booking match:', {
                        bookingId: b.id,
                        sameStaff,
                        sameDay,
                        sameHour,
                        sameMinute,
                        bookingHour: b.startTime.getHours(),
                        slotHour: slot.hour,
                        bookingMinute: b.startTime.getMinutes(),
                        slotMinute: slot.minute
                      });
                      
                      return true;
                    });
                    
                    console.log('Potential matches for this staff today:', potentialMatches.length);
                    console.log('=== END DEBUG ===');
                  }
                  
                  // Find bookings that match this time slot
                  const slotBookings = filteredBookings.filter(b => 
                    b.staffId === staffMember.id &&
                    isSameDay(b.startTime, currentDate) &&
                    b.startTime.getHours() === slot.hour &&
                    b.startTime.getMinutes() === slot.minute
                  );

                  const conflicts = detectConflicts(filteredBookings, staffMember.id);
                  
                  return (
                    <DroppableTimeSlot
                      key={`${staffMember.id}-${slotIndex}`}
                      id={`slot-${staffMember.id}-${slot.hour}-${slot.minute}`}
                      staffId={staffMember.id}
                      startTime={slot.time}
                      endTime={new Date(slot.time.getTime() + timeInterval * 60000)}
                      isDisabled={!staffMember.isAvailable || !slot.isBusinessHours}
                      className={cn(
                        "cursor-pointer relative group transition-colors",
                        slot.isHour ? "border-b border-gray-200" : slot.isMinorInterval ? "border-b border-gray-50" : "border-b border-gray-100",
                        "border-r border-gray-100 last:border-r-0",
                        !slot.isBusinessHours ? "bg-gray-50/30" : "bg-white hover:bg-gray-50/30"
                      )}
                    >
                      <div
                        style={{ height: `${slot.height}px` }}
                        onClick={() => {
                          if (!staffMember.isAvailable) return;
                          const clickedTime = new Date(currentDate);
                          clickedTime.setHours(slot.hour, slot.minute, 0, 0);
                          
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
                        <div className="absolute inset-0 bg-gray-900/3 pointer-events-none" />
                      )}

                      {/* Hover effect - simple */}
                      {hoveredSlot?.staffId === staffMember.id && 
                       hoveredSlot?.time.getHours() === slot.time.getHours() &&
                       hoveredSlot?.time.getMinutes() === slot.time.getMinutes() && 
                       slotBookings.length === 0 && 
                       staffMember.isAvailable && 
                       slot.isBusinessHours && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 rounded">
                          <div className="bg-white rounded-full p-1.5 shadow-sm">
                            <Plus className="h-3.5 w-3.5 text-gray-500" />
                          </div>
                        </div>
                      )}
                        
                      {/* Appointments */}
                      {slotBookings.map((booking, bookingIndex) => {
                        const duration = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60);
                        const isPast = booking.startTime < currentTime && booking.status !== "in-progress";
                        const hasConflict = conflicts.has(booking.id);
                        
                        // Calculate side-by-side layout for overlapping bookings
                        const overlapCount = slotBookings.length;
                        const gapBetweenBookings = 2; // pixels between bookings
                        const bookingWidth = overlapCount > 1 
                          ? `calc(${100 / overlapCount}% - ${gapBetweenBookings * (overlapCount - 1) / overlapCount}px)`
                          : '100%';
                        const bookingLeft = overlapCount > 1 
                          ? `calc(${bookingIndex * (100 / overlapCount)}% + ${bookingIndex * gapBetweenBookings / overlapCount}px)`
                          : '0';
                        
                        // Determine colors and styles based on status
                        let bgColor = staffMember.color;
                        let bgOpacity = 0.9; // High opacity for vibrant colors like mock calendar
                        let textColor = "text-white";
                        let borderWidth = "4px";
                        
                        if (booking.status === "completed" || isPast) {
                          bgOpacity = 0.3; // More visible for completed bookings
                          textColor = "text-gray-700";
                          borderWidth = "3px";
                        } else if (booking.status === "cancelled") {
                          bgOpacity = 0.2; // Still visible but clearly different
                          textColor = "text-gray-500";
                          borderWidth = "3px";
                        } else if (booking.status === "no-show") {
                          bgOpacity = 0.2;
                          textColor = "text-gray-500";
                          borderWidth = "3px";
                        }
                        
                        return (
                          <DraggableBooking
                            key={booking.id}
                            id={booking.id}
                            isDisabled={booking.status === "completed" || booking.status === "cancelled" || isPast}
                          >
                            <div
                              className={cn(
                                "absolute top-0 rounded-md text-xs",
                                "transition-all duration-200 hover:scale-[1.02] hover:z-30",
                                "shadow-sm hover:shadow-lg",
                                booking.status === "in-progress" && "ring-2 ring-teal-400 ring-opacity-50 animate-[subtlePulse_2s_ease-in-out_infinite]",
                                booking.status === "cancelled" && "opacity-60",
                                hasConflict && "ring-2 ring-red-500 ring-offset-1",
                                textColor,
                                isDragging && activeBooking?.id === booking.id && "opacity-50",
                                !isPast && booking.status !== "completed" && booking.status !== "cancelled" && "cursor-grab active:cursor-grabbing"
                              )}
                              style={{
                                left: bookingLeft,
                                width: bookingWidth,
                                height: `calc(${(duration / timeInterval) * slot.height}px - 4px)`,
                                backgroundColor: hexToRgba(bgColor, bgOpacity),
                                borderLeft: `${borderWidth} solid ${bgColor}`,
                                zIndex: hoveredBooking === booking.id ? 40 : 15 + bookingIndex // Lift on hover
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Only open details if not dragging
                                if (!isDragging) {
                                  setSelectedBooking(booking);
                                }
                              }}
                              onMouseEnter={() => setHoveredBooking(booking.id)}
                              onMouseLeave={() => setHoveredBooking(null)}
                            >
                            <div className="p-2 h-full flex flex-col relative overflow-hidden">
                              {/* Content with improved hierarchy */}
                              <div className="space-y-0.5">
                                <div className={cn(
                                  "font-semibold truncate leading-tight",
                                  textColor === "text-white" ? "" : "text-gray-900"
                                )} style={{ fontSize: '14px' }}>
                                  {booking.customerName}
                                </div>
                                {(overlapCount <= 2 || duration >= 45) && ( // Show service name if space allows
                                  <div className={cn(
                                    "truncate leading-tight",
                                    textColor === "text-white" ? "opacity-90" : "text-gray-600"
                                  )} style={{ fontSize: '12px' }}>
                                    {booking.serviceName}
                                  </div>
                                )}
                              </div>
                              
                              {/* Duration chip in bottom-right corner */}
                              {duration >= 30 && (
                                <div className={cn(
                                  "absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                                  textColor === "text-white" 
                                    ? "bg-black/20 text-white/90" 
                                    : "bg-gray-100 text-gray-600"
                                )}>
                                  <Clock className="h-2.5 w-2.5" />
                                  {duration}m
                                </div>
                              )}
                              
                              {/* Payment indicator */}
                              <div className="absolute top-1.5 right-1.5">
                                <div className={cn(
                                  "w-2 h-2 rounded-full shadow-sm",
                                  booking.isPaid ? "bg-green-500" : "bg-orange-500",
                                  textColor === "text-white" && "ring-1 ring-white/30"
                                )} />
                              </div>
                              
                              {/* Overlap indicator */}
                              {overlapCount > 1 && (
                                <div className="absolute -top-1 -left-1 bg-red-500 text-white rounded-br-md px-1" style={{ fontSize: '10px' }}>
                                  {bookingIndex + 1}/{overlapCount}
                                </div>
                              )}
                              
                            </div>
                            
                            {/* Enhanced hover tooltip */}
                            {hoveredBooking === booking.id && (
                              <div className="absolute z-50 -top-2 left-full ml-2 bg-white shadow-xl rounded-lg p-4 w-64 pointer-events-none border border-gray-100">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-semibold text-base text-gray-900">{booking.customerName}</div>
                                      <div className="text-sm text-gray-600">{booking.serviceName}</div>
                                    </div>
                                    <div className={cn(
                                      "px-2 py-1 rounded-full text-xs font-medium",
                                      booking.status === 'confirmed' && "bg-teal-100 text-teal-700",
                                      booking.status === 'in-progress' && "bg-teal-100 text-teal-700",
                                      booking.status === 'completed' && "bg-gray-100 text-gray-700",
                                      booking.status === 'cancelled' && "bg-red-100 text-red-700 line-through",
                                      booking.status === 'no-show' && "bg-orange-100 text-orange-700"
                                    )}>
                                      {booking.status === 'in-progress' ? 'In Progress' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    {booking.displayStartTime || (booking.startTime instanceof Date ? format(booking.startTime, 'h:mm a') : 'N/A')} - {booking.displayEndTime || (booking.endTime instanceof Date ? format(booking.endTime, 'h:mm a') : 'N/A')}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <DollarSign className="h-3.5 w-3.5" />
                                    ${booking.totalPrice}
                                    {booking.isPaid && <span className="text-green-600 font-medium ml-1">• Paid</span>}
                                  </div>
                                  {booking.customerPhone && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <Phone className="h-3.5 w-3.5" />
                                      {booking.customerPhone}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            </div>
                          </DraggableBooking>
                          );
                        })}
                      </div>
                    </DroppableTimeSlot>
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
        <div className="h-20 border-b border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="flex h-full">
            <div className="w-20 flex-shrink-0 border-r border-gray-100 bg-gray-50 h-full" />
            <div className="flex flex-1 min-w-[860px]">
              {weekDays.map((day) => {
                const dayBookings = filteredBookings.filter(b => 
                  isSameDay(b.startTime, day)
                );
                const totalRevenue = dayBookings
                  .filter(b => b.status !== 'cancelled' && b.status !== 'no-show')
                  .reduce((sum, b) => sum + b.totalPrice, 0);

                return (
                  <div key={day.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0 px-3 py-2 h-full">
                    <div className="flex items-center justify-between h-full">
                      <div>
                        <div className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          isToday(day) ? "text-teal-600" : "text-gray-500"
                        )}>
                          {safeFormat(day, "EEE")}
                        </div>
                        <div className={cn(
                          "text-2xl font-bold mt-0.5",
                          isToday(day) ? "text-teal-600" : "text-gray-900"
                        )}>
                          {safeFormat(day, "d")}
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
          className="flex-1 overflow-auto calendar-scroll-container" 
          ref={calendarScrollRef} 
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-100 sticky left-0 z-10" style={{ height: `${24 * 64}px` }}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-200 text-right pr-3 text-xs font-medium text-gray-600 flex items-center justify-end bg-gray-50"
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
                  <div key={day.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0 relative" style={{ height: `${24 * 64}px` }}>
                    {/* Hour blocks */}
                    {Array.from({ length: 24 }, (_, hour) => {
                      const isBusinessHour = hour >= 9 && hour < 18;
                      return (
                        <div
                          key={hour}
                          className={cn(
                            "h-16 border-b border-gray-200 relative",
                            "cursor-pointer transition-colors",
                            isBusinessHour ? "hover:bg-gray-50/50" : "bg-gray-50/30"
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
                            <div className="absolute inset-0 bg-gray-900/3 pointer-events-none" />
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
                        
                        // Consistent color scheme with day view
                        let bgOpacity = 0.9; // High opacity for vibrant colors
                        let borderWidth = "4px";
                        if (booking.status === "completed" || isPast) {
                          bgOpacity = 0.3; // More visible for completed bookings
                          borderWidth = "3px";
                        } else if (booking.status === "cancelled") {
                          bgOpacity = 0.2; // Still visible but clearly different
                          borderWidth = "3px";
                        } else if (booking.status === "no-show") {
                          bgOpacity = 0.2;
                          borderWidth = "3px";
                        }

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
                                // Only open details if not dragging
                                if (!isDragging) {
                                  setSelectedBooking(booking);
                                }
                              }}
                              onMouseEnter={() => setHoveredBooking(booking.id)}
                              onMouseLeave={() => setHoveredBooking(null)}
                            >
                              <div className="font-medium truncate" style={{ fontSize: '10px' }}>
                                {format(booking.startTime, 'HH:mm')} {booking.customerName.split(' ').map(n => n[0]).join('')}
                              </div>
                              {booking.isPaid && <div className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0" />}
                              
                              {/* Enhanced tooltip for compact mode */}
                              {hoveredBooking === booking.id && (
                                <div className="absolute z-50 top-full left-0 mt-1 bg-white shadow-xl rounded-lg p-4 w-64 pointer-events-none border border-gray-100">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="font-semibold text-base text-gray-900">{booking.customerName}</div>
                                        <div className="text-sm text-gray-600">{booking.serviceName}</div>
                                      </div>
                                      <div className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        booking.status === 'confirmed' && "bg-teal-100 text-teal-700",
                                        booking.status === 'in-progress' && "bg-teal-100 text-teal-700",
                                        booking.status === 'completed' && "bg-gray-100 text-gray-700",
                                        booking.status === 'cancelled' && "bg-red-100 text-red-700 line-through",
                                        booking.status === 'no-show' && "bg-orange-100 text-orange-700"
                                      )}>
                                        {booking.status === 'in-progress' ? 'In Progress' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <Clock className="h-3.5 w-3.5" />
                                      <TimeDisplay date={booking.startTime} format="time" showTimezone={false} /> - 
                                      <TimeDisplay date={booking.endTime} format="time" showTimezone={true} />
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <DollarSign className="h-3.5 w-3.5" />
                                      ${booking.totalPrice}
                                      {booking.isPaid && <span className="text-green-600 font-medium ml-1">• Paid</span>}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <Users className="h-3.5 w-3.5" />
                                      {booking.staffName}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Normal layout (up to 4 columns)
                        return (
                          <DraggableBooking
                            key={booking.id}
                            id={booking.id}
                            isDisabled={booking.status === "completed" || booking.status === "cancelled" || isPast}
                          >
                            <div
                              className={cn(
                                "absolute rounded-md shadow-sm",
                                "transition-all duration-200 hover:shadow-lg hover:scale-[1.01] hover:z-20",
                                "text-xs",
                                booking.status === "in-progress" && "ring-2 ring-teal-400 ring-opacity-50 animate-[subtlePulse_2s_ease-in-out_infinite]",
                                booking.status === "cancelled" && "opacity-60",
                                layout.isOverflow && "ring-1 ring-orange-400",
                                (booking.status === "completed" || isPast) ? "text-gray-700" : "text-white",
                                isDragging && activeBooking?.id === booking.id && "opacity-50",
                                !isPast && booking.status !== "completed" && booking.status !== "cancelled" && "cursor-grab active:cursor-grabbing"
                              )}
                              style={{
                                top: `${topPosition}px`,
                                height: `${Math.max(height - 4, 20)}px`,
                                left: `${layout.left}%`,
                                width: `${layout.width}%`,
                                borderLeft: `${borderWidth} solid ${staffColor}`,
                                backgroundColor: hexToRgba(staffColor, bgOpacity)
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Only open details if not dragging
                                if (!isDragging) {
                                  setSelectedBooking(booking);
                                }
                              }}
                              onMouseEnter={() => setHoveredBooking(booking.id)}
                              onMouseLeave={() => setHoveredBooking(null)}
                            >
                          <div className="h-full flex flex-col p-2">
                            {/* For narrow columns, show minimal info */}
                            {layout.width < 35 ? (
                              <div className="space-y-0.5">
                                <div className={cn(
                                  "font-semibold truncate",
                                  (booking.status === "completed" || isPast) ? "text-gray-900" : ""
                                )} style={{ fontSize: '12px' }}>
                                  {booking.customerName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    booking.isPaid ? "bg-green-500" : "bg-orange-500"
                                  )} />
                                  <span className={cn(
                                    "text-xs",
                                    (booking.status === "completed" || isPast) ? "text-gray-600" : "opacity-90"
                                  )}>
                                    {format(booking.startTime, 'HH:mm')}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* Normal width - show more info */
                              <>
                                <div className="space-y-0.5">
                                  <div className={cn(
                                    "font-semibold truncate leading-tight",
                                    (booking.status === "completed" || isPast) ? "text-gray-900" : ""
                                  )} style={{ fontSize: height > 50 ? '14px' : '12px' }}>
                                    {booking.customerName}
                                  </div>
                                  {height > 35 && (
                                    <div className={cn(
                                      "truncate leading-tight",
                                      (booking.status === "completed" || isPast) ? "text-gray-600" : "opacity-90"
                                    )} style={{ fontSize: '11px' }}>
                                      {booking.serviceName}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Duration chip if space allows */}
                                {height > 60 && (
                                  <div className={cn(
                                    "absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                                    (booking.status === "completed" || isPast)
                                      ? "bg-gray-100 text-gray-600" 
                                      : "bg-black/20 text-white/90"
                                  )}>
                                    <Clock className="h-2.5 w-2.5" />
                                    {Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60))}m
                                  </div>
                                )}
                                
                                {/* Payment indicator */}
                                <div className="absolute top-1.5 right-1.5">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full shadow-sm",
                                    booking.isPaid ? "bg-green-500" : "bg-orange-500",
                                    !(booking.status === "completed" || isPast) && "ring-1 ring-white/30"
                                  )} />
                                </div>
                              </>
                            )}
                          </div>

                          {/* Enhanced hover tooltip - same as day view */}
                          {hoveredBooking === booking.id && (
                            <div className="absolute z-50 top-full left-0 mt-1 bg-white shadow-xl rounded-lg p-4 w-64 pointer-events-none border border-gray-100">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-semibold text-base text-gray-900">{booking.customerName}</div>
                                    <div className="text-sm text-gray-600">{booking.serviceName}</div>
                                  </div>
                                  <div className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    booking.status === 'confirmed' && "bg-teal-100 text-teal-700",
                                    booking.status === 'in-progress' && "bg-teal-100 text-teal-700",
                                    booking.status === 'completed' && "bg-gray-100 text-gray-700",
                                    booking.status === 'cancelled' && "bg-red-100 text-red-700 line-through",
                                    booking.status === 'no-show' && "bg-orange-100 text-orange-700"
                                  )}>
                                    {booking.status === 'in-progress' ? 'In Progress' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Clock className="h-3.5 w-3.5" />
                                  <TimeDisplay date={booking.startTime} format="time" showTimezone={false} /> - 
                                  <TimeDisplay date={booking.endTime} format="time" showTimezone={true} />
                                  <span className="text-gray-600 font-medium ml-1">({duration}m)</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  ${booking.totalPrice}
                                  {booking.isPaid && <span className="text-green-600 font-medium ml-1">• Paid</span>}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Users className="h-3.5 w-3.5" />
                                  {booking.staffName}
                                </div>
                                {booking.customerPhone && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <Phone className="h-3.5 w-3.5" />
                                    {booking.customerPhone}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                            </div>
                          </DraggableBooking>
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
              if (!day || !(day instanceof Date)) {
                console.error("Invalid day in calendar grid:", day);
                return null;
              }
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
                    isToday(day) && "ring-2 ring-teal-600 ring-inset",
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
                      isToday(day) && "bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    )}>
                      {safeFormat(day, "d")}
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
                      {safeFormat(day, "EEEE, MMM d")}
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

  // Wrap the entire component to catch any Date rendering issues
  return (
    <TooltipProvider>
      <DndContext 
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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
                    <p>{String(getNavigationLabel("prev") || "")}</p>
                  </TooltipContent>
                </Tooltip>
                
                <div className="px-4 py-1 min-w-[240px] text-center">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {viewType === "day" && safeFormat(currentDate, "EEEE, MMMM d, yyyy")}
                    {viewType === "week" && (() => {
                      const weekStart = startOfWeek(currentDate);
                      const formatted = safeFormat(weekStart, "MMM d, yyyy");
                      return formatted ? `Week of ${formatted}` : '';
                    })()}
                    {viewType === "month" && safeFormat(currentDate, "MMMM yyyy")}
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
                    <p>{String(getNavigationLabel("next") || "")}</p>
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
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
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
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => setFiltersOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                className="h-10 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
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
        {isBookingOpen && (
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
        )}

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
        
        {/* Drag Overlay */}
        <CalendarDragOverlay 
          activeBooking={activeBooking} 
          dragOverSlot={dragOverSlot}
        />
      </div>
      </DndContext>
    </TooltipProvider>
  );
}