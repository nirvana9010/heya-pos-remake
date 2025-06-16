import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CreateBookingHandler } from '../../application/commands/create-booking.handler';
import { CreateBookingCommand } from '../../application/commands/create-booking.command';
import { BookingUpdateService } from '../../application/services/booking-update.service';
import { BookingAvailabilityService } from '../../application/services/booking-availability.service';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
import { GetBookingByIdQuery } from '../../application/queries/get-booking-by-id.query';
import { GetBookingsListQuery } from '../../application/queries/get-bookings-list.query';
import { GetCalendarViewQuery } from '../../application/queries/get-calendar-view.query';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { PinAuthGuard } from '../../../../auth/guards/pin-auth.guard';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../../auth/decorators/permissions.decorator';
import { IsString, IsOptional, IsBoolean, IsNotEmpty, IsDateString } from 'class-validator';

class CreateBookingV2Dto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isOverride?: boolean;

  @IsString()
  @IsOptional()
  overrideReason?: string;
}

class UpdateBookingV2Dto {
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;
}

@Controller({
  path: 'bookings',
  version: '2', // This marks it as v2
})
@UseGuards(JwtAuthGuard, PinAuthGuard)
export class BookingsV2Controller {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly createBookingHandler: CreateBookingHandler,
    private readonly bookingUpdateService: BookingUpdateService,
    private readonly bookingAvailabilityService: BookingAvailabilityService,
    @Inject('IBookingRepository')
    private readonly bookingRepository: IBookingRepository,
  ) {}

  @Get()
  @Permissions('booking.read')
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('staffId') staffId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query = new GetBookingsListQuery({
      merchantId: user.merchantId,
      filters: {
        staffId,
        customerId,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });

    const result = await this.queryBus.execute(query);

    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('calendar')
  @Permissions('booking.read')
  async getCalendarView(
    @CurrentUser() user: any,
    @Query('date') date: string,
    @Query('view') view: 'day' | 'week' | 'month' = 'day',
    @Query('staffIds') staffIds?: string,
    @Query('locationId') locationId?: string,
  ) {
    const query = new GetCalendarViewQuery({
      merchantId: user.merchantId,
      date: new Date(date),
      view,
      staffIds: staffIds ? staffIds.split(',') : undefined,
      locationId,
    });

    const slots = await this.queryBus.execute(query);
    return { slots };
  }

  @Get('availability')
  @Permissions('booking.read')
  async getAvailability(
    @CurrentUser() user: any,
    @Query('staffId') staffId: string,
    @Query('serviceId') serviceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('timezone') timezone?: string,
  ) {
    if (!staffId || !serviceId || !startDate || !endDate) {
      throw new Error('Missing required parameters: staffId, serviceId, startDate, endDate');
    }

    const slots = await this.bookingAvailabilityService.getAvailableSlots({
      staffId,
      serviceId,
      merchantId: user.merchantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      timezone,
    });

    return {
      staffId,
      serviceId,
      timezone: timezone || 'Australia/Sydney',
      availableSlots: slots
        .filter(slot => slot.available)
        .map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      allSlots: slots, // Include all slots for debugging
    };
  }

  @Get(':id')
  @Permissions('booking.read')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const query = new GetBookingByIdQuery({
      bookingId: id,
      merchantId: user.merchantId,
    });

    const booking = await this.queryBus.execute(query);
    return booking;
  }

  @Post()
  @Permissions('booking.create')
  async create(@CurrentUser() user: any, @Body() dto: CreateBookingV2Dto) {
    const command = new CreateBookingCommand({
      ...dto,
      startTime: new Date(dto.startTime),
      merchantId: user.merchantId,
      source: 'MANUAL',
      createdById: dto.staffId, // Use the staff member creating the booking
    });

    const booking = await this.createBookingHandler.execute(command);
    
    return this.toDto(booking);
  }

  @Patch(':id')
  @Permissions('booking.update')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingV2Dto,
  ) {
    const updateData: any = {
      bookingId: id,
      merchantId: user.merchantId,
    };

    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.staffId) updateData.staffId = dto.staffId;
    if (dto.serviceId) updateData.serviceId = dto.serviceId;
    if (dto.locationId) updateData.locationId = dto.locationId;

    const booking = await this.bookingUpdateService.updateBooking(updateData);
    return this.toDto(booking);
  }

  @Patch(':id/start')
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async startBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingUpdateService.startBooking(id, user.merchantId);
    return this.toDto(booking);
  }

  @Patch(':id/complete')
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async completeBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingUpdateService.completeBooking(id, user.merchantId);
    return this.toDto(booking);
  }

  @Patch(':id/cancel')
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const booking = await this.bookingUpdateService.cancelBooking({
      bookingId: id,
      merchantId: user.merchantId,
      reason: body.reason,
      cancelledBy: user.id,
    });
    
    return this.toDto(booking);
  }

  @Delete(':id')
  @Permissions('booking.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    await this.bookingRepository.delete(id, user.merchantId);
  }

  /**
   * Convert domain entity to DTO
   * This is part of the anti-corruption layer
   */
  private toDto(booking: any) {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status.value,
      startTime: booking.timeSlot.start,
      endTime: booking.timeSlot.end,
      customerId: booking.customerId,
      staffId: booking.staffId,
      serviceId: booking.serviceId,
      locationId: booking.locationId,
      notes: booking.notes,
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      isOverride: booking.isOverride,
      overrideReason: booking.overrideReason,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
    };
  }
}