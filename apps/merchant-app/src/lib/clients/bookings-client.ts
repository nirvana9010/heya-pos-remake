import { BaseApiClient } from './base-client';
import { requestSchemas, responseSchemas } from './validation';

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  startTime: string;
  status: string;
  price: number;
  totalAmount: number;
  duration: number;
  date: string; // For backward compatibility
}

export interface CreateBookingRequest {
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  notes?: string;
}

export interface UpdateBookingRequest {
  startTime?: string;
  staffId?: string;
  status?: string;
  notes?: string;
}

export interface RescheduleBookingRequest {
  startTime: string;
  staffId?: string;
}

export interface AvailabilityRequest {
  date: Date;
  serviceId: string;
  staffId?: string;
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
        console.log('[BookingsClient] Converting date param to startDate/endDate:', params.date);
        const dateStr = params.date;
        delete params.date; // Remove the date param
        
        // Create proper start and end times for the full day
        const startDate = new Date(dateStr);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(dateStr);
        endDate.setHours(23, 59, 59, 999);
        
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
        console.log('[BookingsClient] Converted params:', params);
      }
      
      // V2 API has a limit of 100
      const requestParams = {
        limit: 100,  // Maximum allowed by V2 API
        ...params
      };
      
      console.log('[BookingsClient] Making request with params:', requestParams);
      
      const response = await this.get('/bookings', { params: requestParams }, 'v2');
      
      // Debug pagination
      if (process.env.NODE_ENV === 'development') {
        console.log('Bookings API raw response:', {
          hasData: !!response.data,
          dataLength: response.data?.length || response.length,
          total: response.total,
          page: response.page,
          limit: response.limit,
          params: params
        });
      }
      
      // Real API returns paginated response, extract data
      const bookings = response.data || response;
      
      if (!Array.isArray(bookings)) {
        console.error('[BookingsClient] Invalid response format, expected array:', bookings);
        throw new Error('Invalid response format from bookings API');
      }
      
      // Transform each booking to match the expected format
      return bookings.map((booking: any) => this.transformBooking(booking));
    } catch (error: any) {
      // Use direct console methods to bypass logger
      if (typeof window !== 'undefined' && window.console) {
        window.console.error('[BookingsClient] Error in getBookings:');
        window.console.error('Error type:', error?.constructor?.name);
        window.console.error('Error message:', error?.message);
        window.console.error('Error stack:', error?.stack);
        
        if (error?.response) {
          window.console.error('Response status:', error.response?.status);
          window.console.error('Response data:', error.response?.data);
          window.console.error('Response headers:', error.response?.headers);
        }
        
        if (error?.config) {
          window.console.error('Request URL:', error.config?.url);
          window.console.error('Request method:', error.config?.method);
          window.console.error('Request headers:', error.config?.headers);
        }
        
        // Try to log the full error object
        try {
          window.console.error('Full error object:', JSON.parse(JSON.stringify(error)));
        } catch (e) {
          window.console.error('Could not serialize error object');
        }
      }
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
    const booking = await this.patch(
      `/bookings/${id}`, 
      data, 
      undefined, 
      'v2',
      requestSchemas.updateBooking,
      responseSchemas.booking
    );
    return this.transformBooking(booking);
  }

  async rescheduleBooking(id: string, data: RescheduleBookingRequest): Promise<Booking> {
    console.log('[Bookings Client] Rescheduling booking:', { id, data });
    
    // Use V2 API for rescheduling as it handles time updates better
    const updateData: any = {
      startTime: data.startTime,
    };
    
    // Only include staffId if provided
    if (data.staffId) {
      updateData.staffId = data.staffId;
    }
    
    console.log('[Bookings Client] PATCH request data:', updateData);
    
    try {
      const booking = await this.patch(`/bookings/${id}`, updateData, undefined, 'v2');
      console.log('[Bookings Client] Reschedule response:', booking);
      return this.transformBooking(booking);
    } catch (error) {
      console.error('[Bookings Client] Reschedule failed:', error);
      throw error;
    }
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
    return this.post('/bookings/check-availability', {
      date: request.date.toISOString(),
      serviceId: request.serviceId,
      staffId: request.staffId,
    }, undefined, 'v2');
  }

  // Helper method to transform booking data
  private transformBooking(booking: any): Booking {
    // Handle both V1 (nested) and V2 (flat) response formats
    
    // Customer name - V2 provides it directly, V1 needs to be constructed
    const customerName = booking.customerName || 
      booking.customer?.name ||
      (booking.customer ? 
        `${booking.customer.firstName} ${booking.customer.lastName}`.trim() : 
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
        `${booking.provider.firstName} ${booking.provider.lastName}`.trim() : 
        'Staff');
    
    // Service name - V2 provides it directly, V1 has it nested
    // For multiple services, use the first one or concatenate names
    const serviceName = booking.serviceName || 
      (booking.services && Array.isArray(booking.services) && booking.services.length > 0 ? 
        (booking.services.length === 1 ? 
          booking.services[0].name || booking.services[0]?.service?.name : 
          booking.services.map((s: any) => s.name || s.service?.name).join(', ')) :
        'Service');
    
    // Calculate total amount from services if not set
    const totalAmount = Number(booking.totalAmount) || 
      (booking.services?.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0) || 0);
    
    // Calculate total duration from all services
    const duration = booking.duration || 
      (booking.services?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 0);
    
    // Transform status from uppercase to lowercase with hyphens
    const status = booking.status ? 
      booking.status.toLowerCase().replace(/_/g, '-') : 
      'confirmed';
    
    return {
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
    };
  }
}