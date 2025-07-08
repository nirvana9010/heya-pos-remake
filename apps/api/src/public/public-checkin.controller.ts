import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TimezoneUtils } from '../utils/shared/timezone';
import { toNumber } from '../utils/decimal';
import { IsString, IsOptional, IsNotEmpty, IsEmail, MaxLength } from 'class-validator';

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

    // Get today's bookings for this customer
    const todayBookings = await this.getTodaysBookings(customer.id, merchant.id);

    return {
      success: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        // allergies: customer.allergies,
        // specialRequirements: customer.specialRequirements,
      },
      bookings: todayBookings,
    };
  }

  @Get('bookings/today')
  async getTodaysBookingsForCustomer(
    @Query('customerId') customerId: string,
    @Query('subdomain') subdomain?: string,
    @Headers('x-merchant-subdomain') headerSubdomain?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    const merchant = await this.getMerchantBySubdomain(subdomain, headerSubdomain);
    const bookings = await this.getTodaysBookings(customerId, merchant.id);

    return { bookings };
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
          ? `${booking.provider.firstName} ${booking.provider.lastName || ''}`.trim()
          : 'Unassigned',
        startTime: startTimeDisplay.time.substring(0, 5), // HH:MM format
        endTime: endTimeDisplay.time.substring(0, 5),
        status: booking.status,
      };
    });
  }
}