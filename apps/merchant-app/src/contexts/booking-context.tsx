'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { BookingSlideOut } from '@/components/BookingSlideOut';
import { QuickSaleSlideOut } from '@/components/QuickSaleSlideOut';
import { apiClient } from '@/lib/api-client';
import { StaffClient } from '@/lib/clients/staff-client';
import { useToast } from '@heya-pos/ui';
import { useAuth } from '@/lib/auth/auth-provider';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { mapStaffToCalendar } from '@/components/calendar/refactored/calendar-booking-mapper';

interface BookingContextType {
  openBookingSlideout: () => void;
  closeBookingSlideout: () => void;
  isBookingSlideoutOpen: boolean;
  openQuickSale: () => void;
  closeQuickSale: () => void;
  isQuickSaleOpen: boolean;
  staff: any[];
  services: any[];
  customers: any[];
  loading: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

interface BookingProviderProps {
  children: ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const { user, merchant } = useAuth();
  const [isBookingSlideoutOpen, setIsBookingSlideoutOpen] = useState(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [merchantSettings, setMerchantSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const staffClientRef = useRef<StaffClient | null>(null);
  if (!staffClientRef.current) {
    staffClientRef.current = new StaffClient();
  }
  const staffClient = staffClientRef.current;

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const [staffData, servicesResponse, customersData, bookingsData, settingsData, schedulesData] = await Promise.all([
        apiClient.getStaff().catch(() => []),
        apiClient.getServices({ limit: 500, isActive: true }).catch(() => ({ data: [] })),
        apiClient.getCustomers().catch(() => []),
        apiClient.getBookings().catch(() => []),
        apiClient.getMerchantSettings().catch(() => null),
        staffClient.getAllSchedules().catch(() => []),
      ]);

      const servicesData = servicesResponse.data || [];

      const scheduleMap = new Map<string, any[]>();
      if (Array.isArray(schedulesData)) {
        schedulesData.forEach((staffSchedule: any) => {
          if (staffSchedule.staffId && staffSchedule.schedules) {
            scheduleMap.set(staffSchedule.staffId, staffSchedule.schedules);
          }
        });
      }

      const activeStaff = staffData.filter((member: any) => member.status === 'ACTIVE');

      // Load overrides for a broad window (two weeks back, five weeks forward) to cover roster edits
      const overrideStart = format(addDays(startOfWeek(new Date()), -14), 'yyyy-MM-dd');
      const overrideEnd = format(addDays(endOfWeek(new Date()), 35), 'yyyy-MM-dd');
      const overridesMap = new Map<string, any[]>();

      await Promise.all(
        activeStaff.map(async (member: any) => {
          try {
            const overrides = await staffClient.getScheduleOverrides(member.id, overrideStart, overrideEnd);
            overridesMap.set(member.id, Array.isArray(overrides) ? overrides : []);
          } catch (error) {
            console.error('[BookingContext] Failed to load overrides for staff', member.id, error);
            overridesMap.set(member.id, []);
          }
        })
      );

      const transformedStaff = activeStaff.map((member: any) => ({
        ...mapStaffToCalendar(member),
        schedules: scheduleMap.get(member.id) || [],
        scheduleOverrides: overridesMap.get(member.id) || [],
        firstName: member.firstName,
        lastName: member.lastName,
      }));

      setStaff(transformedStaff);
      setServices(servicesData);
      setCustomers(customersData);
      setBookings(bookingsData);
      setMerchantSettings(settingsData);
    } catch (error) {
      console.error('[BookingContext] Failed to load initial data', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [staffClient]);

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      loadData();
    };

    window.addEventListener('roster-override-updated', handler as EventListener);
    return () => {
      window.removeEventListener('roster-override-updated', handler as EventListener);
    };
  }, [loadData]);

  const openBookingSlideout = () => {
    setIsBookingSlideoutOpen(true);
  };

  const closeBookingSlideout = () => {
    setIsBookingSlideoutOpen(false);
  };

  const openQuickSale = () => {
    setIsQuickSaleOpen(true);
  };

  const closeQuickSale = () => {
    setIsQuickSaleOpen(false);
  };

  const handleSaveBooking = async (bookingData: any) => {
    try {
      // Booking is already created by BookingSlideOut component
      // Just handle the UI updates and data refresh
      toast({
        title: "Booking Created",
        description: "The booking has been created successfully.",
      });
      closeBookingSlideout();
      // Reload bookings to refresh any components using the data
      const updatedBookings = await apiClient.getBookings();
      setBookings(updatedBookings);
    } catch (error: any) {
      // Extract error message from the API response
      const errorMessage = error?.response?.data?.message || 
                         error?.message || 
                         "Failed to create booking. Please try again.";
      
      // Check if this is a conflict error with detailed information
      const conflicts = error?.response?.data?.conflicts;
      let description = errorMessage;
      
      if (conflicts && Array.isArray(conflicts)) {
        // Show the first conflict details
        const firstConflict = conflicts[0];
        if (firstConflict) {
          const conflictStart = new Date(firstConflict.startTime);
          const conflictTime = format(conflictStart, 'h:mm a');
          description = `${errorMessage}. There's already a booking at ${conflictTime}.`;
        }
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const handleSaleComplete = () => {
    // Optionally refresh data or show success message
    toast({
      title: "Sale Completed",
      description: "The sale has been processed successfully.",
    });
  };

  return (
    <BookingContext.Provider
      value={{
        openBookingSlideout,
        closeBookingSlideout,
        isBookingSlideoutOpen,
        openQuickSale,
        closeQuickSale,
        isQuickSaleOpen,
        staff,
        services,
        customers,
        loading,
      }}
    >
      {children}
      
      {/* Global Booking Slideout */}
      <BookingSlideOut
        isOpen={isBookingSlideoutOpen}
        onClose={closeBookingSlideout}
        staff={staff}
        services={services}
        customers={customers}
        bookings={bookings}
        onSave={handleSaveBooking}
        merchant={merchantSettings
          ? {
              settings: merchantSettings.settings || merchantSettings,
              locations: merchant?.locations,
              locationId: merchant?.locationId,
            }
          : merchant ?? undefined}
      />
      
      {/* Global Quick Sale Slideout */}
      <QuickSaleSlideOut
        isOpen={isQuickSaleOpen}
        onClose={closeQuickSale}
        services={services}
        staff={staff}
        onSaleComplete={handleSaleComplete}
      />
    </BookingContext.Provider>
  );
};
