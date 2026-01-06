import {
  Controller,
  Get,
  Query,
  BadRequestException,
  Headers,
} from "@nestjs/common";
import { BookingAvailabilityService } from "../contexts/bookings/application/services/booking-availability.service";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";
import { IsUUID, IsDateString, IsOptional, IsString } from "class-validator";
import { Transform, Type } from "class-transformer";

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

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

@Controller("public/availability")
@Public()
export class AvailabilityController {
  constructor(
    private readonly availabilityService: BookingAvailabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAvailability(
    @Query() query: GetAvailabilityDto,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Validate date range
    if (startDate >= endDate) {
      throw new BadRequestException("Start date must be before end date");
    }

    // Limit date range to prevent abuse
    const maxDays = 90;
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff > maxDays) {
      throw new BadRequestException(`Date range cannot exceed ${maxDays} days`);
    }

    // Get merchant by subdomain from header
    if (!headerSubdomain) {
      throw new BadRequestException(
        "Merchant subdomain is required in x-merchant-subdomain header",
      );
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: {
        subdomain: headerSubdomain,
        status: "ACTIVE",
      },
    });

    if (!merchant) {
      throw new BadRequestException(`Merchant not found: ${headerSubdomain}`);
    }

    const slots = await this.availabilityService.getAvailableSlots({
      staffId: query.staffId,
      serviceId: query.serviceId,
      merchantId: merchant.id,
      startDate,
      endDate,
      timezone: query.timezone,
      locationId: query.locationId,
      requireRosterOnly: true,
    });

    // Return only available slots for customer app
    return {
      staffId: query.staffId,
      serviceId: query.serviceId,
      timezone: query.timezone || "Australia/Sydney",
      availableSlots: slots
        .filter((slot) => slot.available)
        .map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    };
  }
}
