/**
 * Booking Events Service
 * Handles cross-tab communication for booking updates
 */

type BookingEvent = {
  type: 'booking_created' | 'booking_updated' | 'booking_deleted';
  bookingId: string;
  timestamp: number;
  source: 'slideout' | 'external' | 'api';
};

class BookingEventsService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: BookingEvent) => void> = new Set();

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('heya-pos-bookings');
      
      this.channel.onmessage = (event) => {
        const bookingEvent = event.data as BookingEvent;
        // Notify all listeners
        this.listeners.forEach(listener => listener(bookingEvent));
      };
    }
  }

  /**
   * Broadcast a booking event to all tabs
   */
  broadcast(event: Omit<BookingEvent, 'timestamp'>) {
    if (!this.channel) return;
    
    const fullEvent: BookingEvent = {
      ...event,
      timestamp: Date.now()
    };
    
    this.channel.postMessage(fullEvent);
  }

  /**
   * Subscribe to booking events
   */
  subscribe(listener: (event: BookingEvent) => void) {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const bookingEvents = new BookingEventsService();