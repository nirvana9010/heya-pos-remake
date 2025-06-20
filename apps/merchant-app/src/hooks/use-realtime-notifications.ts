import { useEffect } from 'react';
import { useNotifications } from '@/contexts/notifications-context';
import { apiClient } from '@/lib/api-client';

export function useRealtimeNotifications() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Poll for updates every 30 seconds
    const checkForUpdates = async () => {
      try {
        // Get recent bookings
        const bookings = await apiClient.getBookings({ 
          limit: 5
        });

        // Check for new bookings created in the last minute
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const newBookings = bookings.filter((b: any) => 
          new Date(b.createdAt) > oneMinuteAgo && b.status === 'CONFIRMED'
        );

        newBookings.forEach((booking: any) => {
          addNotification({
            type: 'booking_new',
            priority: 'important',
            title: 'New booking received',
            message: `${booking.customer.firstName} ${booking.customer.lastName} booked ${booking.service.name}`,
            actionUrl: `/bookings/${booking.id}`,
            actionLabel: 'View booking',
            metadata: {
              bookingId: booking.id,
              customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
              serviceName: booking.service.name,
              time: new Date(booking.startTime).toLocaleTimeString('en-AU', { 
                hour: 'numeric', 
                minute: '2-digit' 
              })
            }
          });
        });

        // Check for recent cancellations
        const cancelledBookings = bookings.filter((b: any) => 
          new Date(b.updatedAt) > oneMinuteAgo && b.status === 'CANCELLED'
        );

        cancelledBookings.forEach((booking: any) => {
          addNotification({
            type: 'booking_cancelled',
            priority: 'urgent',
            title: 'Booking cancelled',
            message: `${booking.customer.firstName} ${booking.customer.lastName} cancelled their ${booking.service.name} appointment`,
            actionUrl: '/calendar',
            actionLabel: 'Fill slot',
            metadata: {
              bookingId: booking.id,
              customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
              serviceName: booking.service.name,
              time: new Date(booking.startTime).toLocaleTimeString('en-AU', { 
                hour: 'numeric', 
                minute: '2-digit' 
              })
            }
          });
        });

        // Get recent payments
        const payments = await apiClient.getPayments({ 
          limit: 5
        });

        const newPayments = payments.filter((p: any) => 
          new Date(p.createdAt) > oneMinuteAgo && p.status === 'COMPLETED'
        );

        newPayments.forEach((payment: any) => {
          addNotification({
            type: 'payment_received',
            priority: 'info',
            title: 'Payment received',
            message: `$${payment.amount} received from ${payment.customer?.firstName || 'Customer'} via ${payment.method}`,
            metadata: {
              amount: payment.amount,
              customerName: payment.customer?.firstName || 'Customer'
            }
          });
        });

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