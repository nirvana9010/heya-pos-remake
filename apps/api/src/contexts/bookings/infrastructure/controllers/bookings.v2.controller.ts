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
import { CreateBookingHandler } from '../../application/commands/create-booking.handler';
import { CreateBookingCommand } from '../../application/commands/create-booking.command';
import { IBookingRepository } from '../../domain/repositories/booking.repository.interface';
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

@Controller({
  path: 'bookings',
  version: '2', // This marks it as v2
})
@UseGuards(JwtAuthGuard, PinAuthGuard)
export class BookingsV2Controller {
  constructor(
    private readonly createBookingHandler: CreateBookingHandler,
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
  ) {
    const offset = (page - 1) * limit;
    
    const result = await this.bookingRepository.findMany({
      merchantId: user.merchantId,
      staffId,
      customerId,
      status,
      limit,
      offset,
    });

    return {
      data: result.bookings.map(this.toDto),
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  @Get(':id')
  @Permissions('booking.read')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingRepository.findById(id, user.merchantId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    return this.toDto(booking);
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

  @Patch(':id/start')
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async startBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingRepository.findById(id, user.merchantId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.start();
    const updated = await this.bookingRepository.update(booking);
    
    return this.toDto(updated);
  }

  @Patch(':id/complete')
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async completeBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingRepository.findById(id, user.merchantId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.complete();
    const updated = await this.bookingRepository.update(booking);
    
    return this.toDto(updated);
  }

  @Patch(':id/cancel')
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const booking = await this.bookingRepository.findById(id, user.merchantId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    booking.cancel(body.reason, user.id);
    const updated = await this.bookingRepository.update(booking);
    
    return this.toDto(updated);
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