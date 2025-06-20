import { apiClient } from './api-client';

/**
 * Simple notification triggers for essential business events
 * These functions should be called when the corresponding actions happen
 */

// Trigger a new booking notification
export function triggerNewBookingNotification(booking: {
  id: string;
  customerName: string;
  serviceName: string;
  startTime: string;
}) {
  // Dispatch custom event that the notifications context listens to
  window.dispatchEvent(new CustomEvent('booking:created', {
    detail: {
      id: booking.id,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      time: new Date(booking.startTime).toLocaleTimeString('en-AU', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })
    }
  }));
}

// Trigger a booking modification notification
export function triggerBookingModifiedNotification(booking: {
  id: string;
  customerName: string;
  changes: string; // e.g., "changed time to 3:00 PM"
}) {
  window.dispatchEvent(new CustomEvent('booking:modified', {
    detail: {
      id: booking.id,
      customerName: booking.customerName,
      changes: booking.changes
    }
  }));
}

// Trigger a booking cancellation notification
export function triggerBookingCancelledNotification(booking: {
  id: string;
  customerName: string;
  serviceName: string;
  startTime: string;
}) {
  window.dispatchEvent(new CustomEvent('booking:cancelled', {
    detail: {
      id: booking.id,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      time: new Date(booking.startTime).toLocaleTimeString('en-AU', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })
    }
  }));
}

// Trigger a refund notification
export function triggerRefundNotification(refund: {
  paymentId: string;
  customerName: string;
  amount: number;
}) {
  window.dispatchEvent(new CustomEvent('payment:refunded', {
    detail: {
      paymentId: refund.paymentId,
      customerName: refund.customerName,
      amount: refund.amount
    }
  }));
}