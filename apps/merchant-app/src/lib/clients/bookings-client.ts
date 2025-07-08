import { BaseApiClient } from './base-client';
import { requestSchemas, responseSchemas } from './validation';

export interface Booking {
  id: string;
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
    console.log('[BookingsClient] createBooking called with:', JSON.stringify(data, null, 2));
    const booking = await this.post(
      '/bookings', 
      data, 
      undefined, 
      'v2',
      requestSchemas.createBooking,
      responseSchemas.booking
    );
    console.log('[BookingsClient] Raw response:', JSON.stringify(booking, null, 2));
    const transformed = this.transformBooking(booking);
    console.log('[BookingsClient] Transformed response:', JSON.stringify(transformed, null, 2));
    return transformed;
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
    const dateStr = request.date.toISOString().split('T')[0];
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
    // API returns totalDuration for list endpoints, duration for detail endpoints
    const duration = booking.duration || booking.totalDuration ||
      (booking.services?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 0);
    
    // Transform status from uppercase to lowercase with hyphens
    // Special case: COMPLETE/COMPLETED -> completed (with 'd')
    const status = booking.status ? 
      ((booking.status === 'COMPLETE' || booking.status === 'COMPLETED') ? 'completed' : 
       booking.status.toLowerCase().replace(/_/g, '-')) : 
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
      serviceId: booking.serviceId || booking.services?.[0]?.serviceId || '',
      staffId: booking.staffId || booking.providerId || '',
    };
  }

  async markBookingAsPaid(id: string, paymentMethod: string = 'CASH'): Promise<{
    success: boolean;
    message: string;
    order: any;
    payment?: any;
  }> {
    return this.post(`/bookings/${id}/mark-paid`, { paymentMethod }, undefined, 'v2');
  }

  async startBooking(id: string): Promise<Booking> {
    const booking = await this.patch(`/bookings/${id}/start`, {}, undefined, 'v2');
    return this.transformBooking(booking);
  }

  async completeBooking(id: string): Promise<Booking> {
    const booking = await this.patch(`/bookings/${id}/complete`, {}, undefined, 'v2');
    return this.transformBooking(booking);
  }
}