import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus } from '../bookings/dto/create-booking.dto';
import { ServicesService } from '../services/services.service';
import { StaffService } from '../staff/staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimezoneUtils } from '@heya-pos/utils';
import { toNumber } from '../utils/decimal';

interface PublicCreateBookingDto {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  staffId?: string;
  date: string;
  startTime: string;
  notes?: string;
}

interface CheckAvailabilityDto {
  date: string;
  serviceId: string;
  staffId?: string;
}

@Controller('public')
@Public()
export class PublicBookingController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly servicesService: ServicesService,
    private readonly staffService: StaffService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('merchant-info')
  async getMerchantInfo() {
    // Get the first active merchant for now (in production, this would be based on domain/subdomain)
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        locations: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!merchant) {
      throw new BadRequestException('No active merchant found');
    }

    const location = merchant.locations[0];
    if (!location) {
      throw new BadRequestException('No active location found');
    }

    return {
      id: merchant.id,
      name: merchant.name,
      timezone: location.timezone,
      currency: 'AUD', // Default to AUD for now
      address: location.address,
      phone: location.phone,
      email: location.email,
    };
  }

  @Get('services')
  async getServices() {
    // Get the first active merchant for now (in production, this would be based on domain/subdomain)
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new BadRequestException('No active merchant found');
    }

    const services = await this.prisma.service.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
      include: {
        categoryModel: true,
      },
      orderBy: [
        { categoryModel: { sortOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return {
      data: services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: toNumber(service.price),
        duration: service.duration,
        categoryId: service.categoryId,
        categoryName: service.categoryModel?.name,
        isActive: service.isActive,
        displayOrder: service.displayOrder,
      })),
    };
  }

  @Get('staff')
  async getStaff() {
    // Get the first active merchant for now
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new BadRequestException('No active merchant found');
    }

    const staff = await this.prisma.staff.findMany({
      where: {
        merchantId: merchant.id,
        status: 'ACTIVE',
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    return {
      data: staff.map(member => ({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        phone: member.phone,
        role: 'Staff',
        isActive: member.status === 'ACTIVE',
        services: [], // TODO: Add service assignments if needed
      })),
    };
  }

  @Post('bookings/check-availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    // Get the first active merchant for now
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new BadRequestException('No active merchant found');
    }

    // Get service to know duration
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        merchantId: merchant.id,
      },
    });

    if (!service) {
      throw new BadRequestException('Service not found');
    }

    // Get first location for merchant
    const location = await this.prisma.location.findFirst({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!location) {
      throw new BadRequestException('No active location found');
    }

    // Get existing bookings for the date using timezone-aware boundaries
    const startOfDay = TimezoneUtils.startOfDayInTimezone(dto.date, location.timezone);
    const endOfDay = TimezoneUtils.endOfDayInTimezone(dto.date, location.timezone);

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        merchantId: merchant.id,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
        ...(dto.staffId && { providerId: dto.staffId }),
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Generate time slots from 9 AM to 5 PM with 30-minute intervals
    const slots = [];
    const startHour = 9;
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if this slot conflicts with existing bookings
        const slotStart = TimezoneUtils.createDateInTimezone(
          dto.date,
          time,
          location.timezone
        );
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + service.duration);
        
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          return (
            (slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd)
          );
        });
        
        // Check if slot would run past closing time in the location's timezone
        const slotEndDisplay = TimezoneUtils.toTimezoneDisplay(slotEnd, location.timezone);
        const slotEndHour = parseInt(slotEndDisplay.time.split(':')[0]);
        
        // Don't allow slots that would run past closing time
        if (slotEndHour < endHour || (slotEndHour === endHour && slotEnd.getMinutes() === 0)) {
          slots.push({
            time,
            available: !hasConflict,
          });
        }
      }
    }

    return { slots };
  }

  @Post('bookings')
  async createBooking(@Body() dto: PublicCreateBookingDto) {
    // Get the first active merchant for now
    const merchant = await this.prisma.merchant.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!merchant) {
      throw new BadRequestException('No active merchant found');
    }

    // Get service details
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        merchantId: merchant.id,
      },
    });

    if (!service) {
      throw new BadRequestException('Service not found');
    }

    // Get first location for merchant
    const location = await this.prisma.location.findFirst({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!location) {
      throw new BadRequestException('No active location found');
    }

    // Calculate start and end times using the location's timezone
    const startTime = TimezoneUtils.createDateInTimezone(
      dto.date,
      dto.startTime,
      location.timezone
    );
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration);

    // Create or find customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        merchantId: merchant.id,
        OR: [
          { email: dto.customerEmail },
          { phone: dto.customerPhone },
        ],
      },
    });

    if (!customer) {
      const [firstName, ...lastNameParts] = dto.customerName.split(' ');
      customer = await this.prisma.customer.create({
        data: {
          merchantId: merchant.id,
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || '',
          email: dto.customerEmail,
          phone: dto.customerPhone,
        },
      });
    }

    // Get staff member or use first available
    let staffId = dto.staffId;
    if (!staffId) {
      const firstStaff = await this.prisma.staff.findFirst({
        where: {
          merchantId: merchant.id,
          status: 'ACTIVE',
        },
      });
      staffId = firstStaff?.id;
    }

    if (!staffId) {
      throw new BadRequestException('No staff available');
    }

    // Use the bookings service to create the booking (which generates proper booking number)
    const booking = await this.bookingsService.create(
      merchant.id,
      {
        customerId: customer.id,
        providerId: staffId,
        locationId: location.id,
        startTime: startTime.toISOString(),
        services: [{
          serviceId: service.id,
          price: toNumber(service.price),
          duration: service.duration,
        }],
        totalAmount: toNumber(service.price),
        notes: dto.notes,
        status: BookingStatus.CONFIRMED,
      },
      staffId,
    );

    console.log('Public controller received booking:', booking.id, 'with number:', booking.bookingNumber);

    const firstService = booking.services?.[0];
    const serviceName = firstService?.service?.name || service.name;
    
    // Convert the stored UTC times back to the location's timezone for display
    const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(booking.startTime, location.timezone);
    const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(booking.endTime, location.timezone);
    
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      serviceId: service.id,
      serviceName: serviceName,
      staffId: booking.providerId,
      staffName: `${booking.provider.firstName} ${booking.provider.lastName}`,
      date: startTimeDisplay.date.split('/')[2] + '-' + 
            startTimeDisplay.date.split('/')[1].padStart(2, '0') + '-' + 
            startTimeDisplay.date.split('/')[0].padStart(2, '0'), // Convert DD/MM/YYYY to YYYY-MM-DD
      startTime: startTimeDisplay.time.substring(0, 5), // Remove seconds if present
      endTime: endTimeDisplay.time.substring(0, 5), // Remove seconds if present
      duration: service.duration,
      price: toNumber(service.price),
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  @Get('bookings/:id')
  async getBooking(@Param('id') id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        customer: true,
        provider: true,
        location: true,
      },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const service = booking.services[0]?.service;
    
    // Convert times to location timezone for display
    const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(booking.startTime, booking.location.timezone);
    const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(booking.endTime, booking.location.timezone);
    
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone,
      serviceId: service?.id,
      serviceName: service?.name,
      staffId: booking.providerId,
      staffName: `${booking.provider.firstName} ${booking.provider.lastName}`,
      date: startTimeDisplay.date.split('/')[2] + '-' + 
            startTimeDisplay.date.split('/')[1].padStart(2, '0') + '-' + 
            startTimeDisplay.date.split('/')[0].padStart(2, '0'), // Convert DD/MM/YYYY to YYYY-MM-DD
      startTime: startTimeDisplay.time.substring(0, 5), // Remove seconds if present
      endTime: endTimeDisplay.time.substring(0, 5), // Remove seconds if present
      duration: service?.duration || 0,
      price: toNumber(booking.totalAmount),
      status: booking.status,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }
}