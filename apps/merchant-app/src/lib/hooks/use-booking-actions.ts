import { useState, useCallback } from 'react';
import { useToast } from '@heya-pos/ui';
import { apiClient } from '@/lib/api-client';
import { bookingEvents } from '@/lib/services/booking-events';

export function useBookingActions() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const completeBooking = useCallback(async (bookingId: string) => {
    setIsLoading(true);
    try {
      await apiClient.completeBooking(bookingId);
      
      // Broadcast event to refresh calendar
      bookingEvents.broadcast({
        type: 'booking_updated',
        bookingId,
        source: 'external'
      });
      
      toast({
        title: 'Success',
        description: 'Booking marked as complete',
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete booking',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const markBookingAsPaid = useCallback(async (bookingId: string, paymentMethod: string = 'CASH') => {
    setIsLoading(true);
    try {
      await apiClient.markBookingAsPaid(bookingId, paymentMethod);
      
      // Broadcast event to refresh calendar
      bookingEvents.broadcast({
        type: 'booking_updated',
        bookingId,
        source: 'external'
      });
      
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const startBooking = useCallback(async (bookingId: string) => {
    setIsLoading(true);
    try {
      await apiClient.startBooking(bookingId);
      
      // Broadcast event to refresh calendar
      bookingEvents.broadcast({
        type: 'booking_updated',
        bookingId,
        source: 'external'
      });
      
      toast({
        title: 'Success',
        description: 'Booking started',
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start booking',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    completeBooking,
    markBookingAsPaid,
    startBooking,
    isLoading,
  };
}