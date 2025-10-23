'use client';

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toMerchantTime, toUTC } from '@/lib/date-utils';
import { useAuth } from '@/lib/auth/auth-provider';
import { getAuthHeader } from '@/lib/constants/auth-constants';
import { API_ENDPOINTS } from '@/lib/constants/api-constants';
import { coerceBookingStatus } from '@/lib/clients/bookings-client';
import type {
  CalendarState,
  CalendarAction,
  CalendarContextType,
  CalendarView,
  DateRange,
  BookingStatus,
  TimeInterval,
  BusinessHours,
  Booking,
  Staff,
  Service,
  Customer,
} from './types';
import { ALL_CALENDAR_STATUSES, DEFAULT_CALENDAR_STATUS_FILTERS } from './types';

const CalendarContext = createContext<CalendarContextType | null>(null);

// Track recently deleted bookings to prevent them from reappearing during refresh
// This solves the race condition where backend hasn't processed the delete yet
const recentlyDeletedBookings = new Map<string, number>(); // bookingId -> timestamp
const DELETION_BUFFER_TIME = 30000; // 30 seconds

// Track recent status updates to prevent them from reverting during refresh
// This solves the race condition where backend hasn't processed the status update yet
const recentStatusUpdates = new Map<string, { status: BookingStatus; timestamp: number }>(); // bookingId -> {status, timestamp}
const STATUS_UPDATE_BUFFER_TIME = 60000; // 60 seconds - increased to handle backend processing delays
const PREFERRED_STAFF_BUFFER_TIME = 120000; // Preserve preferred flag overrides for 2 minutes

const LOCAL_BOOKING_RETENTION_TIME = 60000; // 60 seconds retention for locally created bookings

const recentPreferredStaffSelections = new Map<string, { value: boolean; timestamp: number }>();

// Local storage keys
const STORAGE_KEYS = {
  statusFilters: 'calendar_statusFilters',
  staffFilter: 'calendar_staffFilter',
  staffOrder: 'calendar_staffOrder',
  timeInterval: 'calendar_timeInterval',
  badgeDisplayMode: 'calendar_badgeDisplayMode',
} as const;

// Load saved preferences from localStorage
function parseStoredStatuses(raw: string | null): BookingStatus[] {
  if (!raw) {
    return DEFAULT_CALENDAR_STATUS_FILTERS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_CALENDAR_STATUS_FILTERS;
    }

    const normalized = parsed
      .map(value => (typeof value === 'string' ? coerceBookingStatus(value) : null))
      .filter((value): value is BookingStatus => value !== null);

    return normalized.length > 0 ? normalized : DEFAULT_CALENDAR_STATUS_FILTERS;
  } catch {
    return DEFAULT_CALENDAR_STATUS_FILTERS;
  }
}

function parseStoredIdList(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .filter((value, index, self) => self.indexOf(value) === index);
  } catch {
    return [];
  }
}

function loadSavedPreferences(): Partial<CalendarState> {
  if (typeof window === 'undefined') return {};
  
  try {
    const savedStatusFilters = localStorage.getItem(STORAGE_KEYS.statusFilters);
    const savedStaffFilter = localStorage.getItem(STORAGE_KEYS.staffFilter);
    const savedStaffOrder = localStorage.getItem(STORAGE_KEYS.staffOrder);
    const savedTimeInterval = localStorage.getItem(STORAGE_KEYS.timeInterval);
    
    return {
      selectedStatusFilters: parseStoredStatuses(savedStatusFilters),
      selectedStaffIds: parseStoredIdList(savedStaffFilter),
      staffDisplayOrder: parseStoredIdList(savedStaffOrder),
      timeInterval: savedTimeInterval ? parseInt(savedTimeInterval) as TimeInterval : 15,
      badgeDisplayMode: (localStorage.getItem(STORAGE_KEYS.badgeDisplayMode) as 'full' | 'icon') || 'full',
    };
  } catch (error) {
    return {};
  }
}

