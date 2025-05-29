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
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsGateway } from './bookings.gateway';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PinAuthGuard } from '../auth/guards/pin-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly bookingsGateway: BookingsGateway,
  ) {}

  @Post()
  @UseGuards(PinAuthGuard)
  @Permissions('bookings.create')
  async create(@CurrentUser() user: any, @Body() createBookingDto: CreateBookingDto) {
    const booking = await this.bookingsService.create(user.merchantId, createBookingDto, user.staffId || user.id);
    
    // Emit real-time update
    this.bookingsGateway.emitBookingCreated(user.merchantId, booking);
    
    return booking;
  }

  @Get()
  @Permissions('bookings.read')
  findAll(@CurrentUser() user: any, @Query() params: any) {
    return this.bookingsService.findAll(user.merchantId, params);
  }

  @Get('calendar')
  @Permissions('bookings.read')
  getCalendarView(@CurrentUser() user: any, @Query() params: any) {
    return this.bookingsService.getCalendarView(user.merchantId, params);
  }

  @Post('check-availability')
  @Permissions('bookings.read')
  @HttpCode(HttpStatus.OK)
  checkAvailability(
    @CurrentUser() user: any,
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.bookingsService.checkAvailability(user.merchantId, checkAvailabilityDto);
  }

  @Get(':id')
  @Permissions('bookings.read')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingsService.findOne(user.merchantId, id);
  }

  @Patch(':id')
  @UseGuards(PinAuthGuard)
  @Permissions('bookings.update')
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
  @Permissions('bookings.delete')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingsService.remove(user.merchantId, id);
    
    // Emit real-time update
    this.bookingsGateway.emitBookingDeleted(user.merchantId, id, booking);
    
    return booking;
  }

  @Patch(':id/status')
  @UseGuards(PinAuthGuard)
  @Permissions('bookings.update')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const booking = await this.bookingsService.update(user.merchantId, id, { status: status as any });
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }

  @Post(':id/start')
  @UseGuards(PinAuthGuard)
  @Permissions('bookings.update')
  @HttpCode(HttpStatus.OK)
  async startBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingsService.update(user.merchantId, id, {
      status: 'IN_PROGRESS' as any,
    });
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }

  @Post(':id/complete')
  @UseGuards(PinAuthGuard)
  @Permissions('bookings.update')
  @HttpCode(HttpStatus.OK)
  async completeBooking(@CurrentUser() user: any, @Param('id') id: string) {
    const booking = await this.bookingsService.update(user.merchantId, id, {
      status: 'COMPLETED' as any,
    });
    
    // Emit real-time update
    this.bookingsGateway.emitBookingUpdated(user.merchantId, booking);
    
    return booking;
  }
}