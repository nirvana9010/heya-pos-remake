import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingRepository } from './booking.repository';
import { Prisma } from '@prisma/client';
import { 
  addMinutes, 
  startOfDay, 
  endOfDay, 
  isWithinInterval,
  areIntervalsOverlapping,
  format,
  parseISO
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  conflictReason?: string;
}

export interface CheckAvailabilityDto {
  staffId: string;
  serviceId: string;
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

export interface CreateBookingWithLockDto {
  staffId: string;
  serviceId: string;
  customerId: string;
  startTime: Date;
  locationId: string;
  merchantId: string;
  notes?: string;
  source?: string;
  createdById: string;
  isOverride?: boolean;
  overrideReason?: string;
  overrideApprovedBy?: string;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private prisma: PrismaService,
    private bookingRepository: BookingRepository
  ) {}

  /**
   * Get available time slots for a staff member and service
   */
  async getAvailableSlots(dto: CheckAvailabilityDto): Promise<TimeSlot[]> {
    const { staffId, serviceId, startDate, endDate, timezone = 'Australia/Sydney' } = dto;

    // Get service details including padding
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new BadRequestException('Service not found');
    }

    // Get staff member's location and working hours
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!staff || staff.locations.length === 0) {
      throw new BadRequestException('Staff member not found or not assigned to any location');
    }

    // Use primary location or first location
    const staffLocation = staff.locations.find(sl => sl.isPrimary) || staff.locations[0];
    const location = staffLocation.location;

    // Get existing bookings for the staff member
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        providerId: staffId,
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
      include: {
        services: {
          include: {
            service: true,
          },
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
        // Convert business hours to UTC
        const openTime = this.parseBusinessTime(currentDate, dayHours.open, timezone);
        const closeTime = this.parseBusinessTime(currentDate, dayHours.close, timezone);

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

          slotStart = addMinutes(slotStart, slotDuration);
        }
      }

      currentDate = addMinutes(currentDate, 24 * 60);
    }

    return slots;
  }

  /**
   * Create a booking with pessimistic locking to prevent double bookings
   * Now delegates to BookingRepository for the actual transaction logic
   */
  async createBookingWithLock(dto: CreateBookingWithLockDto) {
    const { 
      staffId, 
      serviceId, 
      customerId, 
      startTime, 
      locationId,
      merchantId,
      notes,
      source = 'ONLINE',
      createdById,
      isOverride = false,
      overrideReason,
      overrideApprovedBy
    } = dto;

    // Get service details to calculate end time
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new BadRequestException('Service not found');
    }

    const endTime = addMinutes(startTime, service.duration);

    // Delegate to the repository which encapsulates all the transaction and locking logic
    return this.bookingRepository.createWithLock({
      staffId,
      serviceId,
      customerId,
      startTime,
      endTime,
      locationId,
      merchantId,
      notes,
      source,
      createdById,
      isOverride,
      overrideReason,
    }, merchantId);
  }

  /**
   * Check if a time slot conflicts with existing bookings
   */
  private checkSlotConflict(
    effectiveStart: Date,
    effectiveEnd: Date,
    existingBookings: any[]
  ): { hasConflict: boolean; reason?: string } {
    for (const booking of existingBookings) {
      // Get the service padding for existing booking
      const existingService = booking.services[0]?.service;
      if (existingService) {
        const existingEffectiveStart = addMinutes(
          booking.startTime, 
          -existingService.paddingBefore
        );
        const existingEffectiveEnd = addMinutes(
          booking.endTime,
          existingService.paddingAfter
        );

        // Check if the effective periods overlap
        if (areIntervalsOverlapping(
          { start: effectiveStart, end: effectiveEnd },
          { start: existingEffectiveStart, end: existingEffectiveEnd }
        )) {
          return {
            hasConflict: true,
            reason: `Conflicts with booking ${booking.bookingNumber}`,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * Parse business hours time string to UTC date
   */
  private parseBusinessTime(date: Date, timeStr: string, timezone: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);
    
    // Convert from local timezone to UTC
    return fromZonedTime(localDate, timezone);
  }
}