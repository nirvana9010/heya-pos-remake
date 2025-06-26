// Mock data service for all apps
import { 
  User, 
  Merchant, 
  Service, 
  ServiceCategory, 
  Customer, 
  Booking, 
  Payment, 
  Staff,
  DashboardStats,
  TimeSlot
} from '../types';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data
export const mockCategories: ServiceCategory[] = [
  { id: '1', name: 'Hair', description: 'Hair services', color: '#8B4513', icon: '✂️', order: 1 },
  { id: '2', name: 'Nails', description: 'Nail services', color: '#FF69B4', icon: '💅', order: 2 },
  { id: '3', name: 'Facial', description: 'Facial treatments', color: '#98FB98', icon: '🧖‍♀️', order: 3 },
  { id: '4', name: 'Massage', description: 'Massage therapy', color: '#87CEEB', icon: '💆‍♀️', order: 4 },
  { id: '5', name: 'Makeup', description: 'Makeup services', color: '#DDA0DD', icon: '💄', order: 5 },
];

export const mockServices: Service[] = [
  // Hair services
  { id: '1', name: 'Haircut', description: 'Professional haircut', duration: 30, price: 35, categoryId: '1', categoryName: 'Hair', isActive: true },
  { id: '2', name: 'Hair Color', description: 'Full hair coloring', duration: 120, price: 120, categoryId: '1', categoryName: 'Hair', isActive: true },
  { id: '3', name: 'Highlights', description: 'Hair highlights', duration: 90, price: 95, categoryId: '1', categoryName: 'Hair', isActive: true },
  { id: '4', name: 'Blowdry', description: 'Professional blowdry', duration: 45, price: 45, categoryId: '1', categoryName: 'Hair', isActive: true },
  
  // Nail services
  { id: '5', name: 'Manicure', description: 'Classic manicure', duration: 30, price: 25, categoryId: '2', categoryName: 'Nails', isActive: true },
  { id: '6', name: 'Pedicure', description: 'Classic pedicure', duration: 45, price: 35, categoryId: '2', categoryName: 'Nails', isActive: true },
  { id: '7', name: 'Gel Nails', description: 'Gel nail application', duration: 60, price: 55, categoryId: '2', categoryName: 'Nails', isActive: true },
  
  // Facial services
  { id: '8', name: 'Basic Facial', description: 'Deep cleansing facial', duration: 60, price: 70, categoryId: '3', categoryName: 'Facial', isActive: true },
  { id: '9', name: 'Anti-Aging Facial', description: 'Anti-aging treatment', duration: 90, price: 120, categoryId: '3', categoryName: 'Facial', isActive: true },
  
  // Massage services
  { id: '10', name: 'Swedish Massage', description: 'Relaxing full body massage', duration: 60, price: 90, categoryId: '4', categoryName: 'Massage', isActive: true },
  { id: '11', name: 'Deep Tissue Massage', description: 'Therapeutic massage', duration: 60, price: 110, categoryId: '4', categoryName: 'Massage', isActive: true },
  
  // Makeup services
  { id: '12', name: 'Makeup Application', description: 'Professional makeup', duration: 45, price: 65, categoryId: '5', categoryName: 'Makeup', isActive: true },
  { id: '13', name: 'Bridal Makeup', description: 'Special occasion makeup', duration: 90, price: 150, categoryId: '5', categoryName: 'Makeup', isActive: false },
];

