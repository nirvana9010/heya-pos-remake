export interface Booking {
  id: string;
  merchantId: string;
  locationId: string;
  customerId: string;
  bookingNumber: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  depositAmount: number;
  notes?: string;
  cancellationReason?: string;
  source: BookingSource;
  createdById: string;
  providerId: string;
  reminderSent: boolean;
  confirmedAt?: Date;
  checkedInAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  services: BookingService[];
  customer?: Customer;
  provider?: Staff;
  createdBy?: Staff;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingService {
  id: string;
  bookingId: string;
  serviceId: string;
  price: number;
  duration: number;
  staffId: string;
  service?: Service;
  staff?: Staff;
  createdAt: Date;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum BookingSource {
  ONLINE = 'ONLINE',
  WALK_IN = 'WALK_IN',
  PHONE = 'PHONE',
  POS = 'POS',
  ADMIN = 'ADMIN',
  MANUAL = 'MANUAL'
}

// Keeping BookingItem for backward compatibility with utils
export interface BookingItem {
  id: string;
  bookingId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  quantity: number;
  discount: number;
  taxAmount: number;
  total: number;
  duration: number;
  staffId?: string;
  notes?: string;
  service?: Service;
  createdAt: Date;
  updatedAt: Date;
}

import type { Customer, Staff, Service } from './';