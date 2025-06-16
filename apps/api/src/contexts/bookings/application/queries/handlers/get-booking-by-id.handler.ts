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
          },
        },
        createdBy: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Map to read model
    const service = booking.services[0]?.service;
    
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      
      customer: {
        id: booking.customer.id,
        name: `${booking.customer.firstName} ${booking.customer.lastName}`,
        email: booking.customer.email,
        phone: booking.customer.phone,
        loyaltyPoints: booking.customer.loyaltyPoints?.toNumber(),
      },
      
      staff: {
        id: booking.provider.id,
        name: `${booking.provider.firstName} ${booking.provider.lastName}`,
        email: booking.provider.email,
        phone: booking.provider.phone,
      },
      
      service: service ? {
        id: service.id,
        name: service.name,
        category: service.categoryModel?.name || 'Uncategorized',
        duration: service.duration,
        price: service.price.toNumber(),
      } : {
        id: '',
        name: 'Unknown Service',
        category: 'Uncategorized',
        duration: 60,
        price: 0,
      },
      
      location: {
        id: booking.location.id,
        name: booking.location.name,
        address: `${booking.location.address}, ${booking.location.suburb}, ${booking.location.state} ${booking.location.postalCode}`,
        phone: booking.location.phone,
      },
      
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.totalAmount.toNumber(),
      depositAmount: booking.depositAmount.toNumber(),
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
    };
  }
}