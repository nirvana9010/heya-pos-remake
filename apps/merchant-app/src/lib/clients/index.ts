// Export all client types and interfaces
export * from './base-client';
export * from './auth-client';
export * from './bookings-client';
export * from './customers-client';
export * from './services-client';
export * from './staff-client';
export * from './payments-client';
export * from './reports-client';
export * from './locations-client';
export * from './notifications-client';

// Import client classes
import { AuthClient } from './auth-client';
import { BookingsClient } from './bookings-client';
import { CustomersClient } from './customers-client';
import { ServicesClient } from './services-client';
import { StaffClient } from './staff-client';
import { PaymentsClient } from './payments-client';
import { ReportsClient } from './reports-client';
import { LocationsClient } from './locations-client';
import { NotificationsClient } from './notifications-client';

/**
 * Unified API Client - Composition of focused domain clients
 * 
 * This replaces the monolithic api-client.ts with a cleaner, more maintainable structure.
 * Each domain (auth, bookings, etc.) has its own focused client with proper typing.
 */
export class ApiClient {
  public auth: AuthClient;
  public bookings: BookingsClient;
  public customers: CustomersClient;
  public services: ServicesClient;
  public staff: StaffClient;
  public payments: PaymentsClient;
  public reports: ReportsClient;
  public locations: LocationsClient;
  public notifications: NotificationsClient;

  constructor() {
    // Initialize all domain clients
    this.auth = new AuthClient();
    this.bookings = new BookingsClient();
    this.customers = new CustomersClient();
    this.services = new ServicesClient();
    this.staff = new StaffClient();
    this.payments = new PaymentsClient();
    this.reports = new ReportsClient();
    this.locations = new LocationsClient();
    this.notifications = new NotificationsClient();
  }

  // Legacy compatibility methods - delegate to appropriate domain clients
  async login(username: string, password: string, rememberMe?: boolean) {
    return this.auth.login(username, password, rememberMe);
  }

  async verifyAction(pin: string, action: string) {
    return this.auth.verifyAction(pin, action);
  }

  async refreshToken(refreshToken: string) {
    return this.auth.refreshToken(refreshToken);
  }

  async getServices() {
    return this.services.getServices();
  }

  async getCategories() {
    return this.services.getCategories();
  }

  async createCategory(data: any) {
    return this.services.createCategory(data);
  }

  async updateCategory(id: string, data: any) {
    return this.services.updateCategory(id, data);
  }

  async deleteCategory(id: string) {
    return this.services.deleteCategory(id);
  }

  async createService(data: any) {
    return this.services.createService(data);
  }

  async updateService(id: string, data: any) {
    return this.services.updateService(id, data);
  }

  async deleteService(id: string) {
    return this.services.deleteService(id);
  }

  async getCustomers(params?: any) {
    return this.customers.getCustomers(params);
  }

  async searchCustomers(query: string) {
    return this.customers.searchCustomers(query);
  }

  async createCustomer(data: any) {
    return this.customers.createCustomer(data);
  }

  async updateCustomer(id: string, data: any) {
    return this.customers.updateCustomer(id, data);
  }

  async getBookings(params?: any) {
    return this.bookings.getBookings(params);
  }

  async getBooking(id: string) {
    return this.bookings.getBooking(id);
  }

  async createBooking(data: any) {
    console.log('📡 [ApiClient] createBooking called with:', JSON.stringify(data, null, 2));
    return this.bookings.createBooking(data);
  }

  async updateBooking(id: string, data: any) {
    return this.bookings.updateBooking(id, data);
  }

  async rescheduleBooking(id: string, data: { startTime: string; staffId?: string }) {
    return this.bookings.rescheduleBooking(id, data);
  }

  async startBooking(id: string) {
    return this.bookings.startBooking(id);
  }

  async completeBooking(id: string) {
    return this.bookings.completeBooking(id);
  }

  async cancelBooking(id: string, reason: string) {
    return this.bookings.cancelBooking(id, reason);
  }

  async updateBookingStatus(id: string, status: string) {
    console.warn('updateBookingStatus is deprecated. Use specific status methods instead.');
    
    // Map to specific V2 endpoints
    switch (status.toUpperCase()) {
      case 'IN_PROGRESS':
        return this.bookings.startBooking(id);
      case 'COMPLETED':
        return this.bookings.completeBooking(id);
      case 'CANCELLED':
        return this.bookings.cancelBooking(id, 'Status update');
      default:
        throw new Error(`Status "${status}" update not supported. Use specific methods.`);
    }
  }

