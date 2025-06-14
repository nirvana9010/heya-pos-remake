import apiClient from './api-client';

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  categoryId: string;
  categoryName?: string;
  isActive: boolean;
  displayOrder?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
}

export interface Staff {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  services?: string[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CreateBookingData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  staffId?: string;
  date: Date;
  startTime: string;
  notes?: string;
}

export interface Booking {
  id: string;
  bookingNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantInfo {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  address: string;
  phone: string;
  email: string;
  requireDeposit: boolean;
  depositPercentage: number;
}

class BookingApi {
  // Get merchant info (public endpoint)
  async getMerchantInfo(): Promise<MerchantInfo> {
    const response = await apiClient.get<MerchantInfo>('/public/merchant-info');
    return response;
  }

  // Get services available for booking (public endpoint)
  async getServices(): Promise<Service[]> {
    const response = await apiClient.get<{ data: Service[] }>('/public/services');
    return response.data;
  }

  // Get service categories (public endpoint)
  async getCategories(): Promise<ServiceCategory[]> {
    const response = await apiClient.get<{ data: ServiceCategory[] }>('/public/service-categories');
    return response.data || [];
  }

  // Get active staff members (public endpoint)
  async getStaff(): Promise<Staff[]> {
    const response = await apiClient.get<{ data: Staff[] }>('/public/staff');
    return response.data;
  }

  // Check availability for a specific date/service/staff
  async checkAvailability(params: {
    date: string;
    serviceId: string;
    staffId?: string;
  }): Promise<TimeSlot[]> {
    const response = await apiClient.post<{ slots: TimeSlot[] }>(
      '/public/bookings/check-availability',
      params
    );
    return response.slots;
  }

  // Create a new booking
  async createBooking(bookingData: CreateBookingData): Promise<Booking> {
    const formattedData = {
      ...bookingData,
      date: bookingData.date.toISOString().split('T')[0],
    };
    
    const response = await apiClient.post<Booking>('/public/bookings', formattedData);
    return response;
  }

  // Get booking by ID (for confirmation page)
  async getBooking(bookingId: string): Promise<Booking> {
    const response = await apiClient.get<Booking>(`/public/bookings/${bookingId}`);
    return response;
  }

  // Lookup customer by email or phone
  async lookupCustomer(params: { email?: string; phone?: string }): Promise<{
    found: boolean;
    customer?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  }> {
    const response = await apiClient.post('/public/customers/lookup', params);
    return response;
  }
}

export const bookingApi = new BookingApi();
export const publicBookingApi = bookingApi; // Alias for compatibility