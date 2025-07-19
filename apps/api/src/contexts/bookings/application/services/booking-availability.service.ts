import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { format, addMinutes } from 'date-fns';
import { TimezoneUtils } from '../../../../utils/shared/timezone';
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
  timezone: string; // Required - must come from location settings
  duration?: number; // Optional: override service duration for multi-service bookings
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
      const { staffId, serviceId, merchantId, startDate, endDate, timezone } = data;
  
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
  
      // Get staff member
      const staff = await this.prisma.staff.findFirst({
        where: { 
          id: staffId,
          merchantId,
        },
      });
  
      if (!staff) {
        throw new Error('Staff member not found');
      }
  
      // Get merchant for business hours and timezone
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          settings: true,
        },
      });
  
      if (!merchant || !merchant.settings) {
        throw new Error('Merchant settings not found');
      }
  
      const merchantSettings = merchant.settings as any;
      const businessHours = merchantSettings.businessHours;
      const minimumBookingNotice = merchantSettings?.minimumBookingNotice || 0;
      
      if (!businessHours) {
        throw new Error('Business hours not configured');
      }
  
      // Get existing bookings for the staff member
      // Fix: Use proper overlap detection instead of incorrect endTime filter
      const existingBookings = await this.prisma.booking.findMany({
        where: {
          providerId: staffId,
          merchantId,
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
          // A booking overlaps with our date range if:
          // - It starts before our range ends AND
          // - It ends after our range starts
          startTime: {
            lt: endDate,
          },
          endTime: {
            gt: startDate,
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });
  
      // Get staff schedules (no longer location-specific)
      const staffSchedules = await this.prisma.staffSchedule.findMany({
        where: {
          staffId: staffId,
        },
      });
  
      // Get schedule overrides for the date range
      const scheduleOverrides = await this.prisma.scheduleOverride.findMany({
        where: {
          staffId: staffId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
  
      // Create a map of schedules by day of week
      const scheduleMap = new Map<number, { startTime: string; endTime: string }>();
      staffSchedules.forEach(schedule => {
        scheduleMap.set(schedule.dayOfWeek, {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        });
      });
  
      // Create a map of overrides by date
      const overrideMap = new Map<string, { startTime: string | null; endTime: string | null }>();
      scheduleOverrides.forEach(override => {
        const dateStr = override.date.toISOString().split('T')[0];
        overrideMap.set(dateStr, {
          startTime: override.startTime,
          endTime: override.endTime,
        });
      });
  
      // Generate time slots based on location business hours
      const slots: TimeSlot[] = [];
      const slotDuration = 15; // 15-minute intervals
      // Use provided duration (for multi-service bookings) or default to service duration
      const baseDuration = data.duration || service.duration;
      const totalServiceDuration = baseDuration + service.paddingBefore + service.paddingAfter;
      
      // Debug logging
      console.error('SERVICE AVAILABILITY CHECK:', {
        serviceId: service.id,
        baseDuration,
        paddingBefore: service.paddingBefore,
        paddingAfter: service.paddingAfter,
        totalServiceDuration,
        requestedDuration: data.duration
      });
  
      // For each day in the range
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          timeZone: timezone 
        }).toLowerCase();
        const dayHours = businessHours[dayOfWeek];
        
        // Get day number (0 = Sunday, 6 = Saturday)
        const dayNumber = currentDate.getDay();
        const staffSchedule = scheduleMap.get(dayNumber);
        
        // Check for schedule override first
        const dateStr = currentDate.toISOString().split('T')[0];
        const scheduleOverride = overrideMap.get(dateStr);
        
        // Use staff schedule if available, otherwise fall back to business hours
        let openTimeStr: string;
        let closeTimeStr: string;
        
        if (scheduleOverride) {
          // Staff has an override for this specific date
          if (!scheduleOverride.startTime || !scheduleOverride.endTime) {
            // Day off override - skip this day
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }
          openTimeStr = scheduleOverride.startTime;
          closeTimeStr = scheduleOverride.endTime;
        } else if (staffSchedule) {
          // Staff has a regular schedule for this day
          openTimeStr = staffSchedule.startTime;
          closeTimeStr = staffSchedule.endTime;
        } else if (dayHours && dayHours.open && dayHours.close) {
          // Fall back to business hours
          openTimeStr = dayHours.open;
          closeTimeStr = dayHours.close;
        } else {
          // No hours available for this day
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
  
        // Parse hours for this day
        const [openHour, openMinute] = openTimeStr.split(':').map(Number);
        const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);
        
        // Use timezone-aware date creation
        // Format the date in the target timezone to get the correct date string
        const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: timezone });
        const openTimeFormatted = `${openHour.toString().padStart(2, '0')}:${openMinute.toString().padStart(2, '0')}`;
        const closeTimeFormatted = `${closeHour.toString().padStart(2, '0')}:${closeMinute.toString().padStart(2, '0')}`;
        
        const openTime = TimezoneUtils.createDateInTimezone(dateStr, openTimeFormatted, timezone);
        const closeTime = TimezoneUtils.createDateInTimezone(dateStr, closeTimeFormatted, timezone);
  
        // Debug logging for roster hours
        console.log('[AVAILABILITY] Slot generation for day:', {
          dayOfWeek: dayNumber,
          date: dateStr,
          scheduleType: scheduleOverride ? 'override' : staffSchedule ? 'regular' : 'business hours',
          scheduleOverride: scheduleOverride ? {
            startTime: scheduleOverride.startTime,
            endTime: scheduleOverride.endTime
          } : null,
          staffSchedule: staffSchedule ? {
            startTime: staffSchedule.startTime,
            endTime: staffSchedule.endTime
          } : 'No schedule - using business hours',
          openTimeStr,
          closeTimeStr,
          totalServiceDuration,
          serviceDetails: {
            baseDuration,
            paddingBefore: service.paddingBefore,
            paddingAfter: service.paddingAfter
          },
          lastPossibleSlotStart: format(addMinutes(closeTime, -totalServiceDuration), 'HH:mm'),
          staffId
        });
  
        // Generate slots for this day
        let slotStart = new Date(openTime.getTime()); // Create a proper copy
        let slotCount = 0;
        while (addMinutes(slotStart, totalServiceDuration) <= closeTime) {
            const slotEnd = addMinutes(slotStart, baseDuration);
            const effectiveStart = addMinutes(slotStart, -service.paddingBefore);
            const effectiveEnd = addMinutes(slotEnd, service.paddingAfter);
  
            // Check if this slot conflicts with any existing booking
            const conflict = this.checkSlotConflict(
              effectiveStart,
              effectiveEnd,
              existingBookings,
            );
            
            // Check if slot meets minimum booking notice requirement
            const now = new Date();
            const minutesUntilSlot = (slotStart.getTime() - now.getTime()) / (1000 * 60);
            const isPastSlot = slotStart < now;
            const meetsMinimumNotice = minimumBookingNotice === 0 || minutesUntilSlot >= minimumBookingNotice;
  
            slots.push({
              startTime: slotStart,
              endTime: slotEnd,
              available: !conflict.hasConflict && !isPastSlot && meetsMinimumNotice,
              conflictReason: conflict.hasConflict ? conflict.reason : 
                           isPastSlot ? 'Slot is in the past' : 
                           !meetsMinimumNotice ? 'Does not meet minimum booking notice' : undefined,
            });
            
            slotCount++;
  
          // Move to next slot
          slotStart = addMinutes(slotStart, slotDuration);
        }
        
        // Log last slot info
        if (slotCount > 0) {
          const lastSlot = slots[slots.length - 1];
          console.log('[AVAILABILITY] Last slot generated:', {
            slotStartTime: format(lastSlot.startTime, 'HH:mm'),
            serviceWouldEndAt: format(addMinutes(lastSlot.startTime, totalServiceDuration), 'HH:mm'),
            rosterEndsAt: closeTimeStr,
            fitsWithinRoster: addMinutes(lastSlot.startTime, totalServiceDuration) <= closeTime
          });
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
      // Check if the time ranges overlap: booking starts before slot ends AND ends after slot starts
      if (
        booking.startTime < slotEnd && booking.endTime > slotStart
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