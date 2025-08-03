import { BaseApiClient } from './base-client';
import { requestSchemas, responseSchemas } from './validation';
import { formatName } from '@heya-pos/utils';

export interface Booking {
  id: string;
  bookingNumber?: string; // 6-character airline-style booking reference
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startTime: string;
  status: string;
  price: number;
  totalAmount: number;
  duration: number;
  date: string; // For backward compatibility
  notes?: string;
}

export interface CreateBookingRequest {
  customerId: string;
  locationId?: string;
  services: Array<{
    serviceId: string;
    staffId?: string;
  }>;
  staffId?: string;
  startTime: string;
  notes?: string;
  isOverride?: boolean;
  source?: string;
}

export interface UpdateBookingRequest {
  startTime?: string;
  staffId?: string;
  status?: string;
  notes?: string;
  services?: Array<{
    serviceId: string;
    staffId?: string;
    price?: number;
    duration?: number;
  }>;
}

export interface RescheduleBookingRequest {
  startTime: string;
  staffId?: string;
}

export interface AvailabilityRequest {
  date: Date;
  serviceId: string;
  staffId?: string;
  services?: Array<{
    id: string;
    duration: number;
  }>;
}

export class BookingsClient extends BaseApiClient {
  async getBookings(params?: any): Promise<Booking[]> {
    try {
      // If a Date object is passed, convert to appropriate params
      if (params instanceof Date) {
        // V2 API doesn't accept 'date' parameter, use startDate/endDate instead
        const startOfDay = new Date(params);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(params);
        endOfDay.setHours(23, 59, 59, 999);
        
        params = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString()
        };
      }
      
      // If params contains 'date' property, convert it to startDate/endDate
      if (params?.date) {
        const dateStr = params.date;
        delete params.date; // Remove the date param
        
        // Create proper start and end times for the full day
        const startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(dateStr);
        endDate.setHours(23, 59, 59, 999);
        
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }
      
      // V2 API has a limit of 100
      const requestParams = {
        limit: 100,  // Maximum allowed by V2 API
        ...params
      };
      
      const response = await this.get('/bookings', { params: requestParams }, 'v2');
      
      // Real API returns paginated response, extract data
      const bookings = response.data || response;
      
      // Log if we have any pending bookings for debugging
      if (window.dispatchEvent && Array.isArray(bookings)) {
        const pendingBookings = bookings.filter((b: any) => 
          b.status === 'PENDING' || b.status === 'pending'
        );
        if (pendingBookings.length > 0) {
          window.dispatchEvent(new CustomEvent('calendar-activity-log', {
            detail: {
              type: 'api',
              message: `Refresh found ${pendingBookings.length} pending bookings (raw status: ${pendingBookings[0].status})`,
              timestamp: new Date().toISOString()
            }
          }));
        }
      }
      
      if (!Array.isArray(bookings)) {
        throw new Error('Invalid response format from bookings API');
      }
      
      // Transform each booking to match the expected format
      return bookings.map((booking: any) => this.transformBooking(booking));
    } catch (error: any) {
      throw error;
    }
  }

  async getBooking(id: string): Promise<Booking> {
    const booking = await this.get(`/bookings/${id}`, undefined, 'v2');
    return this.transformBooking(booking);
  }

  async createBooking(data: CreateBookingRequest): Promise<Booking> {
    const booking = await this.post(
      '/bookings', 
      data, 
      undefined, 
      'v2',
      requestSchemas.createBooking,
      responseSchemas.booking
    );
    return this.transformBooking(booking);
  }

  async updateBooking(id: string, data: UpdateBookingRequest): Promise<Booking> {
    // Comprehensive logging for all booking updates
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('calendar-activity-log', {
        detail: {
          type: 'api-client-update',
          message: `BookingsClient.updateBooking called for ${id}`,
          data: {
            bookingId: id,
            updateData: data,
            servicesCount: data.services?.length || 0,
            services: data.services?.map(s => ({
              serviceId: s.serviceId,
              staffId: s.staffId,
              price: s.price,
              duration: s.duration
            }))
          },
          timestamp: new Date().toISOString()
        }
      }));
    }
    
    if (window.dispatchEvent && data.status) {
      window.dispatchEvent(new CustomEvent('calendar-activity-log', {
        detail: {
          type: 'api',
          message: `Sending status update: ${data.status} for booking ${id}`,
          timestamp: new Date().toISOString()
        }
      }));
    }
    
    // Log the exact payload being sent to the API
    console.log('[BOOKINGS CLIENT] Sending PATCH request to:', `/bookings/${id}`);
    console.log('[BOOKINGS CLIENT] Payload:', JSON.stringify(data, null, 2));
    
    const booking = await this.patch(
      `/bookings/${id}`, 
      data, 
      undefined, 
      'v2',
      requestSchemas.updateBooking,
      responseSchemas.booking
    );
    
    // Log what we got back
    console.log('[BOOKINGS CLIENT] Response received:', booking);
    
    if (window.dispatchEvent && booking) {
      window.dispatchEvent(new CustomEvent('calendar-activity-log', {
        detail: {
          type: 'api-response',
          message: `API returned booking ${booking.id}`,
          data: {
            bookingId: booking.id,
            status: booking.status,
            services: booking.services,
            servicesCount: booking.services?.length || 0
          },
          timestamp: new Date().toISOString()
        }
      }));
    }
    
    const transformedBooking = this.transformBooking(booking);
    
    // Log the transformed result
    console.log('[BOOKINGS CLIENT] Transformed booking:', transformedBooking);
    console.log('[BOOKINGS CLIENT] Services in transformed:', transformedBooking.services);
    
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('calendar-activity-log', {
        detail: {
          type: 'api-transform',
          message: `Transformed booking ${transformedBooking.id}`,
          data: {
            bookingId: transformedBooking.id,
            services: transformedBooking.services,
            servicesCount: transformedBooking.services?.length || 0
          },
          timestamp: new Date().toISOString()
        }
      }));
    }
    
    return transformedBooking;
  }

  async rescheduleBooking(id: string, data: RescheduleBookingRequest): Promise<Booking> {
    // Use V2 API for rescheduling as it handles time updates better
    const updateData: any = {
      startTime: data.startTime,
    };
    
    // Only include staffId if provided
    if (data.staffId) {
      updateData.staffId = data.staffId;
    }
    
    const booking = await this.patch(`/bookings/${id}`, updateData, undefined, 'v2');
    return this.transformBooking(booking);
  }

  // V2 booking status update methods
  async startBooking(id: string): Promise<Booking> {
    const booking = await this.patch(`/bookings/${id}/start`, undefined, undefined, 'v2');
    return this.transformBooking(booking);
  }

  async completeBooking(id: string): Promise<Booking> {
    const booking = await this.patch(`/bookings/${id}/complete`, undefined, undefined, 'v2');
    return this.transformBooking(booking);
  }

  async cancelBooking(id: string, reason: string): Promise<Booking> {
    const booking = await this.patch(`/bookings/${id}/cancel`, { reason }, undefined, 'v2');
    return this.transformBooking(booking);
  }

  async checkAvailability(request: AvailabilityRequest) {
    // For single day check, use same date for start and end
    // Handle both Date objects and date strings
    let date: Date;
    
    // Validate and parse the date
    if (request.date instanceof Date) {
      date = request.date;
    } else if (typeof request.date === 'string') {
      date = new Date(request.date);
    } else {
      throw new Error('Invalid date provided to checkAvailability');
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date: Unable to parse the provided date');
    }
    
    const dateStr = date.toISOString().split('T')[0];
    const params = new URLSearchParams({
      staffId: request.staffId || '',
      serviceId: request.serviceId,
      startDate: dateStr,
      endDate: dateStr,
    });
    
    if (request.services && request.services.length > 0) {
      // If services array is provided, use the first service
      params.set('serviceId', request.services[0].id);
    }
    
    return this.get(`/bookings/availability?${params.toString()}`, undefined, 'v2');
  }

  // Helper method to transform booking data
  private transformBooking(booking: any): Booking {
    // Handle both V1 (nested) and V2 (flat) response formats
    
    // Customer name - V2 provides it directly, V1 needs to be constructed
    const customerName = booking.customerName || 
      booking.customer?.name ||
      (booking.customer ? 
        formatName(booking.customer.firstName, booking.customer.lastName) : 
        'Unknown Customer');
    
    // Customer phone - V2 provides it directly, V1 has it nested
    const customerPhone = booking.customerPhone || 
      booking.customer?.phone ||
      booking.customer?.mobile || 
      '';
    
    // Customer email - handle both formats
    const customerEmail = booking.customerEmail || 
      booking.customer?.email || 
      '';
    
    // Staff name - V2 provides it directly, V1 needs to be constructed
    const staffName = booking.staffName || 
      booking.staff?.name ||
      (booking.provider ? 
        formatName(booking.provider.firstName, booking.provider.lastName) : 
        'Staff');
    
    // Service name - V2 provides it directly, V1 has it nested
    // For multiple services, use the first one or concatenate names
    const serviceName = booking.serviceName || 
      (booking.services && Array.isArray(booking.services) && booking.services.length > 0 ? 
        (booking.services.length === 1 ? 
          booking.services[0].name || booking.services[0]?.service?.name : 
          booking.services.map((s: any) => s.name || s.service?.name).join(' + ')) :
        'Service');
    
    // Calculate total amount from services if not set
    const totalAmount = Number(booking.totalAmount) || 
      (booking.services?.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0) || 0);
    
    // Calculate total duration from all services
    // API returns totalDuration for list endpoints, duration for detail endpoints
    const duration = booking.duration || booking.totalDuration ||
      (booking.services?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 0);
    
    // Transform status from uppercase to lowercase with hyphens
    // Special cases: 
    // - COMPLETE/COMPLETED -> completed (with 'd')
    // - DELETED -> deleted (for recycle bin)
    const status = booking.status ? 
      ((booking.status === 'COMPLETE' || booking.status === 'COMPLETED') ? 'completed' : 
       (booking.status === 'DELETED') ? 'deleted' :
       booking.status.toLowerCase().replace(/_/g, '-')) : 
      'confirmed';
    
    const transformed = {
      ...booking,
      status,
      customerName,
      customerPhone,
      customerEmail,
      serviceName,
      staffName,
      price: totalAmount,
      totalAmount: totalAmount,
      duration,
      date: booking.startTime, // For backward compatibility
      serviceId: booking.serviceId || booking.services?.[0]?.serviceId || '',
      staffId: booking.staffId || booking.providerId || '',
      services: booking.services, // IMPORTANT: Preserve the services array for multi-service bookings
    };
    
    return transformed;
  }

  async markBookingAsPaid(id: string, paymentMethod: string = 'CASH'): Promise<{
    success: boolean;
    message: string;
    order: any;
    payment?: any;
  }> {
    return this.post(`/bookings/${id}/mark-paid`, { paymentMethod }, undefined, 'v2');
  }


  async deleteBooking(id: string): Promise<void> {
    // Note: This is a "soft delete" - it sets status to DELETED and moves to recycle bin
    await this.delete(`/bookings/${id}`, undefined, 'v2');
  }

}