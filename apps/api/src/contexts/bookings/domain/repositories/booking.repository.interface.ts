import { Booking } from "../entities/booking.entity";

/**
 * Domain Repository Interface for Bookings
 * This interface defines the contract for persistence operations
 * without coupling to any specific database or ORM
 */
export interface IBookingRepository {
  /**
   * Lock a staff member for update to prevent concurrent bookings
   * This should be called within a transaction
   */
  lockStaff(staffId: string, merchantId: string, tx?: any): Promise<void>;

  /**
   * Save a booking entity
   * This handles all the persistence logic for creating a booking
   */
  save(booking: Booking, tx?: any, services?: any[]): Promise<Booking>;
  /**
   * Find a booking by its ID
   */
  findById(id: string, merchantId: string): Promise<Booking | null>;

  /**
   * Find bookings by various criteria
   */
  findMany(criteria: {
    merchantId: string;
    staffId?: string;
    customerId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    bookings: Booking[];
    total: number;
  }>;

  /**
   * Update a booking
   */
  update(booking: Booking, tx?: any): Promise<Booking>;

  /**
   * Delete a booking (soft delete)
   */
  delete(id: string, merchantId: string): Promise<void>;

  /**
   * Check if a time slot is available
   */
  isTimeSlotAvailable(
    staffId: string,
    startTime: Date,
    endTime: Date,
    merchantId: string,
    excludeBookingId?: string,
  ): Promise<boolean>;

  /**
   * Find conflicting bookings for a given time slot
   */
  findConflictingBookings(
    staffId: string,
    startTime: Date,
    endTime: Date,
    merchantId: string,
    excludeBookingId?: string,
    tx?: any,
  ): Promise<Booking[]>;
}