// Initial state with proper defaults
const getInitialState = (merchantSettings?: any): CalendarState => {
  const savedPrefs = loadSavedPreferences();
  
  // Always get the freshest merchant settings from localStorage
  let freshMerchantSettings = merchantSettings;
  if (typeof window !== 'undefined') {
    const storedMerchant = localStorage.getItem('merchant');
    if (storedMerchant) {
      try {
        const merchant = JSON.parse(storedMerchant);
        if (merchant.settings) {
          freshMerchantSettings = merchant.settings;
        }
      } catch (e) {
        // Use passed settings if parse fails
      }
    }
  }
  
  const merchantBadgeMode = freshMerchantSettings?.calendarBadgeDisplayMode;
  const initialBadgeDisplayMode: 'full' | 'icon' =
    merchantBadgeMode === 'icon' || merchantBadgeMode === 'full'
      ? merchantBadgeMode
      : (savedPrefs.badgeDisplayMode === 'icon' || savedPrefs.badgeDisplayMode === 'full'
          ? savedPrefs.badgeDisplayMode
          : 'full');
  const initialStaffOrder = Array.isArray(freshMerchantSettings?.calendarStaffOrder)
    ? freshMerchantSettings.calendarStaffOrder.filter((value: unknown) => typeof value === 'string')
    : savedPrefs.staffDisplayOrder || [];
  const allowUnassigned =
    freshMerchantSettings?.allowUnassignedBookings ?? false;
  const showUnassignedDefault =
    freshMerchantSettings?.showUnassignedColumn === undefined
      ? allowUnassigned
      : !!freshMerchantSettings.showUnassignedColumn;

  // Initial state based on merchant settings
  
  return {
    // View management
    currentView: 'day',
    currentDate: new Date(),
    dateRange: { start: new Date(), end: new Date() },
    timeInterval: savedPrefs.timeInterval || 15,

    // Data
    bookings: [],
    staff: [],
    services: [],
    customers: [],
    businessHours: {
      start: '09:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5], // Monday to Friday
    },

    // UI State
    selectedBookingId: null,
    selectedStaffIds: savedPrefs.selectedStaffIds || [],
    selectedServiceIds: [],
    selectedStatusFilters: savedPrefs.selectedStatusFilters || DEFAULT_CALENDAR_STATUS_FILTERS,
    searchQuery: '',
    badgeDisplayMode: initialBadgeDisplayMode,
    staffDisplayOrder: initialStaffOrder,

    // Feature flags - Use fresh merchant settings directly
    showUnassignedColumn: showUnassignedDefault,
    showBlockedTime: true,
    showBreaks: true,
    showOnlyRosteredStaff: freshMerchantSettings?.showOnlyRosteredStaffDefault ?? true,

    // Calendar display settings - use fresh merchant settings
    calendarStartHour: freshMerchantSettings?.calendarStartHour ?? 6,
    calendarEndHour: freshMerchantSettings?.calendarEndHour ?? 23,

    // Loading states
    isLoading: false,
    isRefreshing: false,
    error: null,

    // Drag state
    isDragging: false,
    draggedBookingId: null,

    // Sidebar states
    isBookingSlideOutOpen: false,
    isDetailsSlideOutOpen: false,
    detailsBookingId: null,
  };
};

