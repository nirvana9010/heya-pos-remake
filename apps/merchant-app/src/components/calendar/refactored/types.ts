import type { BookingSourceCategory } from '@/lib/booking-source';
import type { BookingServiceSummary } from '@/lib/clients/bookings-client';

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month';

// Time interval types
export type TimeInterval = 15 | 30 | 60;

// Date range for filtering
export interface DateRange {
  start: Date;
  end: Date;
}

// Booking status types
export type BookingStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'deleted'
  | 'optimistic';

export const ALL_CALENDAR_STATUSES: BookingStatus[] = [
  'pending',
  'scheduled',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
  'deleted',
  'optimistic',
];

// Core data models
export interface Booking {
  id: string;
  bookingNumber?: string;
  date: string;
  time: string;
  duration: number;
  status: BookingStatus;

  // Locally created booking state (prevents race conditions)
  isLocalOnly?: boolean;
  localOnlyExpiresAt?: number;
  
  // Relations
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerSource?: string; // e.g., 'WALK_IN'
  source?: string | null; // Raw booking source from API
  sourceCategory: BookingSourceCategory;
  sourceLabel: string;
  
  serviceId: string | null;
  serviceName: string;
  servicePrice: number;
  services?: BookingServiceSummary[];
  
  staffId: string | null;  // null for unassigned
  staffName: string;
  providerId?: string;  // Legacy field
  
  // Additional fields
  notes?: string;
  internalNotes?: string;
  color?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isPaid?: boolean;
  paidAmount?: number;
  totalAmount?: number;
  customerRequestedStaff?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  accessLevel?: string;
  calendarColor?: string;
  status?: string;
  color: string;  // Required for calendar display
  avatar?: string;
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  workingHours?: WorkingHours;
  schedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  scheduleOverrides?: Array<{
    date: string;
    startTime: string | null;
    endTime: string | null;
    reason?: string | null;
  }>;
  generatedPin?: string | null;
  pin?: string | null;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  duration: number;
  price: number;
  description?: string;
  color?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  tags?: string[];
  lastVisit?: string;
  totalVisits?: number;
  totalSpent?: number;
}

export interface WorkingHours {
  [day: string]: {
    isWorking: boolean;
    start?: string;
    end?: string;
    breaks?: Array<{ start: string; end: string }>;
  };
}

// Calendar state
export interface CalendarState {
  // View management
  currentView: CalendarView;
  currentDate: Date;
  dateRange: DateRange;
  timeInterval: TimeInterval;
  
  // Data
  bookings: Booking[];
  staff: Staff[];
  services: Service[];
  customers: Customer[];
  businessHours: BusinessHours;
  
  // UI State
  selectedBookingId: string | null;
  selectedStaffIds: string[];
  selectedServiceIds: string[];
  selectedStatusFilters: BookingStatus[];
  searchQuery: string;
  badgeDisplayMode: 'full' | 'icon';
  
  // Feature flags
  showUnassignedColumn: boolean;
  showBlockedTime: boolean;
  showBreaks: boolean;
  showOnlyRosteredStaff: boolean;
  
  // Calendar display settings
  calendarStartHour: number;
  calendarEndHour: number;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Drag state
  isDragging: boolean;
  draggedBookingId: string | null;
  
  // Sidebar states
  isBookingSlideOutOpen: boolean;
  isDetailsSlideOutOpen: boolean;
  detailsBookingId: string | null;
}

