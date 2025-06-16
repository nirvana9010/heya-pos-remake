import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { BookingAvailabilityService } from '../contexts/bookings/application/services/booking-availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetAvailabilityDto {
  @IsUUID()
  staffId: string;

  @IsUUID()
  serviceId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

@Controller('public/availability')
@Public()
export class AvailabilityController {
  constructor(
    private readonly availabilityService: BookingAvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAvailability(@Query() query: GetAvailabilityDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    
    // Validate date range
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Limit date range to prevent abuse
    const maxDays = 90;
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff > maxDays) {
      throw new BadRequestException(`Date range cannot exceed ${maxDays} days`);
    }

    // Get the first active merchant for now
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new BadRequestException('No active merchant found');
    }

    const slots = await this.availabilityService.getAvailableSlots({
      staffId: query.staffId,
      serviceId: query.serviceId,
      merchantId: merchant.id,
      startDate,
      endDate,
      timezone: query.timezone,
    });

    // Return only available slots for customer app
    return {
      staffId: query.staffId,
      serviceId: query.serviceId,
      timezone: query.timezone || 'Australia/Sydney',
      availableSlots: slots
        .filter(slot => slot.available)
        .map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    };
  }
}