export const mockStaff: Staff[] = [
  { id: '1', name: 'Emma Wilson', email: 'emma@hamiltonbeauty.com', phone: '555-0101', role: 'manager', isActive: true, services: ['1', '2', '3', '4'], color: '#FF6B6B' },
  { id: '2', name: 'James Brown', email: 'james@hamiltonbeauty.com', phone: '555-0102', role: 'staff', isActive: true, services: ['5', '6', '7'], color: '#4ECDC4' },
  { id: '3', name: 'Sarah Davis', email: 'sarah@hamiltonbeauty.com', phone: '555-0103', role: 'staff', isActive: true, services: ['8', '9'], color: '#45B7D1' },
  { id: '4', name: 'Michael Chen', email: 'michael@hamiltonbeauty.com', phone: '555-0104', role: 'staff', isActive: true, services: ['10', '11'], color: '#96CEB4' },
  { id: '5', name: 'Lisa Johnson', email: 'lisa@hamiltonbeauty.com', phone: '555-0105', role: 'staff', isActive: true, services: ['12', '13'], color: '#DDA0DD' },
];

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0201', visitCount: 12, totalSpent: 840, lastVisit: new Date('2024-01-15'), createdAt: new Date('2023-06-01'), status: 'active', tags: ['VIP', 'Regular'] },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', phone: '555-0202', visitCount: 5, totalSpent: 325, lastVisit: new Date('2024-01-10'), createdAt: new Date('2023-09-15'), status: 'active' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', phone: '555-0203', visitCount: 8, totalSpent: 560, lastVisit: new Date('2024-01-20'), createdAt: new Date('2023-07-20'), status: 'active' },
  { id: '4', name: 'David Brown', email: 'david@example.com', phone: '555-0204', visitCount: 3, totalSpent: 195, lastVisit: new Date('2023-12-28'), createdAt: new Date('2023-10-10'), status: 'active' },
  { id: '5', name: 'Eva Martinez', email: 'eva@example.com', phone: '555-0205', visitCount: 15, totalSpent: 1250, lastVisit: new Date('2024-01-22'), createdAt: new Date('2023-04-05'), status: 'active', tags: ['VIP'] },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