// Calendar actions
export type CalendarAction =
  // View actions
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_DATE'; payload: Date }
  | { type: 'SET_TIME_INTERVAL'; payload: TimeInterval }
  | { type: 'NAVIGATE'; payload: 'prev' | 'next' }
  
  // Data actions
  | { type: 'SET_BOOKINGS'; payload: Booking[] }
  | { type: 'UPDATE_BOOKING'; payload: { id: string; updates: Partial<Booking> } }
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'REMOVE_BOOKING'; payload: string }
  | { type: 'REPLACE_BOOKING'; payload: { oldId: string; newBooking: Booking } }
  | { type: 'SET_STAFF'; payload: Staff[] }
  | { type: 'SET_SERVICES'; payload: Service[] }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  
  // Filter actions
  | { type: 'SET_STAFF_FILTER'; payload: string[] }
  | { type: 'SET_SERVICE_FILTER'; payload: string[] }
  | { type: 'SET_STATUS_FILTER'; payload: BookingStatus[] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_BADGE_DISPLAY_MODE'; payload: 'full' | 'icon' }
  
  // UI actions
  | { type: 'SET_UI_FLAGS'; payload: Partial<Pick<CalendarState, 'showUnassignedColumn' | 'showBlockedTime' | 'showBreaks' | 'showOnlyRosteredStaff'>> }
  | { type: 'TOGGLE_UNASSIGNED' }
  | { type: 'TOGGLE_BLOCKED' }
  | { type: 'TOGGLE_BREAKS' }
  | { type: 'TOGGLE_ROSTERED_ONLY' }
  
  // Drag actions
  | { type: 'START_DRAG'; payload: string }
  | { type: 'END_DRAG' }
  
  // Sidebar actions
  | { type: 'OPEN_BOOKING_SLIDEOUT' }
  | { type: 'CLOSE_BOOKING_SLIDEOUT' }
  | { type: 'OPEN_DETAILS_SLIDEOUT'; payload: string }
  | { type: 'CLOSE_DETAILS_SLIDEOUT' }
  
  // Loading actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  
  // Settings actions
  | { type: 'UPDATE_CALENDAR_HOURS'; payload: { startHour: number; endHour: number } }
  
  // Reset
  | { type: 'RESET' };

// Context actions interface
export interface CalendarActions {
  // View actions
  setView: (view: CalendarView) => void;
  setDate: (date: Date) => void;
  setTimeInterval: (interval: TimeInterval) => void;
  navigate: (direction: 'prev' | 'next') => void;
  
  // Data actions
  setBookings: (bookings: Booking[]) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  addBooking: (booking: Booking) => void;
  removeBooking: (id: string) => void;
  deleteBooking: (id: string) => void;
  replaceBooking: (oldId: string, newBooking: Booking) => void;
  setStaff: (staff: Staff[]) => void;
  setServices: (services: Service[]) => void;
  setCustomers: (customers: Customer[]) => void;
  
  // Filter actions
  setStaffFilter: (staffIds: string[]) => void;
  setServiceFilter: (serviceIds: string[]) => void;
  setStatusFilter: (statuses: BookingStatus[]) => void;
  setSearch: (query: string) => void;
  setBadgeDisplayMode: (mode: 'full' | 'icon') => void;
  
  // UI actions
  toggleUnassignedColumn: () => void;
  toggleBlockedTime: () => void;
  toggleBreaks: () => void;
  toggleRosteredOnly: () => void;
  
  // Drag actions
  startDrag: (bookingId: string) => void;
  endDrag: () => void;
  
  // Sidebar actions
  openBookingSlideOut: () => void;
  closeBookingSlideOut: () => void;
  openDetailsSlideOut: (bookingId: string) => void;
  closeDetailsSlideOut: () => void;
  
  // Loading actions
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;

  // Direct dispatch access
  dispatch: (action: CalendarAction) => void;
}

// Calendar context type
export interface CalendarContextType {
  state: CalendarState;
  actions: CalendarActions;
  filteredBookings: Booking[];
}

// Business hours configuration
export interface BusinessHours {
  start: string; // "09:00"
  end: string;   // "18:00"
  days: number[]; // [1,2,3,4,5] for Mon-Fri
}

// Time slot for calendar grid
export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  isHalfHour: boolean;
  displayTime: string;
  isBusinessHours?: boolean;
}

// Calendar cell props
export interface CalendarCell {
  date: Date;
  time: string;
  staffId: string | null;
  bookings: Booking[];
  isToday: boolean;
  isPast: boolean;
  isBlocked: boolean;
  isBreak: boolean;
}

// Drag and drop types
export interface DragItem {
  bookingId: string;
  sourceStaffId: string | null;
  sourceTime: string;
  sourceDate: string;
}

export interface DropTarget {
  staffId: string | null;
  time: string;
  date: string;
}
