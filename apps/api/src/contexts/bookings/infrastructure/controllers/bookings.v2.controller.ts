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
  ParseUUIDPipe,
  UsePipes,
  BadRequestException,
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
import { CustomValidationPipe } from '../../../../common/validation/validation.pipe';
import { CreateBookingV2Dto } from '../dto/create-booking-v2.dto';
import { UpdateBookingV2Dto } from '../dto/update-booking-v2.dto';
import { QueryBookingsDto, CalendarViewDto } from '../dto/query-bookings.dto';

@Controller({
  path: 'bookings',
  version: '2', // This marks it as v2
})
@UseGuards(JwtAuthGuard, PinAuthGuard)
@UsePipes(new CustomValidationPipe())
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
    @Query() queryDto: QueryBookingsDto,
  ) {
    const query = new GetBookingsListQuery({
      merchantId: user.merchantId,
      filters: {
        staffId: queryDto.staffId,
        customerId: queryDto.customerId,
        status: queryDto.status,
        startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
        endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
      },
      pagination: {
        page: queryDto.page || 1,
        limit: queryDto.limit || 20,
      },
    });

    const result = await this.queryBus.execute(query);

    // Transform status to lowercase for all items
    const transformedItems = result.items.map((item: any) => {
      if (item && item.status) {
        item.status = item.status.toLowerCase().replace(/_/g, '-');
      }
      return item;
    });

    return {
      data: transformedItems,
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
    @Query() queryDto: CalendarViewDto,
  ) {
    const query = new GetCalendarViewQuery({
      merchantId: user.merchantId,
      date: new Date(queryDto.startDate),
      view: queryDto.view || 'week',
      staffIds: queryDto.staffId ? [queryDto.staffId] : undefined,
      locationId: queryDto.locationId,
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
    
    // Transform status to lowercase for consistency
    if (booking && booking.status) {
      booking.status = booking.status.toLowerCase().replace(/_/g, '-');
    }
    
    return booking;
  }

  @Post()
  @Permissions('booking.create')
  async create(@CurrentUser() user: any, @Body() dto: CreateBookingV2Dto) {
    console.log('[BookingsV2Controller] Received DTO:', JSON.stringify(dto, null, 2));
    console.log('[BookingsV2Controller] Services array:', JSON.stringify(dto.services, null, 2));
    
    // Validate that at least one service has a staff ID
    const hasStaffAssignment = dto.services.some(s => s.staffId) || dto.staffId;
    if (!hasStaffAssignment) {
      throw new Error('At least one service must have a staff assignment, or provide a top-level staff ID');
    }
    
    // Determine createdById - use user's staffId if they have one (staff users),
    // otherwise use the booking's assigned staff (merchant users)
    let createdById: string;
    if (user.staffId) {
      // Staff user - use their ID
      createdById = user.staffId;
      console.log('[BookingsV2Controller] Using staff user ID for createdById:', createdById);
    } else {
      // Merchant user - use the booking's assigned staff for audit purposes
      // This matches the pattern used in public-booking.service.ts
      createdById = dto.staffId || dto.services.find(s => s.staffId)?.staffId;
      console.log('[BookingsV2Controller] Merchant user detected, using booking staff for createdById:', createdById);
      if (!createdById) {
        throw new Error('Unable to determine staff for booking creation');
      }
    }
    
    // Map services to include staff IDs
    const servicesWithStaff = dto.services.map(service => ({
      serviceId: service.serviceId,
      staffId: service.staffId || dto.staffId,
      price: service.price,
      duration: service.duration,
    }));
    
    // LocationId is now optional in database, but we should try to provide one
    // Get from DTO first, then from merchant's first location
    const locationId = dto.locationId || user.merchant?.locations?.[0]?.id;
    
    if (!locationId) {
      console.log('[BookingsV2Controller] WARNING: No locationId found, will let database handle constraint');
    }
    
    const command = new CreateBookingCommand({
      customerId: dto.customerId,
      staffId: dto.staffId, // Optional top-level staff ID
      services: servicesWithStaff, // Pass all services
      locationId: locationId,
      startTime: new Date(dto.startTime),
      merchantId: user.merchantId,
      notes: dto.notes,
      source: dto.source || 'IN_PERSON',
      createdById: createdById, // Use the determined createdById
      isOverride: dto.isOverride,
      overrideReason: dto.overrideReason,
    });

    const booking = await this.createBookingHandler.execute(command);
    
    // Fetch the full booking details to return enriched data
    const query = new GetBookingByIdQuery({
      bookingId: booking.id,
      merchantId: user.merchantId,
    });
    
    const enrichedBooking = await this.queryBus.execute(query);
    
    // Return in the same format as the list endpoint
    return {
      id: enrichedBooking.id,
      bookingNumber: enrichedBooking.bookingNumber,
      customerName: enrichedBooking.customer.name,
      customerPhone: enrichedBooking.customer.phone,
      staffId: enrichedBooking.staff.id,
      staffName: enrichedBooking.staff.name,
      serviceName: enrichedBooking.services.length > 1
        ? enrichedBooking.services.map((s: any) => s.name).join(' + ')
        : enrichedBooking.services[0]?.name || 'Unknown Service',
      services: enrichedBooking.services,
      startTime: enrichedBooking.startTime,
      endTime: enrichedBooking.endTime,
      status: enrichedBooking.status ? enrichedBooking.status.toLowerCase().replace(/_/g, '-') : 'confirmed',
      totalAmount: enrichedBooking.totalAmount,
      totalDuration: enrichedBooking.totalDuration,
      locationName: enrichedBooking.location.name,
      createdAt: enrichedBooking.createdAt,
    };
  }

  @Patch(':id')
  @Permissions('booking.update')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingV2Dto,
  ) {
    console.log('[BookingsV2Controller] Update booking request:', {
      bookingId: id,
      dto: JSON.stringify(dto, null, 2),
      merchantId: user.merchantId,
    });
    
    const updateData: any = {
      bookingId: id,
      merchantId: user.merchantId,
    };

    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.staffId) {
      updateData.staffId = dto.staffId;
    }
    if (dto.services && dto.services.length > 0) {
      // For now, handle single service update
      updateData.serviceId = dto.services[0].serviceId;
    }
    if (dto.status) updateData.status = dto.status;
    if (dto.cancellationReason) updateData.cancellationReason = dto.cancellationReason;

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

  @Post(':id/mark-paid')
  @Permissions('booking.update', 'payment.create')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { paymentMethod?: string; notes?: string; amount?: number; reference?: string },
  ) {
    const startTime = Date.now();
    
    try {
      const serviceStart = Date.now();
      const updatedBooking = await this.bookingUpdateService.markBookingAsPaid(
        id,
        user.merchantId,
        body.paymentMethod || 'CASH',
        body.amount,
        body.reference,
      );
      console.log(`[PERF] Service call took: ${Date.now() - serviceStart}ms`);
      
      const responseStart = Date.now();
      const response = {
        success: true,
        message: 'Booking marked as paid successfully',
        booking: {
          id: updatedBooking.id,
          bookingNumber: updatedBooking.bookingNumber,
          paymentStatus: updatedBooking.paymentStatus,
          paidAmount: Number(updatedBooking.paidAmount),
          balanceDue: Number(updatedBooking.totalAmount) - Number(updatedBooking.paidAmount),
          paymentMethod: updatedBooking.paymentMethod,
          paidAt: updatedBooking.paidAt,
          totalAmount: Number(updatedBooking.totalAmount),
        },
      };
      console.log(`[PERF] Response prep took: ${Date.now() - responseStart}ms`);
      console.log(`[PERF] Total controller time: ${Date.now() - startTime}ms`);
      
      return response;
    } catch (error) {
      throw new BadRequestException(
        `Failed to mark booking as paid: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert domain entity to DTO
   * This is part of the anti-corruption layer
   */
  private toDto(booking: any) {
    // Convert status to lowercase hyphenated format
    const statusValue = booking.status?.value || booking.status || 'CONFIRMED';
    const status = statusValue.toLowerCase().replace(/_/g, '-');
    
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status,
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