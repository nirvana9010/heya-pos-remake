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
  ConflictException,
} from '@nestjs/common';
import { BookingsService } from '../bookings.service';
import { BookingsGateway } from '../bookings.gateway';
import { AvailabilityService } from '../availability.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { CreateBookingWithOverrideDto } from '../dto/create-booking-with-override.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { CheckAvailabilityDto } from '../dto/check-availability.dto';
import { QueryBookingsDto } from '../dto/query-bookings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PinAuthGuard } from '../../auth/guards/pin-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

@Controller({
  path: 'bookings',
  version: '1',
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsV1Controller {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly bookingsGateway: BookingsGateway,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Post()
  @UseGuards(PinAuthGuard)
  @Permissions('booking.create')
  async create(@CurrentUser() user: any, @Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsService.create(user.merchantId, createBookingDto, user.staffId || user.id);
    
    // Emit real-time update
    this.bookingsGateway.emitBookingCreated(user.merchantId, booking);
    
    return booking;
  }

  @Post('create-with-check')
  @UseGuards(PinAuthGuard)
  @Permissions('booking.create')
  async createWithCheck(@CurrentUser() user: any, @Body() dto: CreateBookingWithOverrideDto) {
    try {
      const booking = await this.availabilityService.createBookingWithLock({
        staffId: dto.providerId,
        serviceId: dto.services[0].serviceId,
        customerId: dto.customerId,
        startTime: new Date(dto.startTime),
        locationId: dto.locationId,
        merchantId: user.merchantId,
        notes: dto.notes,
        source: 'MANUAL',
        createdById: user.staffId || user.id,
        isOverride: dto.isOverride,
        overrideReason: dto.overrideReason,
      });

      // Emit real-time update
      this.bookingsGateway.emitBookingCreated(user.merchantId, booking);
      
      return booking;
    } catch (error: any) {
      if (error.message === 'Time slot has conflicts') {
        throw new ConflictException({
          message: 'This time slot has conflicts with existing bookings',
          conflicts: error.conflicts,
          requiresOverride: true,
        });
      }
      throw error;
    }
  }

  @Get()
  @Permissions('booking.view')
  findAll(@CurrentUser() user: any, @Query() query: QueryBookingsDto) {
    return this.bookingsService.findAll(user.merchantId, query);
  }

  @Get('calendar')
  @Permissions('booking.view')
  getCalendarView(@CurrentUser() user: any, @Query() query: any) {
    return this.bookingsService.getCalendarView(user.merchantId, query);
  }

  @Post('check-availability')
  @Permissions('booking.view')
  checkAvailability(@CurrentUser() user: any, @Body() dto: CheckAvailabilityDto) {
    return this.bookingsService.checkAvailability(user.merchantId, dto);
  }

  @Get('available-slots')
  @Permissions('booking.view')
  async getAvailableSlots(
    @CurrentUser() user: any,
    @Query('staffId') staffId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    const slots = await this.availabilityService.getAvailableSlots({
      staffId,
      serviceId,
      startDate: new Date(date),
      endDate: new Date(date),
    });

    return {
      staffId,
      serviceId,
      date,
      slots: slots.filter(slot => slot.available),
    };
  }

  @Get(':id')
  @Permissions('booking.view')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.findOne(user.merchantId, id);
  }

  @Patch(':id')
  @UseGuards(PinAuthGuard)
  @Permissions('booking.update')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    const booking = await this.bookingsService.update(user.merchantId, id, updateBookingDto);
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }

  @Delete(':id')
  @UseGuards(PinAuthGuard)
  @Permissions('booking.delete')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingsService.remove(user.merchantId, id);
    
    // Emit real-time update
    this.bookingsGateway.emitBookingDeleted(user.merchantId, id);
    
    return booking;
  }

  @Patch(':id/status')
  @UseGuards(PinAuthGuard)
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { status: string; cancellationReason?: string },
  ) {
    const booking = await this.bookingsService.update(user.merchantId, id, body);
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }

  @Post(':id/start')
  @UseGuards(PinAuthGuard)
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async startBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingsService.update(user.merchantId, id, {
      status: 'IN_PROGRESS',
    });
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }

  @Post(':id/complete')
  @UseGuards(PinAuthGuard)
  @Permissions('booking.update')
  @HttpCode(HttpStatus.OK)
  async completeBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingsService.update(user.merchantId, id, {
      status: 'COMPLETED',
    });
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }
}