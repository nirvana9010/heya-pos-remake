import { BaseApiClient } from './base-client';
import { requestSchemas, responseSchemas } from './validation';
import { formatName } from '@heya-pos/utils';
import { mapBookingSource } from '../booking-source';

export type BookingStatus =
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'deleted'
  | 'optimistic';

const BOOKING_STATUS_ALIASES: Record<string, BookingStatus> = {
  pending: 'pending',
  'pending-confirmation': 'pending',
  'pending-confirm': 'pending',
  'pending-approval': 'pending',
  awaiting: 'pending',
  'awaiting-confirmation': 'pending',
  provisional: 'pending',
  scheduled: 'scheduled',
  confirm: 'confirmed',
  confirmed: 'confirmed',
  booked: 'confirmed',
  inprogress: 'in-progress',
  'in-progress': 'in-progress',
  in_progress: 'in-progress',
  started: 'in-progress',
  ongoing: 'in-progress',
  complete: 'completed',
  completed: 'completed',
  done: 'completed',
  finished: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  'cancelled-late': 'cancelled',
  noshow: 'no-show',
  'no-show': 'no-show',
  no_show: 'no-show',
  deleted: 'deleted',
  removed: 'deleted',
  optimistic: 'optimistic',
};

const BOOKING_STATUS_VALUES: readonly BookingStatus[] = [
  'pending',
  'scheduled',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
  'deleted',
  'optimistic',
];

const normalizeStatusKey = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');

export const coerceBookingStatus = (
  value: unknown,
  fallback: BookingStatus = 'confirmed',
): BookingStatus => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const key = normalizeStatusKey(value);
  if (BOOKING_STATUS_ALIASES[key]) {
    return BOOKING_STATUS_ALIASES[key];
  }
  return BOOKING_STATUS_VALUES.includes(key as BookingStatus)
    ? (key as BookingStatus)
    : fallback;
};

export interface BookingServiceSummary {
  id?: string;
  serviceId?: string;
  name?: string;
  serviceName?: string;
  duration?: number;
  price?: number;
  [key: string]: unknown;
}

export interface Booking {
  id: string;
  bookingNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerSource?: string | null;
  serviceId: string;
  serviceName: string;
  services?: BookingServiceSummary[];
  staffId: string;
  staffName: string;
  startTime: string;
  endTime?: string;
  status: BookingStatus;
  price: number;
  totalAmount: number;
  duration: number;
  date: string;
  notes?: string;
  internalNotes?: string;
  customerRequestedStaff?: boolean;
  source?: string | null;
  sourceCategory?: string;
  sourceLabel?: string;
  isPaid?: boolean;
  paymentStatus?: string;
  paymentMethod?: string;
  paidAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

const toOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return undefined;
};

const ensureString = (value: unknown, fallback = ''): string =>
  toOptionalString(value) ?? fallback;

const toIsoString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const toNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

