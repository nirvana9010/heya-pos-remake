import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TimezoneUtils } from '../utils/shared/timezone';
import { toNumber } from '../utils/decimal';
import { formatName } from '../utils/shared/format';
import { IsString, IsOptional, IsNotEmpty, IsEmail, MaxLength } from 'class-validator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantNotificationsService } from '../notifications/merchant-notifications.service';
import { FeaturesService } from '../features/features.service';
import { BookingCreationService } from '../contexts/bookings/application/services/booking-creation.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

class CheckInDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // @IsString()
  // @IsOptional()
  // @MaxLength(500)
  // allergies?: string;

  // @IsString()
  // @IsOptional()
  // @MaxLength(500)
  // specialRequirements?: string;

  // @IsString()
  // @IsOptional()
  // referralSource?: string;
}

@Controller('public')
@Public()
export class PublicCheckInController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: MerchantNotificationsService,
    private readonly featuresService: FeaturesService,
    private readonly bookingCreationService: BookingCreationService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  // Helper method to get merchant by subdomain
  private async getMerchantBySubdomain(
    subdomain?: string,
    headerSubdomain?: string,
  ) {
    const merchantSubdomain = subdomain || headerSubdomain;
    
    if (!merchantSubdomain) {
      throw new BadRequestException('Merchant subdomain is required');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { 
        subdomain: merchantSubdomain,
        status: 'ACTIVE'
      },
    });

    if (!merchant) {
      throw new BadRequestException(`Merchant not found: ${merchantSubdomain}`);
    }

    return merchant;
  }

  // Check in endpoint
  @Post('checkin')
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @Body() dto: CheckInDto,
    @Query('subdomain') subdomain?: string,
    @Headers('x-merchant-subdomain') headerSubdomain?: string,
  ) {
    const merchant = await this.getMerchantBySubdomain(subdomain, headerSubdomain);

    // Clean phone number
    const cleanedPhone = dto.phone.replace(/\D/g, '');

    // Try to find existing customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        merchantId: merchant.id,
        OR: [
          { phone: cleanedPhone },
          { mobile: cleanedPhone },
        ],
      },
    });

    if (customer) {
      // Update existing customer
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName || customer.lastName,
          email: dto.email || customer.email,
          // allergies: dto.allergies || customer.allergies,
          // specialRequirements: dto.specialRequirements || customer.specialRequirements,
          // referralSource: dto.referralSource || customer.referralSource,
          // lastCheckInAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`[CHECK-IN] Existing customer updated: ${customer.id}`);
    } else {
      // Create new customer
      customer = await this.prisma.customer.create({
        data: {
          merchantId: merchant.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: cleanedPhone,
          email: dto.email,
          // allergies: dto.allergies,
          // specialRequirements: dto.specialRequirements,
          // referralSource: dto.referralSource,
          source: 'WALK_IN',
          // lastCheckInAt: new Date(),
        },
      });

      console.log(`[CHECK-IN] New customer created: ${customer.id}`);
    }

    // Check if merchant has check_in_only feature
    const hasCheckInOnly = await this.featuresService.hasFeature(merchant.id, 'check_in_only');
    
    if (hasCheckInOnly) {
      // For check-in only merchants, create a completed booking
      await this.createCheckInBooking(merchant.id, customer.id);
    }

    // Get today's bookings for this customer
    const todayBookings = await this.getTodaysBookings(customer.id, merchant.id);

    // Get loyalty information
    const loyaltyInfo = await this.getLoyaltyInfo(customer.id, merchant.id);

    return {
      success: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyVisits: customer.loyaltyVisits,
        // allergies: customer.allergies,
        // specialRequirements: customer.specialRequirements,
      },
      bookings: todayBookings,
      loyalty: loyaltyInfo,
    };
  }


  private async getTodaysBookings(customerId: string, merchantId: string) {
    // Get merchant's timezone from first location
    const location = await this.prisma.location.findFirst({
      where: {
        merchantId,
        isActive: true,
      },
    });

    const timezone = location?.timezone || 'Australia/Sydney';

    // Get today's date range in merchant timezone
    const startOfDay = TimezoneUtils.startOfDayInTimezone(new Date(), timezone);
    const endOfDay = TimezoneUtils.endOfDayInTimezone(new Date(), timezone);

    const bookings = await this.prisma.booking.findMany({
      where: {
        customerId,
        merchantId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        services: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return bookings.map(booking => {
      const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(booking.startTime, timezone);
      const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(booking.endTime, timezone);
      
      return {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        serviceName: booking.services[0]?.service?.name || 'Service',
        staffName: booking.provider 
          ? formatName(booking.provider.firstName, booking.provider.lastName)
          : 'Unassigned',
        startTime: startTimeDisplay.time.substring(0, 5), // HH:MM format
        endTime: endTimeDisplay.time.substring(0, 5),
        status: booking.status,
      };
    });
  }

  @Post('bookings/:bookingId/checkin')
  @HttpCode(HttpStatus.OK)
  async checkInBooking(
    @Param('bookingId') bookingId: string,
    @Query('subdomain') subdomain?: string,
    @Headers('x-merchant-subdomain') headerSubdomain?: string,
  ) {
    const merchant = await this.getMerchantBySubdomain(subdomain, headerSubdomain);

    // Find and update the booking
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        merchantId: merchant.id,
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    // Update booking status to IN_PROGRESS
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        services: {
          include: {
            service: true,
          },
        },
        provider: true,
      },
    });

    console.log(`[CHECK-IN] Booking ${bookingId} marked as IN_PROGRESS`);

    // Emit event for real-time updates
    this.eventEmitter.emit('booking.updated', {
      bookingId: updatedBooking.id,
      merchantId: updatedBooking.merchantId,
      status: updatedBooking.status,
      source: 'CHECK_IN',
    });

    // Create notification for merchant using the service
    const serviceName = updatedBooking.services[0]?.service?.name || 'Service';
    const customerName = formatName(updatedBooking.customer.firstName, updatedBooking.customer.lastName);
    const staffName = updatedBooking.provider ? formatName(updatedBooking.provider.firstName, updatedBooking.provider.lastName) : undefined;
    
    // Use the service method to create a booking_modified notification
    await this.notificationsService.createBookingNotification(
      updatedBooking.merchantId,
      'booking_modified',
      {
        id: updatedBooking.id,
        customerName,
        serviceName,
        startTime: updatedBooking.startTime,
        staffName,
      },
      'checked in for their appointment'
    );
    

    return {
      success: true,
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
      },
    };
  }

  private async createCheckInBooking(merchantId: string, customerId: string) {
    try {
      // Get or create check-in service
      const checkInService = await this.getOrCreateCheckInService(merchantId);
      
      // Get merchant's first location
      const location = await this.prisma.location.findFirst({
        where: {
          merchantId,
          isActive: true,
        },
      });

      // Create a completed booking
      const booking = await this.bookingCreationService.createBooking({
        merchantId,
        customerId,
        locationId: location?.id,
        serviceId: checkInService.id,
        startTime: new Date(),
        source: 'CHECK_IN',
        createdById: customerId, // Self check-in
      });

      // Immediately complete the booking to trigger loyalty
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          checkedInAt: new Date(),
        },
      });

      // Process loyalty
      await this.loyaltyService.processBookingCompletion(booking.id);

      console.log(`[CHECK-IN] Created and completed booking ${booking.id} for customer ${customerId}`);
    } catch (error) {
      console.error('[CHECK-IN] Error creating check-in booking:', error);
      // Don't throw - allow check-in to succeed even if booking creation fails
    }
  }

  private async getOrCreateCheckInService(merchantId: string) {
    // Look for existing check-in service
    let service = await this.prisma.service.findFirst({
      where: {
        merchantId,
        name: 'Check-In',
      },
    });

    if (!service) {
      // Create check-in service
      service = await this.prisma.service.create({
        data: {
          merchantId,
          name: 'Check-In',
          description: 'System service for check-ins',
          duration: 0,
          price: 0,
          currency: 'AUD',
          isActive: true,
          metadata: {
            isSystem: true,
            hidden: true,
          },
        },
      });
      console.log(`[CHECK-IN] Created check-in service for merchant ${merchantId}`);
    }

    return service;
  }

  private async getLoyaltyInfo(customerId: string, merchantId: string) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { merchantId },
    });

    if (!program || !program.isActive) {
      return null;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        loyaltyPoints: true,
        loyaltyVisits: true,
      },
    });

    return {
      type: program.type,
      points: toNumber(customer?.loyaltyPoints || 0),
      visits: customer?.loyaltyVisits || 0,
      pointsToNextReward: program.type === 'POINTS' ? toNumber(program.rewardThreshold) - toNumber(customer?.loyaltyPoints || 0) : null,
      visitsToNextReward: program.type === 'VISITS' ? program.visitsRequired - (customer?.loyaltyVisits || 0) : null,
      canRedeem: program.type === 'POINTS' 
        ? toNumber(customer?.loyaltyPoints || 0) >= toNumber(program.rewardThreshold)
        : (customer?.loyaltyVisits || 0) >= (program.visitsRequired || 0),
    };
  }
}