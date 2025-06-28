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
  // Support both single service (backward compatibility) and multiple services
  serviceId?: string;
  staffId?: string;
  // New fields for multiple services
  services?: Array<{
    serviceId: string;
    staffId?: string;
  }>;
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

  async createPublicBooking(dto: PublicCreateBookingData, merchantId: string) {
    // Verify merchant exists and is active
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || merchant.status !== 'ACTIVE') {
      throw new Error('Merchant not found or not active');
    }


    // Normalize input to support both single and multiple services
    const serviceRequests = dto.services || [
      { serviceId: dto.serviceId!, staffId: dto.staffId },
    ];

    if (serviceRequests.length === 0) {
      throw new Error('At least one service must be selected');
    }

    // Get all service details
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceRequests.map(s => s.serviceId) },
        merchantId: merchant.id,
      },
    });

    if (services.length !== serviceRequests.length) {
      throw new Error('One or more services not found');
    }

    // Calculate total duration and price
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
    const totalPrice = services.reduce((sum, service) => sum + toNumber(service.price), 0);

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
    endTime.setMinutes(endTime.getMinutes() + totalDuration);

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

    // Check merchant settings for unassigned bookings
    const merchantSettings = merchant.settings as any;
    const allowUnassignedBookings = merchantSettings?.allowUnassignedBookings ?? true;
    
    // Use provided staff or leave unassigned (null) if not specified
    const staffId = dto.staffId || serviceRequests[0].staffId || null;
    
    // Validate staff assignment based on merchant settings
    if (!staffId && !allowUnassignedBookings) {
      throw new Error('This business requires staff selection for all bookings. Please select a specific staff member.');
    }
    
    // For the createdBy field (which is required), we need any active staff
    // This doesn't mean the booking is assigned to them - it's just for audit purposes
    const anyActiveStaff = await this.prisma.staff.findFirst({
      where: {
        merchantId: merchant.id,
        status: 'ACTIVE',
        // Exclude the unassigned user if it exists
        NOT: {
          firstName: 'Unassigned',
        },
      },
      orderBy: {
        createdAt: 'asc', // Use the oldest staff member (likely the owner)
      },
    });

    if (!anyActiveStaff) {
      // Log for debugging
      const allStaff = await this.prisma.staff.findMany({
        where: { merchantId: merchant.id },
        select: { id: true, firstName: true, status: true },
      });
      throw new Error('No active staff available in the system');
    }

    // Store the creator ID to use in the transaction
    const creatorStaffId = anyActiveStaff.id;

    try {
      // For multiple services, create booking directly with transaction
      const booking = await this.prisma.$transaction(async (tx) => {
        // Check for conflicts only if a staff member is assigned
        const conflicts = staffId ? await tx.booking.findMany({
          where: {
            merchantId: merchant.id,
            providerId: staffId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            OR: [
              { 
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gt: startTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gte: endTime } },
                ],
              },
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { endTime: { lte: endTime } },
                ],
              },
            ],
          },
        }) : [];

        if (conflicts.length > 0) {
          throw new ConflictException({
            message: 'This time slot is no longer available. Please choose a different time.',
            conflicts: conflicts.map(c => ({
              id: c.id,
              startTime: c.startTime,
              endTime: c.endTime,
              status: c.status,
            })),
          });
        }

        // Generate booking number
        const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase();

        // Create the booking
        const bookingData: any = {
          merchantId: merchant.id,
          locationId: location.id,
          customerId: customer.id,
          bookingNumber,
          status: 'CONFIRMED',
          startTime,
          endTime,
          totalAmount: totalPrice,
          depositAmount: 0,
          source: 'ONLINE',
          notes: dto.notes,
        };
        
        // For online bookings, we need a creator even if no staff is assigned
        // Use the provided staff ID, or use any active staff as creator (for audit purposes only)
        bookingData.createdById = staffId || creatorStaffId;
        
        // Only set provider if staffId is provided (can be null for unassigned)
        if (staffId) {
          bookingData.providerId = staffId;
        }
        
        const newBooking = await tx.booking.create({
          data: bookingData,
        });

        // Create booking services
        let currentStartTime = new Date(startTime);
        for (let i = 0; i < services.length; i++) {
          const service = services[i];
          const serviceRequest = serviceRequests.find(sr => sr.serviceId === service.id);
          const serviceStaffId = serviceRequest?.staffId || staffId;
          
          await tx.bookingService.create({
            data: {
              bookingId: newBooking.id,
              serviceId: service.id,
              staffId: serviceStaffId,
              price: toNumber(service.price),
              duration: service.duration,
            },
          });
          
          currentStartTime = new Date(currentStartTime.getTime() + service.duration * 60 * 1000);
        }

        return newBooking;
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

      // Get booking duration from services
      const bookingDuration = completeBooking.services.reduce((sum, bs) => sum + bs.duration, 0);
    
      // Convert the stored UTC times back to the location's timezone for display
      const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(completeBooking.startTime, location.timezone);
      const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(completeBooking.endTime, location.timezone);
      
      return {
        id: completeBooking.id,
        bookingNumber: completeBooking.bookingNumber,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        serviceId: serviceRequests.length === 1 ? serviceRequests[0].serviceId : undefined,
        serviceName: serviceRequests.length === 1 ? services[0].name : undefined,
        services: completeBooking.services.map(bs => ({
          id: bs.service.id,
          name: bs.service.name,
          price: toNumber(bs.price),
          duration: bs.duration,
          staffId: bs.staffId,
        })),
        staffId: completeBooking.providerId,
        staffName: completeBooking.provider 
          ? `${completeBooking.provider.firstName} ${completeBooking.provider.lastName}`
          : 'Unassigned',
        date: startTimeDisplay.date.split('/')[2] + '-' + 
              startTimeDisplay.date.split('/')[1].padStart(2, '0') + '-' + 
              startTimeDisplay.date.split('/')[0].padStart(2, '0'), // Convert DD/MM/YYYY to YYYY-MM-DD
        startTime: startTimeDisplay.time.substring(0, 5), // Remove seconds if present
        endTime: endTimeDisplay.time.substring(0, 5), // Remove seconds if present
        duration: bookingDuration,
        price: toNumber(completeBooking.totalAmount),
        totalPrice: toNumber(completeBooking.totalAmount),
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

  async checkAvailability(
    dto: { date: string; serviceId?: string; staffId?: string; services?: Array<{ serviceId: string; staffId?: string }> },
    merchantId: string
  ) {
    // Verify merchant exists and is active
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || merchant.status !== 'ACTIVE') {
      throw new Error('Merchant not found or not active');
    }

    // Normalize input to support both single and multiple services
    const serviceRequests = dto.services || [
      { serviceId: dto.serviceId!, staffId: dto.staffId },
    ];

    if (serviceRequests.length === 0) {
      throw new Error('At least one service must be selected');
    }

    // Get all service details
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceRequests.map(s => s.serviceId) },
        merchantId: merchant.id,
      },
    });

    if (services.length !== serviceRequests.length) {
      throw new Error('One or more services not found');
    }

    // Calculate total duration
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);

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

      // For now, check availability for the first service only
      // TODO: Implement proper multi-service availability checking
      const slots = await this.bookingAvailabilityService.getAvailableSlots({
        staffId: dto.staffId,
        serviceId: serviceRequests[0].serviceId,
        merchantId: merchant.id,
        startDate,
        endDate,
        timezone: location.timezone,
      });

      // Convert to simple time slots for public API
      return {
        slots: slots.map(slot => {
          let time = slot.startTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: location.timezone,
          });
          
          // Fix the "24:xx" issue - convert to "00:xx"
          if (time.startsWith('24:')) {
            time = '00:' + time.substring(3);
          }
          
          return {
            time,
            available: slot.available,
          };
        }),
      };
    }

    // If no staff specified, check availability across all staff
    // Get existing bookings for the date using timezone-aware boundaries
    const startOfDay = TimezoneUtils.startOfDayInTimezone(dto.date, location.timezone);
    const endOfDay = TimezoneUtils.endOfDayInTimezone(dto.date, location.timezone);

    // Get all active staff members
    // TODO: Add filtering for staff who can provide this specific service
    const activeStaff = await this.prisma.staff.findMany({
      where: {
        merchantId: merchant.id,
        status: 'ACTIVE',
      },
    });

    // Get all bookings for these staff members on this date
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        merchantId: merchant.id,
        providerId: {
          in: activeStaff.map(s => s.id),
        },
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
        slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
        
        // Check which staff are busy during this slot
        const busyStaffIds = new Set<string>();
        existingBookings.forEach(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          const conflicts = (
            (slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd)
          );
          
          if (conflicts && booking.providerId) {
            busyStaffIds.add(booking.providerId);
          }
        });
        
        // Slot is available if at least one staff member is free
        const availableStaffCount = activeStaff.length - busyStaffIds.size;
        const isAvailable = availableStaffCount > 0;
        
        // Check if slot would run past closing time in the location's timezone
        const slotEndDisplay = TimezoneUtils.toTimezoneDisplay(slotEnd, location.timezone);
        const slotEndHour = parseInt(slotEndDisplay.time.split(':')[0]);
        
        // Don't allow slots that would run past closing time
        if (slotEndHour < endHour || (slotEndHour === endHour && slotEnd.getMinutes() === 0)) {
          slots.push({
            time,
            available: isAvailable,
          });
        }
      }
    }

    return { slots };
  }
}