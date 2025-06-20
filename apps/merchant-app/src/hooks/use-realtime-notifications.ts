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

  // Listen for essential business events
  useEffect(() => {
    const handleBookingCreated = (event: CustomEvent) => {
      const { id, customerName, serviceName, time } = event.detail;
      addNotification({
        type: 'booking_new',
        priority: 'important',
        title: 'New booking received',
        message: `${customerName} booked ${serviceName} for ${time}`,
        actionUrl: `/bookings/${id}`,
        actionLabel: 'View booking',
        metadata: { bookingId: id, customerName, serviceName, time }
      });
    };

    const handleBookingModified = (event: CustomEvent) => {
      const { id, customerName, changes } = event.detail;
      addNotification({
        type: 'booking_modified',
        priority: 'info',
        title: 'Booking changed',
        message: `${customerName} ${changes}`,
        actionUrl: `/bookings/${id}`,
        actionLabel: 'View changes',
        metadata: { bookingId: id, customerName }
      });
    };

    const handleBookingCancelled = (event: CustomEvent) => {
      const { id, customerName, serviceName, time } = event.detail;
      addNotification({
        type: 'booking_cancelled',
        priority: 'urgent',
        title: 'Booking cancelled',
        message: `${customerName} cancelled ${serviceName} at ${time}`,
        actionUrl: '/calendar',
        actionLabel: 'Fill slot',
        metadata: { bookingId: id, customerName, serviceName, time }
      });
    };

    const handlePaymentRefunded = (event: CustomEvent) => {
      const { paymentId, customerName, amount } = event.detail;
      addNotification({
        type: 'payment_refunded',
        priority: 'important',
        title: 'Refund processed',
        message: `$${amount} refunded to ${customerName}`,
        actionUrl: '/payments',
        actionLabel: 'View details',
        metadata: { paymentId, customerName, amount }
      });
    };

    window.addEventListener('booking:created', handleBookingCreated as EventListener);
    window.addEventListener('booking:modified', handleBookingModified as EventListener);
    window.addEventListener('booking:cancelled', handleBookingCancelled as EventListener);
    window.addEventListener('payment:refunded', handlePaymentRefunded as EventListener);

    return () => {
      window.removeEventListener('booking:created', handleBookingCreated as EventListener);
      window.removeEventListener('booking:modified', handleBookingModified as EventListener);
      window.removeEventListener('booking:cancelled', handleBookingCancelled as EventListener);
      window.removeEventListener('payment:refunded', handlePaymentRefunded as EventListener);
    };
  }, [addNotification]);
}