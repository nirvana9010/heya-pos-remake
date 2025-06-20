import { useEffect } from 'react';
import { useNotifications } from '@/contexts/notifications-context';
import { apiClient } from '@/lib/api-client';

export function useRealtimeNotifications() {
  const { addNotification } = useNotifications();

  // DISABLED: Automatic polling causes constant API errors
  // For MVP, notifications will only be triggered by explicit events
  // Uncomment and fix when implementing real-time updates post-MVP
  
  /*
  useEffect(() => {
    // Poll for updates every 30 seconds
    const checkForUpdates = async () => {
      try {
        // Implementation disabled to prevent API errors
      } catch (error) {
        console.error('Failed to check for notification updates:', error);
      }
    };

    // Initial check
    checkForUpdates();

    // Set up polling interval
    const interval = setInterval(checkForUpdates, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [addNotification]);
  */

  // Also listen for manual events from other parts of the app
  useEffect(() => {
    const handleBookingCreated = (event: CustomEvent) => {
      const booking = event.detail;
      addNotification({
        type: 'booking_new',
        priority: 'important',
        title: 'New booking created',
        message: `Booking for ${booking.customerName} has been created`,
        actionUrl: `/bookings/${booking.id}`,
        actionLabel: 'View booking'
      });
    };

    const handlePaymentProcessed = (event: CustomEvent) => {
      const payment = event.detail;
      addNotification({
        type: 'payment_received',
        priority: 'info',
        title: 'Payment processed',
        message: `$${payment.amount} payment completed`,
        metadata: {
          amount: payment.amount
        }
      });
    };

    window.addEventListener('booking:created', handleBookingCreated as EventListener);
    window.addEventListener('payment:processed', handlePaymentProcessed as EventListener);

    return () => {
      window.removeEventListener('booking:created', handleBookingCreated as EventListener);
      window.removeEventListener('payment:processed', handlePaymentProcessed as EventListener);
    };
  }, [addNotification]);
}