  async checkAvailability(date: Date, serviceId: string, staffId?: string) {
    return this.bookings.checkAvailability({ date, serviceId, staffId });
  }

  async getStaff() {
    return this.staff.getStaff();
  }

  async createStaff(data: any) {
    return this.staff.createStaff(data);
  }

  async updateStaff(id: string, data: any) {
    return this.staff.updateStaff(id, data);
  }

  async deleteStaff(id: string) {
    return this.staff.deleteStaff(id);
  }

  async getDashboardStats() {
    return this.reports.getDashboardStats();
  }

  async getLocations() {
    return this.locations.getLocations();
  }

  async getLocation(id: string) {
    return this.locations.getLocation(id);
  }

  async updateLocation(id: string, data: any) {
    return this.locations.updateLocation(id, data);
  }

  async updateLocationTimezone(id: string, timezone: string) {
    return this.locations.updateLocationTimezone(id, timezone);
  }

  // Payment methods
  async createOrder(data: { customerId?: string; bookingId?: string }) {
    return this.payments.createOrder(data);
  }

  async createOrderFromBooking(bookingId: string) {
    return this.payments.createOrderFromBooking(bookingId);
  }

  async getOrder(orderId: string) {
    return this.payments.getOrder(orderId);
  }

  async addOrderItems(orderId: string, items: any[]) {
    return this.payments.addOrderItems(orderId, items);
  }

  async addOrderModifier(orderId: string, modifier: any) {
    return this.payments.addOrderModifier(orderId, modifier);
  }

  async updateOrderState(orderId: string, state: string) {
    return this.payments.updateOrderState(orderId, state);
  }

  async processPayment(data: any) {
    return this.payments.processPayment(data);
  }

  async processSplitPayment(data: any) {
    return this.payments.processSplitPayment(data);
  }

  async refundPayment(paymentId: string, amount: number, reason: string) {
    return this.payments.refundPayment({ paymentId, amount, reason });
  }

  async voidPayment(paymentId: string) {
    return this.payments.voidPayment(paymentId);
  }

  async getPayments(params?: { page?: number; limit?: number; locationId?: string }) {
    return this.payments.getPayments(params);
  }

  async getMerchantSettings() {
    return this.locations.getMerchantSettings();
  }

  async getMerchantProfile() {
    return this.locations.getMerchantProfile();
  }

  async getReportOverview(locationId?: string) {
    return this.reports.getReportOverview(locationId);
  }

  async getRevenueStats(locationId?: string) {
    return this.reports.getRevenueStats(locationId);
  }

  async getBookingStats(locationId?: string) {
    return this.reports.getBookingStats(locationId);
  }

  async getCustomerStats() {
    return this.reports.getCustomerStats();
  }

  async getTopServices(limit = 10) {
    return this.reports.getTopServices(limit);
  }

  async getStaffPerformance(limit = 10) {
    return this.reports.getStaffPerformance(limit);
  }

  async getRevenueTrend(days = 30) {
    return this.reports.getRevenueTrend(days);
  }

  // Generic HTTP methods (deprecated - use domain clients directly)
  async get(url: string, config?: any) {
    console.warn('Generic get() method is deprecated. Use domain-specific clients instead.');
    return this.auth.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    console.warn('Generic post() method is deprecated. Use domain-specific clients instead.');
    return this.auth.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    console.warn('Generic put() method is deprecated. Use domain-specific clients instead.');
    return this.auth.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: any) {
    console.warn('Generic patch() method is deprecated. Use domain-specific clients instead.');
    return this.auth.patch(url, data, config);
  }

  async delete(url: string, config?: any) {
    console.warn('Generic delete() method is deprecated. Use domain-specific clients instead.');
    return this.auth.delete(url, config);
  }
}

// Export singleton instance for backward compatibility
export const apiClient = new ApiClient();

// Initialize token management on module load (deferred)
if (typeof window !== 'undefined') {
  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleTokenCheck = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback);
    } else {
      setTimeout(callback, 1);
    }
  };
  
  scheduleTokenCheck(() => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (token && refreshToken) {
      // Check if token is about to expire
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        // If token expires in less than 10 minutes, refresh immediately
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log('[API Client] Token expiring soon, refreshing on load...');
          apiClient.auth.refreshToken(refreshToken).catch(error => {
            console.error('[API Client] Initial token refresh failed:', error);
          });
        }
      } catch (error) {
        console.error('[API Client] Failed to parse token:', error);
      }
    }
  });
}