import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { format, addMinutes } from 'date-fns';
import { Prisma } from '@prisma/client';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  conflictReason?: string;
}

export interface CheckAvailabilityData {
  staffId: string;
  serviceId: string;
  merchantId: string;
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

/**
 * BookingAvailabilityService
 * Handles availability checking using the transactional script pattern
 * Provides simple methods that can be composed in transactions
 */
@Injectable()
export class BookingAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
  ) {}

  /**
   * Get available time slots for a staff member and service
   */
  async getAvailableSlots(data: CheckAvailabilityData): Promise<TimeSlot[]> {
    const { staffId, serviceId, merchantId, startDate, endDate, timezone = 'Australia/Sydney' } = data;

    // Get service details including padding
    const service = await this.prisma.service.findFirst({
      where: { 
        id: serviceId,
        merchantId,
      },
    });

    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Get staff member's location and working hours
    const staff = await this.prisma.staff.findFirst({
      where: { 
        id: staffId,
        merchantId,
      },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!staff || staff.locations.length === 0) {
      throw new Error('Staff member not found or not assigned to any location');
    }

    // Use primary location or first location
    const staffLocation = staff.locations.find(sl => sl.isPrimary) || staff.locations[0];
    const location = staffLocation.location;

    // Get existing bookings for the staff member
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        providerId: staffId,
        merchantId,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
        startTime: {
          gte: startDate,
        },
        endTime: {
          lte: endDate,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Generate time slots based on location business hours
    const slots: TimeSlot[] = [];
    const slotDuration = 15; // 15-minute intervals
    const totalServiceDuration = service.duration + service.paddingBefore + service.paddingAfter;

    // For each day in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
      const businessHours = location.businessHours as any;
      const dayHours = businessHours[dayOfWeek];

      if (dayHours && dayHours.open && dayHours.close) {
        // Parse business hours for this day
        const [openHour, openMinute] = dayHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
        
        const openTime = new Date(currentDate);
        openTime.setHours(openHour, openMinute, 0, 0);
        
        const closeTime = new Date(currentDate);
        closeTime.setHours(closeHour, closeMinute, 0, 0);

        // Generate slots for this day
        let slotStart = new Date(openTime);
        while (addMinutes(slotStart, totalServiceDuration) <= closeTime) {
          const slotEnd = addMinutes(slotStart, service.duration);
          const effectiveStart = addMinutes(slotStart, -service.paddingBefore);
          const effectiveEnd = addMinutes(slotEnd, service.paddingAfter);

          // Check if this slot conflicts with any existing booking
          const conflict = this.checkSlotConflict(
            effectiveStart,
            effectiveEnd,
            existingBookings,
          );

          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            available: !conflict.hasConflict,
            conflictReason: conflict.reason,
          });

          // Move to next slot
          slotStart = addMinutes(slotStart, slotDuration);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(
    staffId: string,
    startTime: Date,
    endTime: Date,
    merchantId: string,
    excludeBookingId?: string
  ): Promise<boolean> {
    return this.bookingRepository.isTimeSlotAvailable(
      staffId,
      startTime,
      endTime,
      merchantId,
      excludeBookingId
    );
  }

  /**
   * Check if a slot conflicts with existing bookings
   */
  private checkSlotConflict(
    slotStart: Date,
    slotEnd: Date,
    existingBookings: any[]
  ): { hasConflict: boolean; reason?: string } {
    for (const booking of existingBookings) {
      // Check if the time ranges overlap
      if (
        (slotStart >= booking.startTime && slotStart < booking.endTime) ||
        (slotEnd > booking.startTime && slotEnd <= booking.endTime) ||
        (slotStart <= booking.startTime && slotEnd >= booking.endTime)
      ) {
        return {
          hasConflict: true,
          reason: `Conflicts with booking ${booking.bookingNumber}`,
        };
      }
    }

    return { hasConflict: false };
  }
}