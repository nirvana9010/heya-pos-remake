// Shared types for all apps

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  accessLevel: number;
  avatar?: string;
}

export interface Merchant {
  id: string;
  merchantCode: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  subscriptionPlan?: 'basic' | 'premium' | 'enterprise';
  logo?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price: number;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  image?: string;
  staffIds?: string[];
  maxAdvanceBooking?: number;
  minAdvanceBooking?: number;
  advanceBookingMode?: 'merchant_default' | 'custom';
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  tags?: string[];
  visitCount: number;
  totalSpent: number;
  lastVisit?: Date;
  createdAt: Date;
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
  categoryName?: string;
}

export interface Booking {
  id: string;
  bookingNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceId: string; // Deprecated - kept for backward compatibility
  serviceName: string; // Deprecated - kept for backward compatibility
  services?: BookingService[]; // Array for multi-service bookings
  staffId: string;
  staffName: string;
  date: Date;
  startTime: string | Date;
  endTime: string | Date;
  duration: number; // Total duration for all services
  price: number; // Deprecated - use totalAmount
  totalAmount?: number; // Total price for all services
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAmount?: number;
  isPaid?: boolean;
  locationName?: string;
  customerRequestedStaff?: boolean;
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'other';
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  transactionId?: string;
  notes?: string;
  createdAt: Date;
  refundedAmount?: number;
  refundedAt?: Date;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'staff';
  pin?: string;
  isActive: boolean;
  workingHours?: WorkingHours;
  services?: string[];
  avatar?: string;
  color?: string;
}

export interface WorkingHours {
  [key: string]: {
    start: string;
    end: string;
    isOpen: boolean;
  };
}

export interface TimeSlot {
  time: string;
  available: boolean;
  staffId?: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayBookings: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  pendingBookings: number;
  completedBookings: number;
  newCustomers: number;
  revenueGrowth: number;
  bookingGrowth: number;
  customerGrowth: number;
}

export interface Report {
  id: string;
  type: 'revenue' | 'bookings' | 'customers' | 'services' | 'staff';
  title: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: any;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  merchantCode: string;
}

export interface PinCredentials {
  staffId: string;
  pin: string;
}