// Calendar reducer for complex state management
function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    // View actions
    case 'SET_VIEW':
      return {
        ...state,
        currentView: action.payload,
        dateRange: calculateDateRange(state.currentDate, action.payload),
      };
    
    case 'SET_DATE':
      return {
        ...state,
        currentDate: action.payload,
        dateRange: calculateDateRange(action.payload, state.currentView),
      };
    
    case 'SET_TIME_INTERVAL':
      return {
        ...state,
        timeInterval: action.payload,
      };
    
    case 'NAVIGATE':
      const newDate = navigateDate(state.currentDate, state.currentView, action.payload);
      return {
        ...state,
        currentDate: newDate,
        dateRange: calculateDateRange(newDate, state.currentView),
      };
    
    // Data actions
    case 'SET_BOOKINGS': {
      // Clean up old entries from recently deleted map
      const now = Date.now();
      for (const [bookingId, timestamp] of recentlyDeletedBookings.entries()) {
        if (now - timestamp > DELETION_BUFFER_TIME) {
          recentlyDeletedBookings.delete(bookingId);
        }
      }

      // Clean up old entries from status updates map
      for (const [bookingId, update] of recentStatusUpdates.entries()) {
        if (now - update.timestamp > STATUS_UPDATE_BUFFER_TIME) {
          recentStatusUpdates.delete(bookingId);
        }
      }

      for (const [bookingId, selection] of recentPreferredStaffSelections.entries()) {
        if (now - selection.timestamp > PREFERRED_STAFF_BUFFER_TIME) {
          recentPreferredStaffSelections.delete(bookingId);
        }
      }

      // Reset local-only flags for server-confirmed bookings
      const normalizedIncoming = action.payload.map(booking =>
        booking.isLocalOnly || booking.localOnlyExpiresAt
          ? { ...booking, isLocalOnly: false, localOnlyExpiresAt: undefined }
          : booking
      );

      const incomingIds = new Set(normalizedIncoming.map(booking => booking.id));

      // Preserve locally-created bookings for a short window if the API hasn't returned them yet
      const preservedLocalBookings = state.bookings.filter(existing => {
        if (!existing.isLocalOnly || incomingIds.has(existing.id)) {
          return false;
        }

        const expiry = typeof existing.localOnlyExpiresAt === 'number'
          ? existing.localOnlyExpiresAt
          : new Date(existing.createdAt).getTime() + LOCAL_BOOKING_RETENTION_TIME;

        return now < expiry;
      });

      const mergedBookings = [...normalizedIncoming, ...preservedLocalBookings];

      // Filter out recently deleted bookings and apply recent status updates
      const filteredBookings = mergedBookings
        .filter(booking => !recentlyDeletedBookings.has(booking.id))
        .map(booking => {
          const recentUpdate = recentStatusUpdates.get(booking.id);
          const preferredOverride = recentPreferredStaffSelections.get(booking.id);

          if (!recentUpdate && !preferredOverride) {
            return booking;
          }

          return {
            ...booking,
            ...(recentUpdate ? { status: recentUpdate.status } : null),
            ...(preferredOverride ? { customerRequestedStaff: preferredOverride.value } : null),
          };
        });

      return {
        ...state,
        bookings: filteredBookings,
        isLoading: false,
        error: null,
      };
    }
    
    case 'UPDATE_BOOKING':
      // If we're updating a booking, it's clearly not deleted
      // Remove it from the recently deleted map if it's there
      recentlyDeletedBookings.delete(action.payload.id);
      
      // Track status updates to prevent them from reverting
      if (action.payload.updates.status) {
        const normalizedStatus = coerceBookingStatus(action.payload.updates.status);
        recentStatusUpdates.set(action.payload.id, {
          status: normalizedStatus,
          timestamp: Date.now(),
        });
      }

      if (Object.prototype.hasOwnProperty.call(action.payload.updates, 'customerRequestedStaff')) {
        recentPreferredStaffSelections.set(action.payload.id, {
          value: Boolean(action.payload.updates.customerRequestedStaff),
          timestamp: Date.now()
        });
      }
      
      return {
        ...state,
        bookings: state.bookings.map(b => 
          b.id === action.payload.id ? { ...b, ...action.payload.updates } : b
        ),
      };
    
    case 'ADD_BOOKING':
      // If we're adding a booking, ensure it's not in the recently deleted map
      recentlyDeletedBookings.delete(action.payload.id);

      if (Object.prototype.hasOwnProperty.call(action.payload, 'customerRequestedStaff')) {
        recentPreferredStaffSelections.set(action.payload.id, {
          value: Boolean(action.payload.customerRequestedStaff),
          timestamp: Date.now()
        });
      }

      return {
        ...state,
        bookings: [...state.bookings, action.payload],
      };

    case 'REMOVE_BOOKING':
      // Track this booking as recently deleted to prevent it from reappearing
      recentlyDeletedBookings.set(action.payload, Date.now());
      recentPreferredStaffSelections.delete(action.payload);
      
      return {
        ...state,
        bookings: state.bookings.filter(b => b.id !== action.payload),
      };
    
    
    case 'SET_STAFF': {
      const incomingStaff = action.payload;
      const existingOrder = state.staffDisplayOrder.length > 0
        ? state.staffDisplayOrder
        : incomingStaff.map(staff => staff.id);

      const normalizedOrder = existingOrder.filter(id => incomingStaff.some(staff => staff.id === id));
      const missingIds = incomingStaff
        .map(staff => staff.id)
        .filter(id => !normalizedOrder.includes(id));
      const appliedOrder = [...normalizedOrder, ...missingIds];

      const orderedStaff = appliedOrder
        .map(id => incomingStaff.find(staff => staff.id === id))
        .filter((staff): staff is Staff => Boolean(staff));

      return {
        ...state,
        staff: orderedStaff,
        staffDisplayOrder: appliedOrder,
        // Clean up selectedStaffIds to only include valid staff IDs
        selectedStaffIds: state.selectedStaffIds.length === 0 
          ? orderedStaff.filter(s => s.isActive !== false).map(s => s.id)
          : state.selectedStaffIds.filter(id => 
              orderedStaff.some(s => s.id === id && s.isActive !== false)
            ),
      };
    }
    
    case 'SET_SERVICES':
      return {
        ...state,
        services: action.payload,
      };
    
    case 'SET_CUSTOMERS':
      return {
        ...state,
        customers: action.payload,
      };
    
    // Filter actions
    case 'SET_STAFF_FILTER':
      return {
        ...state,
        selectedStaffIds: action.payload,
      };
    
    case 'SET_STAFF_ORDER': {
      const currentStaffIds = state.staff.map(staff => staff.id);
      const requestedOrder = action.payload.filter((id, index, self) => 
        typeof id === 'string' && id.trim().length > 0 && self.indexOf(id) === index
      );
      const hasLoadedStaff = currentStaffIds.length > 0;
      const sanitizedOrder = hasLoadedStaff
        ? requestedOrder.filter(id => currentStaffIds.includes(id))
        : requestedOrder;
      const missingIds = hasLoadedStaff
        ? currentStaffIds.filter(id => !sanitizedOrder.includes(id))
        : [];
      const finalOrder = [...sanitizedOrder, ...missingIds];

      const reorderedStaff = hasLoadedStaff
        ? finalOrder
            .map(id => state.staff.find(staff => staff.id === id))
            .filter((staff): staff is Staff => Boolean(staff))
        : state.staff;

      return {
        ...state,
        staff: reorderedStaff,
        staffDisplayOrder: hasLoadedStaff ? finalOrder : sanitizedOrder,
      };
    }
    
    case 'SET_SERVICE_FILTER':
      return {
        ...state,
        selectedServiceIds: action.payload,
      };
    
    case 'SET_STATUS_FILTER':
      return {
        ...state,
        selectedStatusFilters: action.payload,
      };

    case 'SET_BADGE_DISPLAY_MODE':
      return {
        ...state,
        badgeDisplayMode: action.payload,
      };
    
    case 'SET_SEARCH':
      return {
        ...state,
        searchQuery: action.payload,
      };
    
    // UI actions
    case 'SET_UI_FLAGS':
      return {
        ...state,
        ...action.payload,
      };
      
    case 'TOGGLE_UNASSIGNED':
      return {
        ...state,
        showUnassignedColumn: !state.showUnassignedColumn,
      };
      
    case 'TOGGLE_BLOCKED':
      return {
        ...state,
        showBlockedTime: !state.showBlockedTime,
      };
    
    case 'TOGGLE_BREAKS':
      return {
        ...state,
        showBreaks: !state.showBreaks,
      };
    
    case 'TOGGLE_ROSTERED_ONLY':
      // No longer allow toggling - controlled by merchant settings only
      return state;
    
    // Drag actions
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        draggedBookingId: action.payload,
      };
    
    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        draggedBookingId: null,
      };
    
    // Sidebar actions
    case 'OPEN_BOOKING_SLIDEOUT':
      return {
        ...state,
        isBookingSlideOutOpen: true,
      };
    
    case 'CLOSE_BOOKING_SLIDEOUT':
      return {
        ...state,
        isBookingSlideOutOpen: false,
      };
    
    case 'OPEN_DETAILS_SLIDEOUT':
      return {
        ...state,
        isDetailsSlideOutOpen: true,
        detailsBookingId: action.payload,
      };
    
    case 'CLOSE_DETAILS_SLIDEOUT':
      return {
        ...state,
        isDetailsSlideOutOpen: false,
        detailsBookingId: null,
      };
    
    // Loading states
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_REFRESHING':
      return {
        ...state,
        isRefreshing: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isRefreshing: false,
      };
    
    case 'UPDATE_CALENDAR_HOURS':
      return {
        ...state,
        calendarStartHour: action.payload.startHour,
        calendarEndHour: action.payload.endHour,
      };
    
    case 'RESET':
      return getInitialState();
    
    default:
      return state;
  }
}

