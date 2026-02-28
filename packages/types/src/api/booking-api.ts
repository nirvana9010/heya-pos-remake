import type { Booking, BookingStatus, BookingSource } from "../models";
import type { PaginationParams } from "../common";

export interface CreateBookingRequest {
  locationId: string;
  customerId: string;
  providerId: string;
  startTime: Date;
  services: {
    serviceId: string;
    staffId?: string;
    price?: number;
    duration?: number;
  }[];
  notes?: string;
  source: BookingSource;
  sendConfirmation?: boolean;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  startTime?: Date;
  endTime?: Date;
  providerId?: string;
  notes?: string;
  services?: {
    serviceId: string;
    staffId?: string;
    price?: number;
    duration?: number;
  }[];
}

export interface CancelBookingRequest {
  reason: string;
  staffPin?: string;
}

export interface BookingSearchParams extends PaginationParams {
  locationId?: string;
  customerId?: string;
  providerId?: string;
  status?: BookingStatus;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

export interface BookingAvailabilityRequest {
  locationId: string;
  serviceId: string;
  providerId?: string;
  date: Date;
  duration: number;
}

export interface BookingAvailabilityResponse {
  date: Date;
  availableSlots: {
    time: string;
    available: boolean;
    providers: string[];
  }[];
}
