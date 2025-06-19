import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface BookingValidationParams {
  merchantId: string;
  customerId: string;
  staffId: string;
  locationId: string;
  serviceIds: string[];
  startTime: Date;
  endTime: Date;
  excludeBookingId?: string;
}

interface CustomerValidationParams {
  merchantId: string;
  email?: string;
  mobile?: string;
  excludeCustomerId?: string;
}

@Injectable()
export class BusinessValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateBooking(params: BookingValidationParams): Promise<void> {
    const errors: string[] = [];

    // Validate customer exists
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: params.customerId,
        merchantId: params.merchantId,
        status: 'ACTIVE',
      },
    });

    if (!customer) {
      errors.push('Customer not found or inactive');
    }

    // Validate staff exists and is at location
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: params.staffId,
        merchantId: params.merchantId,
        status: 'ACTIVE',
      },
      include: {
        locations: {
          where: {
            locationId: params.locationId,
          },
        },
      },
    });

    if (!staff) {
      errors.push('Staff member not found or inactive');
    } else if (staff.locations.length === 0) {
      errors.push('Staff member is not assigned to this location');
    }

    // Validate services exist
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: params.serviceIds },
        merchantId: params.merchantId,
        isActive: true,
      },
    });

    if (services.length !== params.serviceIds.length) {
      errors.push('One or more services not found or inactive');
    }

    // Check for booking conflicts
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        merchantId: params.merchantId,
        providerId: params.staffId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        id: params.excludeBookingId ? { not: params.excludeBookingId } : undefined,
        OR: [
          {
            AND: [
              { startTime: { lte: params.startTime } },
              { endTime: { gt: params.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: params.endTime } },
              { endTime: { gte: params.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: params.startTime } },
              { endTime: { lte: params.endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      errors.push('Time slot conflicts with existing booking');
    }

    // Check business hours
    const location = await this.prisma.location.findFirst({
      where: {
        id: params.locationId,
        merchantId: params.merchantId,
        isActive: true,
      },
    });

    if (!location) {
      errors.push('Location not found or inactive');
    } else {
      // Validate against business hours
      const dayOfWeek = params.startTime.getDay();
      const businessHours = location.businessHours as any;
      
      if (businessHours && businessHours[dayOfWeek]) {
        const dayHours = businessHours[dayOfWeek];
        if (!dayHours.isOpen) {
          errors.push('Business is closed on this day');
        } else {
          const startTimeStr = params.startTime.toTimeString().slice(0, 5);
          const endTimeStr = params.endTime.toTimeString().slice(0, 5);
          
          if (startTimeStr < dayHours.openTime || endTimeStr > dayHours.closeTime) {
            errors.push('Booking time is outside business hours');
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Booking validation failed',
        errors,
      });
    }
  }

  async validateCustomerUniqueness(params: CustomerValidationParams): Promise<void> {
    const errors: string[] = [];

    if (params.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: {
          merchantId: params.merchantId,
          email: params.email,
          id: params.excludeCustomerId ? { not: params.excludeCustomerId } : undefined,
        },
      });

      if (existingEmail) {
        errors.push('Customer with this email already exists');
      }
    }

    if (params.mobile) {
      const existingMobile = await this.prisma.customer.findFirst({
        where: {
          merchantId: params.merchantId,
          mobile: params.mobile,
          id: params.excludeCustomerId ? { not: params.excludeCustomerId } : undefined,
        },
      });

      if (existingMobile) {
        errors.push('Customer with this mobile number already exists');
      }
    }

    if (errors.length > 0) {
      throw new ConflictException({
        message: 'Customer validation failed',
        errors,
      });
    }
  }

  async validateServiceAvailability(
    merchantId: string,
    serviceIds: string[],
    locationId: string,
  ): Promise<void> {
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        merchantId,
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      const foundIds = services.map(s => s.id);
      const missingIds = serviceIds.filter(id => !foundIds.includes(id));
      
      throw new BadRequestException({
        message: 'Service validation failed',
        errors: [`Services not found: ${missingIds.join(', ')}`],
      });
    }

    // Check if services require specific staff qualifications
    for (const service of services) {
      if (service.category === 'SPECIALIST') {
        // Additional validation for specialist services
        // This could check staff certifications, etc.
      }
    }
  }

  async validatePaymentAmount(
    orderId: string,
    paymentAmount: number,
    allowOverpayment = false,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const totalPaid = order.payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0,
    );

    const remainingBalance = order.totalAmount.toNumber() - totalPaid;

    if (paymentAmount > remainingBalance && !allowOverpayment) {
      throw new BadRequestException({
        message: 'Payment validation failed',
        errors: [`Payment amount exceeds remaining balance of $${remainingBalance}`],
      });
    }

    if (paymentAmount <= 0) {
      throw new BadRequestException({
        message: 'Payment validation failed',
        errors: ['Payment amount must be greater than zero'],
      });
    }
  }
}