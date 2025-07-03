'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookingSlideOut } from '@/components/BookingSlideOut';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';
import { useAuth } from '@/lib/auth/auth-provider';
import { format } from 'date-fns';

interface BookingContextType {
  openBookingSlideout: () => void;
  closeBookingSlideout: () => void;
  isBookingSlideoutOpen: boolean;
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
  const { user } = useAuth();
  const [isBookingSlideoutOpen, setIsBookingSlideoutOpen] = useState(false);
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
      const [staffData, servicesData, customersData, bookingsData, settingsData] = await Promise.all([
        apiClient.getStaff().catch(() => []),
        apiClient.getServices().catch(() => []),
        apiClient.getCustomers().catch(() => []),
        apiClient.getBookings().catch(() => []),
        apiClient.getMerchantSettings().catch(() => null)
      ]);

      // Transform staff data to include name property
      const transformedStaff = staffData.map((member: any) => ({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        color: member.calendarColor || '#7C3AED',
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        isActive: member.isActive
      }));
      
      setStaff(transformedStaff);
      setServices(servicesData);
      setCustomers(customersData);
      setBookings(bookingsData);
      setMerchantSettings(settingsData);
    } catch (error) {
      console.error('Failed to load booking data:', error);
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

  const handleSaveBooking = async (bookingData: any) => {
    try {
      await apiClient.createBooking(bookingData);
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

  return (
    <BookingContext.Provider
      value={{
        openBookingSlideout,
        closeBookingSlideout,
        isBookingSlideoutOpen,
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
        merchant={merchantSettings ? { settings: merchantSettings.settings || merchantSettings } : undefined}
      />
    </BookingContext.Provider>
  );
};