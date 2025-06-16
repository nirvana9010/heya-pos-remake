import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BookingCreationService } from './booking-creation.service';
import { BookingAvailabilityService } from './booking-availability.service';
import { TimezoneUtils } from '../../../../utils/shared/timezone';
import { toNumber } from '../../../../utils/decimal';

export interface PublicCreateBookingData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  staffId?: string;
  date: string;
  startTime: string;
  notes?: string;
}

/**
 * PublicBookingService
 * Handles public-facing booking operations using the bounded context
 */
@Injectable()
export class PublicBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingCreationService: BookingCreationService,
    private readonly bookingAvailabilityService: BookingAvailabilityService,
  ) {}

  async createPublicBooking(dto: PublicCreateBookingData) {
    // Get the first active merchant for now (in production, this would be based on domain/subdomain)
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new Error('No active merchant found');
    }

    // Get service details
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        merchantId: merchant.id,
      },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Get first location for merchant
    const location = await this.prisma.location.findFirst({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!location) {
      throw new Error('No active location found');
    }

    // Calculate start and end times using the location's timezone
    const startTime = TimezoneUtils.createDateInTimezone(
      dto.date,
      dto.startTime,
      location.timezone
    );
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration);

    // Create or find customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        merchantId: merchant.id,
        OR: [
          { email: dto.customerEmail },
          { phone: dto.customerPhone },
        ],
      },
    });

    if (!customer) {
      const [firstName, ...lastNameParts] = dto.customerName.split(' ');
      customer = await this.prisma.customer.create({
        data: {
          merchantId: merchant.id,
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || '',
          email: dto.customerEmail,
          phone: dto.customerPhone,
        },
      });
    }

    // Get staff member or use first available
    let staffId = dto.staffId;
    if (!staffId) {
      const firstStaff = await this.prisma.staff.findFirst({
        where: {
          merchantId: merchant.id,
          status: 'ACTIVE',
        },
      });
      staffId = firstStaff?.id;
    }

    if (!staffId) {
      throw new Error('No staff available');
    }

    try {
      // Use booking creation service with double-booking prevention
      const booking = await this.bookingCreationService.createBooking({
        customerId: customer.id,
        staffId: staffId,
        serviceId: service.id,
        locationId: location.id,
        startTime: startTime,
        merchantId: merchant.id,
        notes: dto.notes,
        source: 'ONLINE',
        createdById: staffId, // For public bookings, use the staff as creator
        isOverride: false, // Never allow overrides from public API
      });

      // Fetch the complete booking with all relations for the response
      const completeBooking = await this.prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          services: {
            include: {
              service: true,
            },
          },
          customer: true,
          provider: true,
          location: true,
        },
      });

      if (!completeBooking) {
        throw new Error('Failed to fetch created booking');
      }

      const firstService = completeBooking.services?.[0];
      const serviceName = firstService?.service?.name || service.name;
    
      // Convert the stored UTC times back to the location's timezone for display
      const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(completeBooking.startTime, location.timezone);
      const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(completeBooking.endTime, location.timezone);
      
      return {
        id: completeBooking.id,
        bookingNumber: completeBooking.bookingNumber,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        serviceId: service.id,
        serviceName: serviceName,
        staffId: completeBooking.providerId,
        staffName: `${completeBooking.provider.firstName} ${completeBooking.provider.lastName}`,
        date: startTimeDisplay.date.split('/')[2] + '-' + 
              startTimeDisplay.date.split('/')[1].padStart(2, '0') + '-' + 
              startTimeDisplay.date.split('/')[0].padStart(2, '0'), // Convert DD/MM/YYYY to YYYY-MM-DD
        startTime: startTimeDisplay.time.substring(0, 5), // Remove seconds if present
        endTime: endTimeDisplay.time.substring(0, 5), // Remove seconds if present
        duration: service.duration,
        price: toNumber(service.price),
        status: completeBooking.status,
        notes: completeBooking.notes,
        createdAt: completeBooking.createdAt.toISOString(),
        updatedAt: completeBooking.updatedAt.toISOString(),
      };
    } catch (error: any) {
      if (error.message && error.message.includes('conflicts')) {
        // Return a more user-friendly error for booking conflicts
        throw new ConflictException({
          message: 'This time slot is no longer available. Please choose a different time.',
          conflicts: error.message,
        });
      }
      throw error;
    }
  }

  async checkAvailability(dto: { date: string; serviceId: string; staffId?: string }) {
    // Get the first active merchant for now
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new Error('No active merchant found');
    }

    // Get service to know duration
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        merchantId: merchant.id,
      },
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Get first location for merchant
    const location = await this.prisma.location.findFirst({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!location) {
      throw new Error('No active location found');
    }

    // If staff ID is provided, use availability service to get slots
    if (dto.staffId) {
      const startDate = TimezoneUtils.startOfDayInTimezone(dto.date, location.timezone);
      const endDate = TimezoneUtils.endOfDayInTimezone(dto.date, location.timezone);

      const slots = await this.bookingAvailabilityService.getAvailableSlots({
        staffId: dto.staffId,
        serviceId: dto.serviceId,
        merchantId: merchant.id,
        startDate,
        endDate,
        timezone: location.timezone,
      });

      // Convert to simple time slots for public API
      return {
        slots: slots.map(slot => ({
          time: new Date(slot.startTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: location.timezone,
          }),
          available: slot.available,
        })),
      };
    }

    // If no staff specified, return generic availability
    // Get existing bookings for the date using timezone-aware boundaries
    const startOfDay = TimezoneUtils.startOfDayInTimezone(dto.date, location.timezone);
    const endOfDay = TimezoneUtils.endOfDayInTimezone(dto.date, location.timezone);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        merchantId: merchant.id,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Generate time slots from 9 AM to 5 PM with 30-minute intervals
    const slots = [];
    const startHour = 9;
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if this slot conflicts with existing bookings
        const slotStart = TimezoneUtils.createDateInTimezone(
          dto.date,
          time,
          location.timezone
        );
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);
        
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          return (
            (slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd)
          );
        });
        
        // Check if slot would run past closing time in the location's timezone
        const slotEndDisplay = TimezoneUtils.toTimezoneDisplay(slotEnd, location.timezone);
        const slotEndHour = parseInt(slotEndDisplay.time.split(':')[0]);
        
        // Don't allow slots that would run past closing time
        if (slotEndHour < endHour || (slotEndHour === endHour && slotEnd.getMinutes() === 0)) {
          slots.push({
            time,
            available: !hasConflict,
          });
        }
      }
    }

    return { slots };
  }
}