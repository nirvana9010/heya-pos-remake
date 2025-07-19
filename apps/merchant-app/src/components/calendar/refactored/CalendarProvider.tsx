'use client';

import React, { createContext, useContext, useReducer, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toMerchantTime, toUTC } from '@/lib/date-utils';
import { useAuth } from '@/lib/auth/auth-provider';
import { getAuthHeader } from '@/lib/constants/auth-constants';
import { API_ENDPOINTS } from '@/lib/constants/api-constants';
import type { CalendarState, CalendarAction, CalendarContextType, CalendarView, DateRange, BookingStatus, TimeInterval, BusinessHours } from './types';

const CalendarContext = createContext<CalendarContextType | null>(null);

// Local storage keys
const STORAGE_KEYS = {
  statusFilters: 'calendar_statusFilters',
  staffFilter: 'calendar_staffFilter',
  timeInterval: 'calendar_timeInterval',
  showOnlyRosteredStaff: 'calendar_showOnlyRosteredStaff',
} as const;

// Load saved preferences from localStorage
function loadSavedPreferences(): Partial<CalendarState> {
  if (typeof window === 'undefined') return {};
  
  try {
    const savedStatusFilters = localStorage.getItem(STORAGE_KEYS.statusFilters);
    const savedStaffFilter = localStorage.getItem(STORAGE_KEYS.staffFilter);
    const savedTimeInterval = localStorage.getItem(STORAGE_KEYS.timeInterval);
    const savedShowOnlyRosteredStaff = localStorage.getItem(STORAGE_KEYS.showOnlyRosteredStaff);
    
    // Load merchant settings to get showUnassignedColumn preference and calendar hours
    let showUnassignedColumn = undefined;
    let calendarStartHour = undefined;
    let calendarEndHour = undefined;
    
    const merchantData = localStorage.getItem('merchant');
    if (merchantData) {
      try {
        const merchant = JSON.parse(merchantData);
        if (merchant.settings) {
          if (merchant.settings.showUnassignedColumn !== undefined) {
            showUnassignedColumn = merchant.settings.showUnassignedColumn;
          }
          if (merchant.settings.calendarStartHour !== undefined) {
            calendarStartHour = merchant.settings.calendarStartHour;
          }
          if (merchant.settings.calendarEndHour !== undefined) {
            calendarEndHour = merchant.settings.calendarEndHour;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return {
      selectedStatusFilters: savedStatusFilters 
        ? JSON.parse(savedStatusFilters) 
        : ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      selectedStaffIds: savedStaffFilter ? [...new Set(JSON.parse(savedStaffFilter))] : [],
      timeInterval: savedTimeInterval ? parseInt(savedTimeInterval) as TimeInterval : 15,
      showOnlyRosteredStaff: savedShowOnlyRosteredStaff !== null ? savedShowOnlyRosteredStaff === 'true' : true,
      ...(showUnassignedColumn !== undefined && { showUnassignedColumn }),
      ...(calendarStartHour !== undefined && { calendarStartHour }),
      ...(calendarEndHour !== undefined && { calendarEndHour }),
    };
  } catch (error) {
    return {};
  }
}

// Initial state with proper defaults
const getInitialState = (merchantSettings?: any): CalendarState => {
  const savedPrefs = loadSavedPreferences();
  
  
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
    start: "09:00",
    end: "18:00", 
    days: [1, 2, 3, 4, 5] // Monday to Friday
  },
  
  // UI State
  selectedBookingId: null,
  selectedStaffIds: savedPrefs.selectedStaffIds || [],
  selectedServiceIds: [],
  selectedStatusFilters: savedPrefs.selectedStatusFilters || ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
  searchQuery: '',
  
  // Feature flags
  showUnassignedColumn: savedPrefs.showUnassignedColumn ?? false, // Default to false to prevent flash
  showBlockedTime: true,
  showBreaks: true,
  showOnlyRosteredStaff: savedPrefs.showOnlyRosteredStaff ?? true, // Default to showing only rostered staff
  
  // Calendar display settings - use saved preferences or defaults
  calendarStartHour: savedPrefs.calendarStartHour ?? 6,
  calendarEndHour: savedPrefs.calendarEndHour ?? 23,
  
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
    case 'SET_BOOKINGS':
      return {
        ...state,
        bookings: action.payload,
        isLoading: false,
        error: null,
      };
    
    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map(b => 
          b.id === action.payload.id ? { ...b, ...action.payload.updates } : b
        ),
      };
    
    case 'ADD_BOOKING':
      return {
        ...state,
        bookings: [...state.bookings, action.payload],
      };
    
    case 'REMOVE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.filter(b => b.id !== action.payload),
      };
    
    case 'REPLACE_BOOKING':
      // Atomically replace one booking with another (used for optimistic updates)
      return {
        ...state,
        bookings: state.bookings.map(b => 
          b.id === action.payload.oldId ? action.payload.newBooking : b
        ),
      };
    
    case 'SET_STAFF':
      return {
        ...state,
        staff: action.payload,
        // Clean up selectedStaffIds to only include valid staff IDs
        selectedStaffIds: state.selectedStaffIds.length === 0 
          ? action.payload.filter(s => s.isActive !== false).map(s => s.id)
          : state.selectedStaffIds.filter(id => 
              action.payload.some(s => s.id === id && s.isActive !== false)
            ),
      };
    
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
      return {
        ...state,
        showOnlyRosteredStaff: !state.showOnlyRosteredStaff,
      };
    
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
  const [merchantSettings, setMerchantSettings] = React.useState<any>(null);
  
  // Load merchant settings on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const headers = getAuthHeader();
        if (!headers.Authorization) {
          return;
        }
        
        const response = await fetch(API_ENDPOINTS.MERCHANT_SETTINGS, {
          headers
        });
        
        if (response.ok) {
          const settings = await response.json();
          setMerchantSettings(settings);
        } else {
        }
      } catch (error) {
      }
    };
    
    loadSettings();
  }, []);
  
  // Use merchant settings if loaded, otherwise fallback to auth context
  const effectiveSettings = merchantSettings || merchant?.settings;
  
  
  const [state, dispatch] = useReducer(calendarReducer, getInitialState(effectiveSettings));
  
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
        state.selectedServiceIds.includes(booking.serviceId)
      );
    }
    
    // Status filter
    if (state.selectedStatusFilters.length > 0) {
      const beforeStatusFilter = filtered.length;
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
  const actions = useMemo(() => ({
    // View actions
    setView: (view: CalendarView) => dispatch({ type: 'SET_VIEW', payload: view }),
    setDate: (date: Date) => dispatch({ type: 'SET_DATE', payload: date }),
    setTimeInterval: (interval: TimeInterval) => dispatch({ type: 'SET_TIME_INTERVAL', payload: interval }),
    navigate: (direction: 'prev' | 'next') => dispatch({ type: 'NAVIGATE', payload: direction }),
    
    // Data actions
    setBookings: (bookings: any[]) => dispatch({ type: 'SET_BOOKINGS', payload: bookings }),
    updateBooking: (id: string, updates: any) => dispatch({ type: 'UPDATE_BOOKING', payload: { id, updates } }),
    addBooking: (booking: any) => dispatch({ type: 'ADD_BOOKING', payload: booking }),
    removeBooking: (id: string) => dispatch({ type: 'REMOVE_BOOKING', payload: id }),
    replaceBooking: (oldId: string, newBooking: any) => dispatch({ type: 'REPLACE_BOOKING', payload: { oldId, newBooking } }),
    setStaff: (staff: any[]) => dispatch({ type: 'SET_STAFF', payload: staff }),
    setServices: (services: any[]) => dispatch({ type: 'SET_SERVICES', payload: services }),
    setCustomers: (customers: any[]) => dispatch({ type: 'SET_CUSTOMERS', payload: customers }),
    
    // Filter actions
    setStaffFilter: (staffIds: string[]) => dispatch({ type: 'SET_STAFF_FILTER', payload: staffIds }),
    setServiceFilter: (serviceIds: string[]) => dispatch({ type: 'SET_SERVICE_FILTER', payload: serviceIds }),
    setStatusFilter: (statuses: string[]) => dispatch({ type: 'SET_STATUS_FILTER', payload: statuses as BookingStatus[] }),
    setSearch: (query: string) => dispatch({ type: 'SET_SEARCH', payload: query }),
    
    // UI actions
    toggleUnassignedColumn: () => dispatch({ type: 'TOGGLE_UNASSIGNED' }),
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
  }), [dispatch]);
  
  // Initialize date range on mount and listen for storage changes
  useEffect(() => {
    const range = calculateDateRange(state.currentDate, state.currentView);
    dispatch({ type: 'SET_DATE', payload: state.currentDate });
    
    // Listen for storage changes to update calendar settings
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'merchant' && e.newValue) {
        try {
          const merchantData = JSON.parse(e.newValue);
          if (merchantData.settings) {
            const newSettings = {
              ...(merchantData.settings.showUnassignedColumn !== undefined && 
                { showUnassignedColumn: merchantData.settings.showUnassignedColumn }),
              ...(merchantData.settings.calendarStartHour !== undefined && 
                { calendarStartHour: merchantData.settings.calendarStartHour }),
              ...(merchantData.settings.calendarEndHour !== undefined && 
                { calendarEndHour: merchantData.settings.calendarEndHour }),
            };
            
            if (Object.keys(newSettings).length > 0) {
              dispatch({ type: 'SET_UI_FLAGS', payload: newSettings });
            }
          }
        } catch (error) {
        }
      }
    };
    
    // Listen for custom event for same-tab updates
    const handleMerchantSettingsUpdate = (e: CustomEvent) => {
      if (e.detail && e.detail.settings) {
        const newSettings = {
          ...(e.detail.settings.showUnassignedColumn !== undefined && 
            { showUnassignedColumn: e.detail.settings.showUnassignedColumn }),
          ...(e.detail.settings.calendarStartHour !== undefined && 
            { calendarStartHour: e.detail.settings.calendarStartHour }),
          ...(e.detail.settings.calendarEndHour !== undefined && 
            { calendarEndHour: e.detail.settings.calendarEndHour }),
        };
        
        if (Object.keys(newSettings).length > 0) {
          dispatch({ type: 'SET_UI_FLAGS', payload: newSettings });
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('merchantSettingsUpdated', handleMerchantSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('merchantSettingsUpdated', handleMerchantSettingsUpdate as EventListener);
    };
  }, []);
  
  // Update UI settings when merchant settings change
  useEffect(() => {
    const hasChanges = 
      (effectiveSettings?.showUnassignedColumn !== undefined && 
       effectiveSettings.showUnassignedColumn !== state.showUnassignedColumn) ||
      (effectiveSettings?.calendarStartHour !== undefined && 
       effectiveSettings.calendarStartHour !== state.calendarStartHour) ||
      (effectiveSettings?.calendarEndHour !== undefined && 
       effectiveSettings.calendarEndHour !== state.calendarEndHour);
       
    if (hasChanges) {
      dispatch({ 
        type: 'SET_UI_FLAGS', 
        payload: {
          ...(effectiveSettings?.showUnassignedColumn !== undefined && 
            { showUnassignedColumn: effectiveSettings.showUnassignedColumn }),
          ...(effectiveSettings?.calendarStartHour !== undefined && 
            { calendarStartHour: effectiveSettings.calendarStartHour }),
          ...(effectiveSettings?.calendarEndHour !== undefined && 
            { calendarEndHour: effectiveSettings.calendarEndHour }),
        } 
      });
    }
  }, [effectiveSettings?.showUnassignedColumn, effectiveSettings?.calendarStartHour, effectiveSettings?.calendarEndHour]);
  
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
      localStorage.setItem(STORAGE_KEYS.timeInterval, state.timeInterval.toString());
      localStorage.setItem(STORAGE_KEYS.showOnlyRosteredStaff, state.showOnlyRosteredStaff.toString());
      
      // If we cleaned up any invalid IDs, update the state
      if (validStaffIds.length !== state.selectedStaffIds.length) {
        dispatch({ type: 'SET_STAFF_FILTER', payload: validStaffIds });
      }
    } catch (error) {
    }
  }, [state.selectedStatusFilters, state.selectedStaffIds, state.timeInterval, state.showOnlyRosteredStaff, state.staff]);
  
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