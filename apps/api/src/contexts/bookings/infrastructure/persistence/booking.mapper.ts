import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { BookingStatusValue } from '../../domain/value-objects/booking-status.vo';
import { Prisma } from '@prisma/client';

// Type for Prisma booking with all necessary relations
type PrismaBookingWithRelations = Prisma.BookingGetPayload<{
  include: { 
    services: { 
      include: { 
        service: true, 
        staff: true 
      } 
    }, 
    customer: true, 
    provider: true, 
    location: true 
  }
}>;

/**
 * BookingMapper
 * Translates between Prisma models and domain entities
 * This is the Anti-Corruption Layer between persistence and domain
 */
export class BookingMapper {
  /**
   * Convert Prisma booking to domain entity
   */
  static toDomain(prismaBooking: PrismaBookingWithRelations): Booking {
    if (!prismaBooking.customer || !prismaBooking.location) {
      throw new Error('Booking mapping failed: missing required relations');
    }

    // For now, we assume one service per booking (first service)
    const bookingService = prismaBooking.services[0];
    if (!bookingService || !bookingService.service) {
      throw new Error('Booking mapping failed: missing service information');
    }

    const timeSlot = new TimeSlot(
      prismaBooking.startTime,
      prismaBooking.endTime
    );

    return new Booking({
      id: prismaBooking.id,
      bookingNumber: prismaBooking.bookingNumber,
      status: prismaBooking.status as BookingStatusValue,
      timeSlot,
      customerId: prismaBooking.customerId,
      staffId: prismaBooking.providerId,
      serviceId: bookingService.serviceId,
      locationId: prismaBooking.locationId,
      merchantId: prismaBooking.merchantId,
      notes: prismaBooking.notes || undefined,
      totalAmount: typeof prismaBooking.totalAmount === 'object' && prismaBooking.totalAmount.toNumber 
        ? prismaBooking.totalAmount.toNumber()
        : Number(prismaBooking.totalAmount),
      depositAmount: typeof prismaBooking.depositAmount === 'object' && prismaBooking.depositAmount.toNumber
        ? prismaBooking.depositAmount.toNumber()
        : Number(prismaBooking.depositAmount),
      isOverride: prismaBooking.isOverride || false,
      overrideReason: prismaBooking.overrideReason || undefined,
      source: prismaBooking.source,
      createdById: prismaBooking.createdById,
      createdAt: prismaBooking.createdAt,
      updatedAt: prismaBooking.updatedAt,
      cancelledAt: prismaBooking.cancelledAt || undefined,
      cancellationReason: prismaBooking.cancellationReason || undefined,
    });
  }

  /**
   * Convert domain entity to Prisma create input
   */
  static toPersistenceCreate(booking: Booking): Prisma.BookingUncheckedCreateInput {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status.value,
      startTime: booking.timeSlot.start,
      endTime: booking.timeSlot.end,
      customerId: booking.customerId,
      providerId: booking.staffId,
      locationId: booking.locationId,
      merchantId: booking.merchantId,
      notes: booking.notes,
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      isOverride: booking.isOverride,
      overrideReason: booking.overrideReason,
      source: booking.source,
      createdById: booking.createdById,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
    };
  }

  /**
   * Convert domain entity to Prisma update input
   */
  static toPersistenceUpdate(booking: Booking): Prisma.BookingUncheckedUpdateInput {
    return {
      status: booking.status.value,
      startTime: booking.timeSlot.start,
      endTime: booking.timeSlot.end,
      notes: booking.notes,
      updatedAt: booking.updatedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
    };
  }

  /**
   * Alias for toPersistenceCreate for backward compatibility
   */
  static toPersistence(booking: Booking): Prisma.BookingUncheckedCreateInput {
    return this.toPersistenceCreate(booking);
  }
}