import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBookingByIdQuery } from '../get-booking-by-id.query';
import { BookingDetail } from '../../read-models/booking-detail.model';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

@QueryHandler(GetBookingByIdQuery)
export class GetBookingByIdHandler implements IQueryHandler<GetBookingByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBookingByIdQuery): Promise<BookingDetail> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: query.bookingId,
        merchantId: query.merchantId,
      },
      include: {
        customer: true,
        provider: true,
        location: true,
        services: {
          include: {
            service: {
              include: {
                categoryModel: true,
              },
            },
            staff: true,
          },
        },
        createdBy: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Map to read model
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      
      customer: {
        id: booking.customer.id,
        name: `${booking.customer.firstName} ${booking.customer.lastName}`,
        email: booking.customer.email,
        phone: booking.customer.phone,
        loyaltyPoints: booking.customer.loyaltyPoints 
          ? (typeof booking.customer.loyaltyPoints === 'object' && 'toNumber' in booking.customer.loyaltyPoints
            ? booking.customer.loyaltyPoints.toNumber()
            : Number(booking.customer.loyaltyPoints))
          : 0,
      },
      
      staff: {
        id: booking.provider.id,
        name: `${booking.provider.firstName} ${booking.provider.lastName}`,
        email: booking.provider.email,
        phone: booking.provider.phone,
      },
      
      services: booking.services.map((bookingService: any) => ({
        id: bookingService.service.id,
        name: bookingService.service.name,
        category: bookingService.service.categoryModel?.name || 'Uncategorized',
        duration: bookingService.duration || bookingService.service.duration,
        price: typeof bookingService.price === 'object' && 'toNumber' in bookingService.price
          ? bookingService.price.toNumber()
          : Number(bookingService.price),
        staffId: bookingService.staffId || booking.provider.id,
        staffName: bookingService.staff ? 
          `${bookingService.staff.firstName} ${bookingService.staff.lastName}` : 
          `${booking.provider.firstName} ${booking.provider.lastName}`,
      })),
      
      location: {
        id: booking.location.id,
        name: booking.location.name,
        address: `${booking.location.address}, ${booking.location.suburb}, ${booking.location.state} ${booking.location.postalCode}`,
        phone: booking.location.phone,
      },
      
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: typeof booking.totalAmount === 'object' && 'toNumber' in booking.totalAmount
        ? booking.totalAmount.toNumber()
        : Number(booking.totalAmount),
      depositAmount: typeof booking.depositAmount === 'object' && 'toNumber' in booking.depositAmount
        ? booking.depositAmount.toNumber()
        : Number(booking.depositAmount),
      totalDuration: booking.services.reduce((sum: number, s: any) => sum + (s.duration || s.service.duration || 0), 0),
      notes: booking.notes,
      
      isOverride: booking.isOverride,
      overrideReason: booking.overrideReason,
      
      source: booking.source,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      createdBy: `${booking.createdBy.firstName} ${booking.createdBy.lastName}`,
      
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      cancelledBy: undefined, // No cancelledByStaffId in current schema
      completedAt: booking.completedAt,
      
      // Payment fields
      paymentStatus: booking.paymentStatus || 'UNPAID',
      paidAmount: typeof booking.paidAmount === 'object' && 'toNumber' in booking.paidAmount
        ? booking.paidAmount.toNumber()
        : Number(booking.paidAmount || 0),
      paymentMethod: booking.paymentMethod,
      paymentReference: booking.paymentReference,
      paidAt: booking.paidAt,
    };
  }
}