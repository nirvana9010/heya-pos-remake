/**
 * Booking Events Service
 * Handles cross-tab communication for booking updates
 */

type BookingEvent = {
  type: 'booking_created' | 'booking_updated' | 'booking_deleted';
  bookingId: string;
  timestamp: number;
  source: 'slideout' | 'external' | 'api';
  originId: string;
};

class BookingEventsService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: BookingEvent) => void> = new Set();
  private originId: string;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.originId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      this.channel = new BroadcastChannel('heya-pos-bookings');
      
      this.channel.onmessage = (event) => {
        const bookingEvent = event.data as BookingEvent;
        // Notify all listeners
        this.listeners.forEach(listener => listener(bookingEvent));
      };
    } else {
      this.originId = Math.random().toString(36).slice(2);
    }
  }

  /**
   * Broadcast a booking event to all tabs
   */
  broadcast(event: Omit<BookingEvent, 'timestamp' | 'originId'> & { originId?: string }) {
    if (!this.channel) return;
    
    const fullEvent: BookingEvent = {
      ...event,
      originId: event.originId ?? this.originId,
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

  getOriginId() {
    return this.originId;
  }

  isLocalEvent(event: BookingEvent) {
    return event.originId === this.originId;
  }
}

// Export singleton instance
export const bookingEvents = new BookingEventsService();
