import { Booking } from '../../domain/entities/booking.entity';
import { TimeSlot } from '../../domain/value-objects/time-slot.vo';
import { BookingStatusValue } from '../../domain/value-objects/booking-status.vo';
import { PaymentStatusEnum } from '../../domain/value-objects/payment-status.vo';
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
    if (!prismaBooking.customer) {
      throw new Error('Booking mapping failed: missing customer relation');
    }
    
    // Location is now optional - warn if locationId exists but location relation is missing
    if (prismaBooking.locationId && !prismaBooking.location) {
      console.warn(`[BookingMapper] Warning: locationId ${prismaBooking.locationId} exists but location relation is null`);
    }

    // Handle blank bookings (no services) and regular bookings
    const bookingService = prismaBooking.services[0];
    const isBlankBooking = !bookingService;

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
      serviceId: isBlankBooking ? undefined : bookingService.serviceId,
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
      customerRequestedStaff: prismaBooking.customerRequestedStaff ?? false,
      createdAt: prismaBooking.createdAt,
      updatedAt: prismaBooking.updatedAt,
      cancelledAt: prismaBooking.cancelledAt || undefined,
      cancellationReason: prismaBooking.cancellationReason || undefined,
      completedAt: prismaBooking.completedAt || undefined,
      // Payment fields
      paymentStatus: (prismaBooking.paymentStatus as PaymentStatusEnum) || PaymentStatusEnum.UNPAID,
      paidAmount: typeof prismaBooking.paidAmount === 'object' && prismaBooking.paidAmount.toNumber
        ? prismaBooking.paidAmount.toNumber()
        : Number(prismaBooking.paidAmount || 0),
      paymentMethod: prismaBooking.paymentMethod || undefined,
      paymentReference: prismaBooking.paymentReference || undefined,
      paidAt: prismaBooking.paidAt || undefined,
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
      locationId: booking.locationId || null, // Allow null locationId
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
      completedAt: booking.completedAt,
      customerRequestedStaff: booking.customerRequestedStaff,
      // Payment fields
      paymentStatus: booking.paymentStatus.toString(),
      paidAmount: booking.paidAmount,
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference,
      paidAt: booking.paidAt,
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
      customerId: booking.customerId,
      notes: booking.notes,
      updatedAt: booking.updatedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      completedAt: booking.completedAt,
      // Payment fields
      paymentStatus: booking.paymentStatus.toString(),
      paidAmount: booking.paidAmount,
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference,
      paidAt: booking.paidAt,
    };
  }

  /**
   * Alias for toPersistenceCreate for backward compatibility
   */
  static toPersistence(booking: Booking): Prisma.BookingUncheckedCreateInput {
    return this.toPersistenceCreate(booking);
  }
}
