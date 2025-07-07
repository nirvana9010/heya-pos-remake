import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { BookingStatusValue } from '../../domain/value-objects/booking-status.vo';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { OutboxEventRepository } from '../../../shared/outbox/infrastructure/outbox-event.repository';
import { OutboxEvent } from '../../../shared/outbox/domain/outbox-event.entity';
import { BookingServiceData } from '../commands/create-booking.command';

interface CreateBookingData {
  staffId?: string; // Optional for multi-service bookings
  serviceId?: string; // Legacy single service
  services?: BookingServiceData[]; // New multi-service support
  customerId: string;
  startTime: Date;
  locationId?: string;
  merchantId: string;
  notes?: string;
  source: string;
  createdById: string;
  isOverride?: boolean;
  overrideReason?: string;
}

interface ServiceDetails {
  id: string;
  duration: number;
  price: number;
}

@Injectable()
export class BookingCreationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
    private readonly outboxRepository: OutboxEventRepository,
  ) {}

  /**
   * Creates a booking with pessimistic locking to prevent double bookings.
   * This is a transactional script that orchestrates the entire booking creation process.
   */
  async createBooking(data: CreateBookingData): Promise<Booking> {
    // Convert legacy single service to services array
    const services: BookingServiceData[] = data.services || (data.serviceId ? [{
      serviceId: data.serviceId,
      staffId: data.staffId
    }] : []);

    if (services.length === 0) {
      throw new Error('At least one service is required');
    }

    const savedBooking = await this.prisma.$transaction(async (tx) => {
      // 1. Lock all staff members involved to prevent concurrent bookings
      const uniqueStaffIds = [...new Set(services
        .map(s => s.staffId || data.staffId)
        .filter(Boolean)
      )] as string[];
      
      for (const staffId of uniqueStaffIds) {
        await this.bookingRepository.lockStaff(staffId, data.merchantId, tx);
      }

      // 2. Fetch all service details and calculate total duration and pricing
      let totalAmount = 0;
      let totalDuration = 0;
      const serviceDetails: Array<ServiceDetails & { staffId?: string }> = [];
      
      for (const bookingService of services) {
        const service = await this.getServiceDetails(bookingService.serviceId, tx);
        if (!service) {
          throw new Error(`Service not found: ${bookingService.serviceId}`);
        }
        
        const duration = bookingService.duration || service.duration;
        const price = bookingService.price !== undefined ? bookingService.price : service.price;
        
        serviceDetails.push({
          ...service,
          duration,
          price,
          staffId: bookingService.staffId || data.staffId
        });
        
        totalAmount += price;
        totalDuration += duration;
      }

      const endTime = new Date(data.startTime.getTime() + totalDuration * 60 * 1000);

      // 3. Check for conflicting bookings for each staff-service combination
      let currentStartTime = new Date(data.startTime);
      
      for (const serviceDetail of serviceDetails) {
        const serviceEndTime = new Date(currentStartTime.getTime() + serviceDetail.duration * 60 * 1000);
        const staffId = serviceDetail.staffId;
        
        if (staffId) {
          const conflicts = await this.bookingRepository.findConflictingBookings(
            staffId,
            currentStartTime,
            serviceEndTime,
            data.merchantId,
            undefined,
            tx
          );

          if (conflicts.length > 0 && !data.isOverride) {
            // Fetch staff name for better error message
            const staff = await tx.staff.findUnique({
              where: { id: staffId },
              select: { firstName: true, lastName: true }
            });
            
            const staffName = staff 
              ? `${staff.firstName}${staff.lastName ? ' ' + staff.lastName : ''}`
              : `Staff ID: ${staffId}`;
            
            const conflictInfo = conflicts.map(c => ({
              id: c.id,
              startTime: c.timeSlot.start,
              endTime: c.timeSlot.end,
              status: c.status.value,
              staffId: staffId,
              staffName: staffName,
              serviceId: serviceDetail.id
            }));
            throw new ConflictException({
              message: `Time slot has conflicts for ${staffName}`,
              conflicts: conflictInfo,
            });
          }
        }
        
        currentStartTime = serviceEndTime;
      }

      // 4. Generate booking number
      const bookingNumber = await this.generateBookingNumber(data.merchantId, tx);

      // 5. Create the booking domain entity
      // For now, use the first service for the main booking (will be updated in domain entity)
      const primaryStaffId = serviceDetails[0]?.staffId || data.staffId;
      
      const booking = new Booking({
        id: uuidv4(),
        bookingNumber,
        merchantId: data.merchantId,
        customerId: data.customerId,
        staffId: primaryStaffId,
        serviceId: serviceDetails[0].id, // Temporary, will update domain to support array
        locationId: data.locationId,
        timeSlot: new TimeSlot(data.startTime, endTime),
        status: BookingStatusValue.CONFIRMED,
        totalAmount,
        depositAmount: 0, // TODO: Calculate based on merchant settings
        notes: data.notes,
        source: data.source,
        createdById: data.createdById,
        isOverride: data.isOverride || false,
        overrideReason: data.overrideReason,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: serviceDetails, // Pass services for repository to handle
      } as any); // Temporary cast until domain entity is updated

      // 6. Persist the booking with all services
      const savedBooking = await this.bookingRepository.save(booking, tx, serviceDetails);

      // 7. Save booking created event to outbox
      const outboxEvent = OutboxEvent.create({
        aggregateId: savedBooking.id,
        aggregateType: 'booking',
        eventType: 'created',
        eventData: {
          bookingId: savedBooking.id,
          bookingNumber: savedBooking.bookingNumber,
          customerId: savedBooking.customerId,
          staffId: primaryStaffId,
          serviceIds: serviceDetails.map(s => s.id),
          locationId: savedBooking.locationId,
          startTime: savedBooking.timeSlot.start,
          endTime: savedBooking.timeSlot.end,
          status: savedBooking.status.value,
          totalAmount: savedBooking.totalAmount,
          source: savedBooking.source,
        },
        eventVersion: 1,
        merchantId: savedBooking.merchantId,
      });

      await this.outboxRepository.save(outboxEvent, tx);

      return savedBooking;
    }, {
      timeout: 10000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });


    return savedBooking;
  }

  /**
   * Get service details including duration and price
   */
  private async getServiceDetails(
    serviceId: string,
    tx: Prisma.TransactionClient
  ): Promise<ServiceDetails | null> {
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        duration: true,
        price: true,
      },
    });

    if (!service) {
      return null;
    }

    return {
      id: service.id,
      duration: service.duration,
      price: typeof service.price === 'object' && service.price !== null && 'toNumber' in service.price
        ? service.price.toNumber()
        : Number(service.price),
    };
  }

  /**
   * Generate a unique booking number with format: BK{timestamp}{random}
   */
  private async generateBookingNumber(
    merchantId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    // Use timestamp + random string for uniqueness
    // No need to use count which can cause race conditions
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `BK${timestamp}${random}`.toUpperCase();
  }
}