export const mockBookings: Booking[] = [
  // Today's bookings
  { id: '1', customerId: '1', customerName: 'Alice Johnson', customerPhone: '555-0201', customerEmail: 'alice@example.com', serviceId: '1', serviceName: 'Haircut', staffId: '1', staffName: 'Emma Wilson', date: today, startTime: '09:00', endTime: '09:30', duration: 30, price: 35, status: 'confirmed', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', customerId: '2', customerName: 'Bob Smith', customerPhone: '555-0202', customerEmail: 'bob@example.com', serviceId: '5', serviceName: 'Manicure', staffId: '2', staffName: 'James Brown', date: today, startTime: '10:00', endTime: '10:30', duration: 30, price: 25, status: 'in-progress', createdAt: new Date(), updatedAt: new Date() },
  { id: '3', customerId: '3', customerName: 'Carol Williams', customerPhone: '555-0203', customerEmail: 'carol@example.com', serviceId: '8', serviceName: 'Basic Facial', staffId: '3', staffName: 'Sarah Davis', date: today, startTime: '11:00', endTime: '12:00', duration: 60, price: 70, status: 'pending', createdAt: new Date(), updatedAt: new Date() },
  
  // Tomorrow's bookings
  { id: '4', customerId: '4', customerName: 'David Brown', customerPhone: '555-0204', customerEmail: 'david@example.com', serviceId: '10', serviceName: 'Swedish Massage', staffId: '4', staffName: 'Michael Chen', date: tomorrow, startTime: '14:00', endTime: '15:00', duration: 60, price: 90, status: 'confirmed', createdAt: new Date(), updatedAt: new Date() },
  { id: '5', customerId: '5', customerName: 'Eva Martinez', customerPhone: '555-0205', customerEmail: 'eva@example.com', serviceId: '12', serviceName: 'Makeup Application', staffId: '5', staffName: 'Lisa Johnson', date: tomorrow, startTime: '16:00', endTime: '16:45', duration: 45, price: 65, status: 'confirmed', createdAt: new Date(), updatedAt: new Date() },
];

export const mockPayments: Payment[] = [
  { id: '1', bookingId: '1', customerId: '1', customerName: 'Alice Johnson', amount: 35, method: 'card', status: 'completed', createdAt: new Date('2024-01-15'), transactionId: 'TXN001' },
  { id: '2', bookingId: '2', customerId: '2', customerName: 'Bob Smith', amount: 25, method: 'cash', status: 'completed', createdAt: new Date('2024-01-15') },
  { id: '3', bookingId: '3', customerId: '3', customerName: 'Carol Williams', amount: 70, method: 'card', status: 'pending', createdAt: new Date('2024-01-15'), transactionId: 'TXN003' },
  { id: '4', bookingId: '4', customerId: '4', customerName: 'David Brown', amount: 90, method: 'bank_transfer', status: 'completed', createdAt: new Date('2024-01-10'), transactionId: 'TXN004' },
  { id: '5', bookingId: '5', customerId: '5', customerName: 'Eva Martinez', amount: 65, method: 'card', status: 'refunded', createdAt: new Date('2024-01-08'), transactionId: 'TXN005', refundedAmount: 65, refundedAt: new Date('2024-01-09') },
];

export const mockMerchants: Merchant[] = [
  { id: '1', merchantCode: 'HAMILTON', businessName: 'Hamilton Beauty Salon', email: 'admin@hamiltonbeauty.com', phone: '555-0100', address: '123 Main St, Hamilton', status: 'active', createdAt: new Date('2023-01-01'), updatedAt: new Date(), subscriptionPlan: 'premium' },
  { id: '2', merchantCode: 'BELLA', businessName: 'Bella Spa & Wellness', email: 'info@bellaspa.com', phone: '555-0200', address: '456 Oak Ave, Westside', status: 'active', createdAt: new Date('2023-03-15'), updatedAt: new Date(), subscriptionPlan: 'basic' },
  { id: '3', merchantCode: 'LUXE', businessName: 'Luxe Beauty Studio', email: 'contact@luxebeauty.com', phone: '555-0300', address: '789 Elm Rd, Downtown', status: 'inactive', createdAt: new Date('2023-05-20'), updatedAt: new Date(), subscriptionPlan: 'enterprise' },
];

// Mock API functions
export const mockApi = {
  // Auth
  async login(email: string, password: string, merchantCode: string): Promise<{ token: string; merchant: Merchant }> {
    await delay(1000);
    
    if (merchantCode === 'HAMILTON' && email === 'admin@hamiltonbeauty.com' && password === 'demo123') {
      return {
        token: 'mock-jwt-token',
        merchant: mockMerchants[0]
      };
    }
    
    throw new Error('Invalid credentials');
  },

  async verifyPin(pin: string): Promise<User> {
    await delay(500);
    
    const pinUsers: Record<string, User> = {
      '1234': { id: '1', name: 'Emma Wilson', email: 'emma@hamiltonbeauty.com', role: 'manager', accessLevel: 2 },
      '5678': { id: '2', name: 'James Brown', email: 'james@hamiltonbeauty.com', role: 'staff', accessLevel: 1 },
      '9999': { id: '3', name: 'Test Owner', email: 'owner@hamiltonbeauty.com', role: 'owner', accessLevel: 3 }
    };
    
    const user = pinUsers[pin];
    if (user) return user;
    
    throw new Error('Invalid PIN');
  },

  // Services
  async getServices(): Promise<Service[]> {
    await delay(500);
    return mockServices;
  },

  async getCategories(): Promise<ServiceCategory[]> {
    await delay(300);
    return mockCategories;
  },

  async createService(data: Partial<Service>): Promise<Service> {
    await delay(800);
    const newService: Service = {
      id: Date.now().toString(),
      name: data.name || '',
      description: data.description,
      duration: data.duration || 30,
      price: data.price || 0,
      categoryId: data.categoryId || '1',
      categoryName: mockCategories.find(c => c.id === data.categoryId)?.name || 'Other',
      isActive: data.isActive !== false,
    };
    mockServices.push(newService);
    return newService;
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    await delay(600);
    const index = mockServices.findIndex(s => s.id === id);
    if (index !== -1) {
      mockServices[index] = { ...mockServices[index], ...data };
      return mockServices[index];
    }
    throw new Error('Service not found');
  },

  async deleteService(id: string): Promise<void> {
    await delay(500);
    const index = mockServices.findIndex(s => s.id === id);
    if (index !== -1) {
      mockServices.splice(index, 1);
    }
  },

  // Customers
  async getCustomers(params?: { limit?: number; page?: number; search?: string }): Promise<{
    data: Customer[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    await delay(500);
    const limit = params?.limit || 20;
    const page = params?.page || 1;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    let filteredCustomers = mockCustomers;
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredCustomers = mockCustomers.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.phone.includes(params.search)
      );
    }
    
    return {
      data: filteredCustomers.slice(start, end),
      meta: {
        total: filteredCustomers.length,
        page,
        limit,
        totalPages: Math.ceil(filteredCustomers.length / limit)
      }
    };
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    await delay(800);
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      notes: data.notes,
      tags: data.tags || [],
      visitCount: 0,
      totalSpent: 0,
      createdAt: new Date(),
      status: 'active',
    };
    mockCustomers.push(newCustomer);
    return newCustomer;
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    await delay(600);
    const index = mockCustomers.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCustomers[index] = { ...mockCustomers[index], ...data };
      return mockCustomers[index];
    }
    throw new Error('Customer not found');
  },

  // Bookings
  async getBookings(date?: Date): Promise<Booking[]> {
    await delay(500);
    if (date) {
      return mockBookings.filter(b => 
        b.date.toDateString() === date.toDateString()
      );
    }
    return mockBookings;
  },

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    await delay(1000);
    const newBooking: Booking = {
      id: Date.now().toString(),
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      customerEmail: data.customerEmail || '',
      serviceId: data.serviceId || '',
      serviceName: data.serviceName || '',
      staffId: data.staffId || '',
      staffName: data.staffName || '',
      date: data.date || new Date(),
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '10:00',
      duration: data.duration || 60,
      price: data.price || 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockBookings.push(newBooking);
    return newBooking;
  },

  async getBooking(id: string): Promise<Booking> {
    await delay(300);
    const booking = mockBookings.find(b => b.id === id);
    if (booking) {
      return booking;
    }
    throw new Error('Booking not found');
  },

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    await delay(600);
    const index = mockBookings.findIndex(b => b.id === id);
    if (index !== -1) {
      mockBookings[index] = { ...mockBookings[index], ...data, updatedAt: new Date() };
      return mockBookings[index];
    }
    throw new Error('Booking not found');
  },

  async updateBookingStatus(id: string, status: Booking['status']): Promise<Booking> {
    await delay(500);
    const index = mockBookings.findIndex(b => b.id === id);
    if (index !== -1) {
      mockBookings[index].status = status;
      mockBookings[index].updatedAt = new Date();
      return mockBookings[index];
    }
    throw new Error('Booking not found');
  },

  async getAvailableSlots(date: Date, serviceId: string, staffId?: string): Promise<TimeSlot[]> {
    await delay(700);
    const slots: TimeSlot[] = [];
    const hours = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
    
    for (const time of hours) {
      // Randomly make some slots unavailable
      slots.push({
        time,
        available: Math.random() > 0.3,
        staffId: staffId || mockStaff[Math.floor(Math.random() * mockStaff.length)].id
      });
    }
    
    return slots;
  },

  // Payments
  async getPayments(): Promise<Payment[]> {
    await delay(500);
    return mockPayments;
  },

  async processRefund(paymentId: string, amount: number): Promise<Payment> {
    await delay(1000);
    const index = mockPayments.findIndex(p => p.id === paymentId);
    if (index !== -1) {
      mockPayments[index].status = 'refunded';
      mockPayments[index].refundedAmount = amount;
      mockPayments[index].refundedAt = new Date();
      return mockPayments[index];
    }
    throw new Error('Payment not found');
  },

  // Staff
  async getStaff(): Promise<Staff[]> {
    await delay(500);
    return mockStaff;
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    await delay(800);
    return {
      todayRevenue: 2340,
      todayBookings: 12,
      weeklyRevenue: 15680,
      monthlyRevenue: 68420,
      pendingBookings: 3,
      completedBookings: 145,
      newCustomers: 28,
      revenueGrowth: 12.5,
      bookingGrowth: 8.3,
      customerGrowth: 15.2,
    };
  },

  // Admin specific
  async getMerchants(): Promise<Merchant[]> {
    await delay(500);
    return mockMerchants;
  },

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant> {
    await delay(600);
    const index = mockMerchants.findIndex(m => m.id === id);
    if (index !== -1) {
      mockMerchants[index] = { ...mockMerchants[index], ...data, updatedAt: new Date() };
      return mockMerchants[index];
    }
    throw new Error('Merchant not found');
  },

  async getUsers(): Promise<User[]> {
    await delay(500);
    return mockStaff.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      accessLevel: s.role === 'owner' ? 3 : s.role === 'manager' ? 2 : 1,
    }));
  },
};