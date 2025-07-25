'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookingSlideOut } from '@/components/BookingSlideOut';
import { QuickSaleSlideOut } from '@/components/QuickSaleSlideOut';
import { apiClient } from '@/lib/api-client';
import { StaffClient } from '@/lib/clients/staff-client';
import { useToast } from '@heya-pos/ui';
import { useAuth } from '@/lib/auth/auth-provider';
import { format } from 'date-fns';

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

  // Load data when user is authenticated
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Load all required data in parallel
      const [staffData, servicesResponse, customersData, bookingsData, settingsData, schedulesData] = await Promise.all([
        apiClient.getStaff().catch(() => []),
        apiClient.getServices({ limit: 500, isActive: true }).catch(() => ({ data: [] })),
        apiClient.getCustomers().catch(() => []),
        apiClient.getBookings().catch(() => []),
        apiClient.getMerchantSettings().catch(() => null),
        new StaffClient().getAllSchedules().catch(() => [])
      ]);
      
      // Extract services array from paginated response
      const servicesData = servicesResponse.data || [];

      // Create a map of schedules by staff ID
      const scheduleMap = new Map();
      if (Array.isArray(schedulesData)) {
        schedulesData.forEach((staffSchedule: any) => {
          if (staffSchedule.staffId && staffSchedule.schedules) {
            scheduleMap.set(staffSchedule.staffId, staffSchedule.schedules);
          }
        });
      }

      // Transform staff data to include name property and filter out inactive staff
      const transformedStaff = staffData
        .filter((member: any) => {
          return member.status === 'ACTIVE';
        })
        .map((member: any) => ({
          id: member.id,
          name: member.lastName ? `${member.firstName} ${member.lastName}`.trim() : member.firstName,
          color: member.calendarColor || '#7C3AED',
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          isActive: true, // Already filtered for ACTIVE status above
          schedules: scheduleMap.get(member.id) || []
        }));
      
      setStaff(transformedStaff);
      setServices(servicesData);
      setCustomers(customersData);
      setBookings(bookingsData);
      setMerchantSettings(settingsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

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
        merchant={merchantSettings ? { 
          settings: merchantSettings.settings || merchantSettings,
          locations: merchant?.locations,
          locationId: merchant?.locationId
        } : merchant}
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