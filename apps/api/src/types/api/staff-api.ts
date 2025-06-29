import type { Staff, StaffRole, StaffStatus } from '../models';
import type { PaginationParams } from '../common';

export interface CreateStaffRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  pin: string;
  role: StaffRole;
  accessLevel: number;
  permissions: string[];
  calendarColor?: string;
  locationIds: string[];
}

export interface UpdateStaffRequest extends Partial<Omit<CreateStaffRequest, 'email' | 'pin'>> {
  status?: StaffStatus;
  newPin?: string;
}

export interface StaffSearchParams extends PaginationParams {
  locationId?: string;
  role?: StaffRole;
  status?: StaffStatus;
  searchTerm?: string;
}

export interface StaffSchedule {
  staffId: string;
  locationId: string;
  date: Date;
  shifts: {
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  }[];
}

export interface StaffAvailability {
  staffId: string;
  date: Date;
  availableSlots: {
    startTime: string;
    endTime: string;
  }[];
  bookedSlots: {
    startTime: string;
    endTime: string;
    bookingId: string;
  }[];
}