// Helper functions
function calculateDateRange(date: Date, view: CalendarView): DateRange {
  const merchantDate = toMerchantTime(date);
  
  switch (view) {
    case 'day':
      return {
        start: startOfDay(merchantDate),
        end: endOfDay(merchantDate),
      };
    case 'week':
      return {
        start: startOfWeek(merchantDate),
        end: endOfWeek(merchantDate),
      };
    case 'month':
      return {
        start: startOfMonth(merchantDate),
        end: endOfMonth(merchantDate),
      };
    default:
      return {
        start: merchantDate,
        end: merchantDate,
      };
  }
}

function navigateDate(current: Date, view: CalendarView, direction: 'prev' | 'next'): Date {
  const merchantDate = toMerchantTime(current);
  const multiplier = direction === 'next' ? 1 : -1;
  
  switch (view) {
    case 'day':
      return new Date(merchantDate.setDate(merchantDate.getDate() + multiplier));
    case 'week':
      return new Date(merchantDate.setDate(merchantDate.getDate() + (7 * multiplier)));
    case 'month':
      return new Date(merchantDate.setMonth(merchantDate.getMonth() + multiplier));
    default:
      return merchantDate;
  }
}

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const { merchant } = useAuth();
  
  // Use merchant settings from auth context/localStorage only
  const merchantSettings = merchant?.settings;
  const allowUnassignedBookings = merchantSettings?.allowUnassignedBookings ?? false;
  
  const [state, dispatch] = useReducer(calendarReducer, getInitialState(merchantSettings));
  
  // Memoized filtered bookings
  const filteredBookings = useMemo(() => {
    let filtered = state.bookings;

    // Date range filter
    filtered = filtered.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= state.dateRange.start && bookingDate <= state.dateRange.end;
    });

    // Staff filter
    if (state.selectedStaffIds.length > 0) {
      filtered = filtered.filter(booking => {
        // Always show unassigned bookings if the column is visible
        if (booking.staffId === null) {
          return state.showUnassignedColumn;
        }
        return state.selectedStaffIds.includes(booking.staffId);
      });
    }

    // Service filter
    if (state.selectedServiceIds.length > 0) {
      filtered = filtered.filter(booking =>
        booking.serviceId !== null && state.selectedServiceIds.includes(booking.serviceId)
      );
    }

    // Status filter
    if (state.selectedStatusFilters.length > 0) {
      filtered = filtered.filter(booking =>
        state.selectedStatusFilters.includes(booking.status)
      );
    }

    // Search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customerName?.toLowerCase().includes(query) ||
        booking.serviceName?.toLowerCase().includes(query) ||
        booking.staffName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [
    state.bookings,
    state.dateRange,
    state.selectedStaffIds,
    state.selectedServiceIds,
    state.selectedStatusFilters,
    state.searchQuery,
    state.showUnassignedColumn,
  ]);
  
  // Action creators
  const actions: CalendarActions = useMemo(() => ({
    // View actions
    setView: (view: CalendarView) => dispatch({ type: 'SET_VIEW', payload: view }),
    setDate: (date: Date) => dispatch({ type: 'SET_DATE', payload: date }),
    setTimeInterval: (interval: TimeInterval) => dispatch({ type: 'SET_TIME_INTERVAL', payload: interval }),
    navigate: (direction: 'prev' | 'next') => dispatch({ type: 'NAVIGATE', payload: direction }),
    
    // Data actions
    setBookings: (bookings: Booking[]) => dispatch({ type: 'SET_BOOKINGS', payload: bookings }),
    updateBooking: (id: string, updates: Partial<Booking>) => dispatch({ type: 'UPDATE_BOOKING', payload: { id, updates } }),
    addBooking: (booking: Booking) => dispatch({ type: 'ADD_BOOKING', payload: booking }),
    removeBooking: (id: string) => dispatch({ type: 'REMOVE_BOOKING', payload: id }),
    deleteBooking: (id: string) => dispatch({ type: 'REMOVE_BOOKING', payload: id }),
    replaceBooking: (oldId: string, newBooking: Booking) => dispatch({ type: 'REPLACE_BOOKING', payload: { oldId, newBooking } }),
    setStaff: (staff: Staff[]) => dispatch({ type: 'SET_STAFF', payload: staff }),
    setStaffOrder: (order: string[]) => dispatch({ type: 'SET_STAFF_ORDER', payload: order }),
    setServices: (services: Service[]) => dispatch({ type: 'SET_SERVICES', payload: services }),
    setCustomers: (customers: Customer[]) => dispatch({ type: 'SET_CUSTOMERS', payload: customers }),
    
    // Filter actions
    setStaffFilter: (staffIds: string[]) => dispatch({ type: 'SET_STAFF_FILTER', payload: staffIds }),
    setServiceFilter: (serviceIds: string[]) => dispatch({ type: 'SET_SERVICE_FILTER', payload: serviceIds }),
    setStatusFilter: (statuses: BookingStatus[]) => dispatch({ type: 'SET_STATUS_FILTER', payload: statuses }),
    setSearch: (query: string) => dispatch({ type: 'SET_SEARCH', payload: query }),
    setBadgeDisplayMode: (mode: 'full' | 'icon') => dispatch({ type: 'SET_BADGE_DISPLAY_MODE', payload: mode }),
    
    // UI actions
    toggleUnassignedColumn: () => {
      if (allowUnassignedBookings) {
        return;
      }
      dispatch({ type: 'TOGGLE_UNASSIGNED' });
    },
    toggleBlockedTime: () => dispatch({ type: 'TOGGLE_BLOCKED' }),
    toggleBreaks: () => dispatch({ type: 'TOGGLE_BREAKS' }),
    toggleRosteredOnly: () => dispatch({ type: 'TOGGLE_ROSTERED_ONLY' }),
    
    // Drag actions
    startDrag: (bookingId: string) => dispatch({ type: 'START_DRAG', payload: bookingId }),
    endDrag: () => dispatch({ type: 'END_DRAG' }),
    
    // Sidebar actions
    openBookingSlideOut: () => dispatch({ type: 'OPEN_BOOKING_SLIDEOUT' }),
    closeBookingSlideOut: () => dispatch({ type: 'CLOSE_BOOKING_SLIDEOUT' }),
    openDetailsSlideOut: (bookingId: string) => dispatch({ type: 'OPEN_DETAILS_SLIDEOUT', payload: bookingId }),
    closeDetailsSlideOut: () => dispatch({ type: 'CLOSE_DETAILS_SLIDEOUT' }),
    
    // Loading actions
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setRefreshing: (refreshing: boolean) => dispatch({ type: 'SET_REFRESHING', payload: refreshing }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    
    // Reset
    reset: () => dispatch({ type: 'RESET' }),
    
    // Direct dispatch access for complex actions
    dispatch,
  }), [dispatch, allowUnassignedBookings]);
  
  // Initialize date range on mount and listen for merchant settings updates
  useEffect(() => {
    const range = calculateDateRange(state.currentDate, state.currentView);
    dispatch({ type: 'SET_DATE', payload: state.currentDate });
    
    // Listen for custom event for same-tab updates only
    let updateTimeout: NodeJS.Timeout;
    const handleMerchantSettingsUpdate = (e: CustomEvent) => {
      if (e.detail && e.detail.settings) {
        // Debounce updates to prevent flickering
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          const allowFromEvent = e.detail.settings.allowUnassignedBookings;
          const enforcedShow =
            typeof allowFromEvent === 'boolean'
              ? allowFromEvent
              : e.detail.settings.showUnassignedColumn;

          const newSettings = {
            ...(enforcedShow !== undefined && { showUnassignedColumn: !!enforcedShow }),
            ...(e.detail.settings.calendarStartHour !== undefined && 
              { calendarStartHour: e.detail.settings.calendarStartHour }),
            ...(e.detail.settings.calendarEndHour !== undefined && 
              { calendarEndHour: e.detail.settings.calendarEndHour }),
            ...(e.detail.settings.showOnlyRosteredStaffDefault !== undefined && 
              { showOnlyRosteredStaff: e.detail.settings.showOnlyRosteredStaffDefault }),
            ...(e.detail.settings.calendarBadgeDisplayMode !== undefined && {
              badgeDisplayMode:
                e.detail.settings.calendarBadgeDisplayMode === 'icon' ? 'icon' : 'full'
            }),
          };

          if (Array.isArray(e.detail.settings.calendarStaffOrder)) {
            const incomingOrder = e.detail.settings.calendarStaffOrder.filter((id: unknown) => typeof id === 'string');
            dispatch({ type: 'SET_STAFF_ORDER', payload: incomingOrder });
          }
          
          if (Object.keys(newSettings).length > 0) {
            dispatch({ type: 'SET_UI_FLAGS', payload: newSettings });
          }
        }, 100); // Small delay to debounce rapid updates
      }
    };
    
    window.addEventListener('merchantSettingsUpdated', handleMerchantSettingsUpdate as EventListener);
    
    return () => {
      clearTimeout(updateTimeout);
      window.removeEventListener('merchantSettingsUpdated', handleMerchantSettingsUpdate as EventListener);
    };
  }, []);
  
  // Remove this useEffect entirely - we're setting initial state correctly now
  
  // Save filter preferences to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Clean up selectedStaffIds before saving - only save unique, valid staff IDs
      const validStaffIds = state.selectedStaffIds.filter((id, index, self) =>
        self.indexOf(id) === index && // Remove duplicates
        state.staff.some(s => s.id === id && s.isActive !== false) // Only active staff
      );

      localStorage.setItem(STORAGE_KEYS.statusFilters, JSON.stringify(state.selectedStatusFilters));
      localStorage.setItem(STORAGE_KEYS.staffFilter, JSON.stringify(validStaffIds));
      // NOTE: staffOrder is NOT saved here - it's persisted via merchant settings API only
      // This prevents race conditions where auto-save conflicts with manual API persistence
      localStorage.setItem(STORAGE_KEYS.timeInterval, state.timeInterval.toString());
      localStorage.setItem(STORAGE_KEYS.badgeDisplayMode, state.badgeDisplayMode);

      // If we cleaned up any invalid IDs, update the state
      if (validStaffIds.length !== state.selectedStaffIds.length) {
        dispatch({ type: 'SET_STAFF_FILTER', payload: validStaffIds });
      }
    } catch (error) {
    }
  }, [
    JSON.stringify(state.selectedStatusFilters),
    JSON.stringify(state.selectedStaffIds),
    // NOTE: staffDisplayOrder removed from dependencies - only persisted via merchant settings
    state.timeInterval,
    state.badgeDisplayMode,
    state.staff.length // Only depend on staff length, not the entire array
  ]);
  
  const contextValue: CalendarContextType = {
    state,
    actions,
    filteredBookings,
  };
  
  return (
    <CalendarContext.Provider value={contextValue}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): CalendarContextType {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}