// Normalizes raw booking payloads from multiple API shapes into the client-facing schema.
export const normalizeBooking = (raw: unknown): Booking => {
  const booking = (raw ?? {}) as any;

  const services = Array.isArray(booking.services)
    ? (booking.services as BookingServiceSummary[])
    : undefined;
  const primaryService = services?.[0];

  const customerSource =
    booking.customerSource ?? booking.customer?.source ?? null;
  const sourceInfo = mapBookingSource(
    booking.source ?? booking.origin ?? booking.bookingSource,
    customerSource,
  );

  const totalAmount =
    toNumber(
      booking.totalAmount ??
        booking.totalPrice ??
        booking.price ??
        (services?.reduce(
          (sum: number, service: any) => sum + toNumber(service.price, 0),
          0,
        ) ?? 0),
    );

  const duration =
    toNumber(
      booking.duration ??
        booking.totalDuration ??
        (services?.reduce(
          (sum: number, service: any) => sum + toNumber(service.duration, 0),
          0,
        ) ?? 0),
    );

  const startTime =
    toIsoString(
      booking.startTime ??
        booking.start ??
        booking.start_date ??
        booking.startAt ??
        booking.startDate,
    ) ?? new Date().toISOString();

  const endTime = toIsoString(
    booking.endTime ??
      booking.end ??
      booking.finishTime ??
      booking.completedAt ??
      booking.endDate,
  );

  const createdAt = toIsoString(booking.createdAt) ?? startTime;
  const updatedAt =
    toIsoString(booking.updatedAt ?? booking.modifiedAt) ?? createdAt;
  const completedAt = toIsoString(booking.completedAt ?? booking.endTime);

  const bookingNumber = toOptionalString(
    booking.bookingNumber ??
      booking.reference ??
      booking.code ??
      booking.reservationCode,
  );

  const id = ensureString(
    booking.id ??
      booking.bookingId ??
      booking.uuid ??
      booking._id ??
      primaryService?.bookingId,
    'unknown',
  );

  const customerId = ensureString(
    booking.customerId ?? booking.customer?.id ?? booking.clientId,
    'unknown',
  );

  const staffId = ensureString(
    booking.staffId ?? booking.providerId ?? booking.staff?.id,
    '',
  );

  const status = coerceBookingStatus(
    booking.status ??
      booking.bookingStatus ??
      booking.currentStatus ??
      booking.state ??
      booking.workflowStatus ??
      booking.current_state,
  );

  const serviceId = ensureString(
    booking.serviceId ??
      primaryService?.serviceId ??
      primaryService?.id ??
      primaryService?.service?.id,
    '',
  );

  const serviceName =
    booking.serviceName ??
    primaryService?.serviceName ??
    primaryService?.name ??
    primaryService?.service?.name ??
    'Service';

  const staffName =
    booking.staffName ??
    booking.staff?.name ??
    (booking.provider
      ? formatName(booking.provider.firstName, booking.provider.lastName)
      : 'Staff');

  const customerName =
    booking.customerName ??
    booking.customer?.name ??
    (booking.customer
      ? formatName(booking.customer.firstName, booking.customer.lastName)
      : 'Unknown Customer');

  const customerPhone = ensureString(
    booking.customerPhone ??
      booking.customer?.phone ??
      booking.customer?.mobile,
    '',
  );

  const customerEmail = ensureString(
    booking.customerEmail ?? booking.customer?.email,
    '',
  );

  const isPaid =
    typeof booking.isPaid === 'boolean'
      ? booking.isPaid
      : typeof booking.paymentStatus === 'string'
      ? normalizeStatusKey(booking.paymentStatus) === 'paid'
      : toNumber(booking.paidAmount, 0) > 0;

  const paymentStatus =
    typeof booking.paymentStatus === 'string'
      ? booking.paymentStatus
      : isPaid
      ? 'paid'
      : 'unpaid';

  const paymentMethod = toOptionalString(booking.paymentMethod);

  const paidAmount = toNumber(
    booking.paidAmount ?? booking.amountPaid ?? (isPaid ? totalAmount : 0),
    0,
  );

  const customerRequestedStaff = Boolean(
    booking.customerRequestedStaff ??
      booking.preferredStaff ??
      booking.customer?.requestedStaff,
  );

  const transformed: Booking = {
    ...booking,
    id,
    bookingNumber,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    customerSource: customerSource ?? undefined,
    serviceId,
    serviceName,
    services,
    staffId,
    staffName,
    startTime,
    endTime,
    status,
    price: totalAmount,
    totalAmount,
    duration,
    date: toIsoString(booking.date) ?? startTime,
    notes: toOptionalString(booking.notes),
    internalNotes: toOptionalString(booking.internalNotes),
    customerRequestedStaff,
    source: sourceInfo.raw,
    sourceCategory: sourceInfo.category,
    sourceLabel: sourceInfo.label,
    isPaid,
    paymentStatus,
    paymentMethod,
    paidAmount,
    createdAt,
    updatedAt,
    completedAt,
  };

  return transformed;
};

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
  customerRequestedStaff?: boolean;
}

export interface UpdateBookingRequest {
  startTime?: string;
  endTime?: string;
  staffId?: string;
  status?: string;
  notes?: string;
  services?: Array<{
    serviceId: string;
    staffId?: string;
    price?: number;
    duration?: number;
  }>;
  customerRequestedStaff?: boolean;
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
    
    
    const booking = await this.patch(
      `/bookings/${id}`,
      data,
      undefined,
      'v2',
      requestSchemas.updateBooking,
      responseSchemas.booking
    );

    // CRITICAL: Check if the response is actually an error disguised as success
    if (booking && (booking.statusCode >= 400 || booking.errorMessage || booking.error)) {
      const errorMessage = booking.errorMessage || booking.message || booking.error || 'Update failed';
      const error = new Error(errorMessage);
      (error as any).response = { data: booking, status: booking.statusCode };
      throw error;
    }
    
    
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

  // Helper method retained for backwards compatibility inside the client
  private transformBooking(booking: any): Booking {
    return normalizeBooking(booking);
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
