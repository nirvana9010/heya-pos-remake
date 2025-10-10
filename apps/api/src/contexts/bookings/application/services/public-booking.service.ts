import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { BookingCreationService } from './booking-creation.service';
import { BookingAvailabilityService } from './booking-availability.service';
import { TimezoneUtils } from '../../../../utils/shared/timezone';
import { toNumber } from '../../../../utils/decimal';
import { BookingServiceData } from '../commands/create-booking.command';

export interface PublicCreateBookingData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
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
      include: {
        locations: {
          where: { isActive: true },
          take: 1,
        },
      },
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
    
    // Debug log
    console.error('BOOKING CREATION - Service details:', {
      services: services.map(s => ({ id: s.id, name: s.name, duration: s.duration })),
      totalDuration,
      requestedStartTime: `${dto.date} ${dto.startTime}`,
    });

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

    if (!dto.customerEmail && !dto.customerPhone) {
      throw new Error('Either customer email or phone is required');
    }

    const lookupConditions: Array<Record<string, string>> = [];
    if (dto.customerEmail) {
      lookupConditions.push({ email: dto.customerEmail });
    }
    if (dto.customerPhone) {
      lookupConditions.push({ phone: dto.customerPhone });
      lookupConditions.push({ mobile: dto.customerPhone });
    }

    let customer = lookupConditions.length
      ? await this.prisma.customer.findFirst({
          where: {
            merchantId: merchant.id,
            OR: lookupConditions,
          },
        })
      : null;

    if (!customer) {
      const [firstName, ...lastNameParts] = dto.customerName.split(' ');
      customer = await this.prisma.customer.create({
        data: {
          merchantId: merchant.id,
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || '',
          ...(dto.customerEmail ? { email: dto.customerEmail } : {}),
          ...(dto.customerPhone
            ? { phone: dto.customerPhone, mobile: dto.customerPhone }
            : {}),
        },
      });
    } else {
      // Update customer if they've provided new information
      const updateData: any = {};
      
      // Update email if customer didn't have one before but now provided it
      if (dto.customerEmail && customer.email !== dto.customerEmail) {
        updateData.email = dto.customerEmail;
      }
      
      // Update phone if customer didn't have one before but now provided it
      if (dto.customerPhone) {
        if (customer.phone !== dto.customerPhone) {
          updateData.phone = dto.customerPhone;
        }
        if (customer.mobile !== dto.customerPhone) {
          updateData.mobile = dto.customerPhone;
        }
      }
      
      // Update name if it has changed
      const [firstName, ...lastNameParts] = dto.customerName.split(' ');
      if (firstName !== customer.firstName || lastNameParts.join(' ') !== customer.lastName) {
        updateData.firstName = firstName || '';
        updateData.lastName = lastNameParts.join(' ') || '';
      }
      
      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: updateData,
        });
      }
    }

    // Calculate start and end times using the location's timezone
    const startTime = TimezoneUtils.createDateInTimezone(
      dto.date,
      dto.startTime,
      location.timezone
    );
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Validate that booking is not in the past
    const now = new Date();
    if (startTime < now) {
      throw new Error('Cannot create bookings in the past. Please select a future date and time.');
    }
    
    // Validate booking advance hours with timezone consideration
    const merchantSettings = merchant.settings as any;
    const bookingAdvanceHours = merchantSettings?.bookingAdvanceHours || 168; // Default 7 days
    const minimumBookingNotice = merchantSettings?.minimumBookingNotice || 0; // Default no restriction (in minutes)
    const merchantTimezone = merchant.locations?.[0]?.timezone || 'Australia/Sydney';
    
    // Calculate the time difference in hours and minutes
    const timeDifferenceMs = startTime.getTime() - now.getTime();
    const hoursUntilBooking = timeDifferenceMs / (1000 * 60 * 60);
    const minutesUntilBooking = timeDifferenceMs / (1000 * 60);
    
    // Check if booking is too far in advance
    if (hoursUntilBooking > bookingAdvanceHours) {
      throw new Error(`Bookings can only be made up to ${bookingAdvanceHours > 168 
        ? Math.floor(bookingAdvanceHours / 168) + ' weeks' 
        : bookingAdvanceHours > 24 
        ? Math.floor(bookingAdvanceHours / 24) + ' days'
        : bookingAdvanceHours + ' hours'} in advance`);
    }
    
    // Check minimum booking notice
    if (minimumBookingNotice > 0 && minutesUntilBooking < minimumBookingNotice) {
      let noticeText;
      if (minimumBookingNotice >= 1440) {
        // 24 hours or more
        const days = Math.floor(minimumBookingNotice / 1440);
        noticeText = days === 1 ? '24 hours' : `${days} days`;
      } else if (minimumBookingNotice >= 60) {
        // 1 hour or more
        const hours = Math.floor(minimumBookingNotice / 60);
        noticeText = hours === 1 ? '1 hour' : `${hours} hours`;
      } else {
        // Less than 1 hour
        noticeText = `${minimumBookingNotice} minutes`;
      }
      throw new Error(`Bookings must be made at least ${noticeText} in advance`);
    }
    
    // Legacy check for very short advance booking limits (< 24 hours)
    // This is kept for backward compatibility
    if (bookingAdvanceHours < 24 && hoursUntilBooking < bookingAdvanceHours) {
      throw new Error(`Bookings must be made at least ${bookingAdvanceHours} hours in advance`);
    }
    
    // Check service-specific booking limits
    for (const service of serviceRequests) {
      const serviceDetails = await this.prisma.service.findUnique({
        where: { id: service.serviceId }
      });
      
      if (serviceDetails?.maxAdvanceBooking) {
        const daysUntilBooking = hoursUntilBooking / 24;
        if (daysUntilBooking > serviceDetails.maxAdvanceBooking) {
          throw new Error(`Service "${serviceDetails.name}" can only be booked up to ${serviceDetails.maxAdvanceBooking} days in advance`);
        }
      }
      
      if (serviceDetails?.minAdvanceBooking) {
        if (hoursUntilBooking < serviceDetails.minAdvanceBooking) {
          throw new Error(`Service "${serviceDetails.name}" requires at least ${serviceDetails.minAdvanceBooking} hours advance notice`);
        }
      }
    }

    // Check merchant settings for unassigned bookings
    const allowUnassignedBookings = merchantSettings?.allowUnassignedBookings ?? true;
    
    // Use provided staff or leave unassigned (null) if not specified
    let staffId = dto.staffId || serviceRequests[0].staffId || null;
    
    // If no staff selected and merchant doesn't allow unassigned bookings,
    // we need to find an available staff member
    if (!staffId && !allowUnassignedBookings) {
      // Get all active staff who can provide these services
      const availableStaff = await this.prisma.staff.findMany({
        where: {
          merchantId: merchant.id,
          status: 'ACTIVE',
          NOT: {
            firstName: 'Unassigned',
          },
        },
      });

      if (availableStaff.length === 0) {
        throw new Error('No staff members available for this booking.');
      }

      // Find the first available staff member
      let foundAvailableStaff = false;
      for (const staff of availableStaff) {
        const conflicts = await this.prisma.booking.findMany({
          where: {
            merchantId: merchant.id,
            providerId: staff.id,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } },
            ],
          },
        });

        if (conflicts.length === 0) {
          staffId = staff.id;
          foundAvailableStaff = true;
          console.error('AUTO-ASSIGNED STAFF:', {
            staffId: staff.id,
            staffName: staff.lastName ? `${staff.firstName} ${staff.lastName}` : staff.firstName,
            requestedTime: `${dto.date} ${dto.startTime}`,
            duration: totalDuration,
          });
          break;
        }
      }

      if (!foundAvailableStaff) {
        throw new Error('This time slot is no longer available. All staff members are booked.');
      }
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
      // Check for conflicts only if a staff member is assigned
      if (staffId) {
        const conflicts = await this.prisma.booking.findMany({
          where: {
            merchantId: merchant.id,
            providerId: staffId,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          OR: [
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
              ],
            },
          ],
        },
      });

      if (conflicts.length > 0) {
        console.error('BOOKING CONFLICT:', {
          requestedSlot: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            duration: `${totalDuration} minutes`,
          },
          conflictingBookings: conflicts.map(c => ({
            id: c.id,
            start: c.startTime.toISOString(),
            end: c.endTime.toISOString(),
            provider: c.providerId,
          })),
        });

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
      }

      const bookingServices: BookingServiceData[] = serviceRequests.map(service => ({
        serviceId: service.serviceId,
        staffId: service.staffId || staffId || undefined,
      }));

      const createdBooking = await this.bookingCreationService.createBooking({
        merchantId: merchant.id,
        customerId: customer.id,
        locationId: location.id,
        services: bookingServices,
        staffId: staffId || undefined,
        startTime,
        source: 'ONLINE',
        notes: dto.notes,
        customerRequestedStaff: Boolean(dto.staffId || serviceRequests.some(sr => sr.staffId)),
        createdById: staffId || creatorStaffId,
      });

      // Fetch the complete booking with all relations for the response
      const completeBooking = await this.prisma.booking.findUnique({
        where: { id: createdBooking.id },
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
          ? (completeBooking.provider.lastName 
              ? `${completeBooking.provider.firstName} ${completeBooking.provider.lastName}`
              : completeBooking.provider.firstName)
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
      include: {
        locations: {
          where: { isActive: true },
          take: 1,
        },
      },
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
    
    console.log('[PUBLIC BOOKING SERVICE] Check availability:', {
      date: dto.date,
      staffId: dto.staffId,
      services: services.map(s => ({ id: s.id, name: s.name, duration: s.duration })),
      totalDuration,
    });

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

      // Use first service for the availability check but with total duration
      // This ensures we check for slots that can accommodate all selected services
      console.log('[PUBLIC BOOKING SERVICE] Calling availability service with:', {
        staffId: dto.staffId,
        serviceId: serviceRequests[0].serviceId,
        totalDuration,
        timezone: location.timezone,
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
      });
      
      const slots = await this.bookingAvailabilityService.getAvailableSlots({
        staffId: dto.staffId,
        serviceId: serviceRequests[0].serviceId,
        merchantId: merchant.id,
        startDate,
        endDate,
        timezone: location.timezone,
        // Pass the total duration for multi-service bookings
        duration: totalDuration,
      });
      
      console.log('[PUBLIC BOOKING SERVICE] Availability service returned:', {
        totalSlots: slots.length,
        availableSlots: slots.filter(s => s.available).length,
        lastAvailableSlot: slots.filter(s => s.available).slice(-1)[0]?.startTime,
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
        
        // Skip time slots that are in the past
        const now = new Date();
        if (slotStart < now) {
          continue;
        }
        
        // Skip time slots that don't meet minimum booking notice requirement
        const minimumBookingNotice = (merchant.settings as any)?.minimumBookingNotice || 0;
        if (minimumBookingNotice > 0) {
          const minutesUntilSlot = (slotStart.getTime() - now.getTime()) / (1000 * 60);
          if (minutesUntilSlot < minimumBookingNotice) {
            continue;
          }
        }
        
        // Check which staff are busy during this slot
        const busyStaffIds = new Set<string>();
        existingBookings.forEach(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          // Check if slots overlap: booking starts before slot ends AND ends after slot starts
          const conflicts = (
            bookingStart < slotEnd && bookingEnd > slotStart
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
