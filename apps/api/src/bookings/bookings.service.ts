import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, BookingStatus } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { Prisma } from '@prisma/client';
import { addMinutes, startOfDay, endOfDay, format, parse, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private loyaltyService: LoyaltyService
  ) {}

  async create(merchantId: string, dto: CreateBookingDto, createdById: string) {
    // Validate customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, merchantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Validate staff exists and is available
    const provider = await this.prisma.staff.findFirst({
      where: { id: dto.providerId, merchantId, status: 'ACTIVE' },
    });
    if (!provider) {
      throw new NotFoundException('Staff not found or inactive');
    }

    // Validate services exist
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: dto.services.map(s => s.serviceId) },
        merchantId,
        isActive: true,
      },
    });

    if (services.length !== dto.services.length) {
      throw new BadRequestException('One or more services not found or inactive');
    }

    // Calculate total duration and end time
    const totalDuration = dto.services.reduce((sum, s) => sum + s.duration, 0);
    const startTime = new Date(dto.startTime);
    const endTime = addMinutes(startTime, totalDuration);

    // Check availability
    const isAvailable = await this.checkStaffAvailability(
      provider.id,
      startTime,
      totalDuration,
    );

    if (!isAvailable) {
      throw new ConflictException('Staff is not available at this time');
    }

    // Create booking with retry logic for booking number generation
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Generate booking number
        const bookingNumber = await this.generateBookingNumber(merchantId);

        // Create booking with services
        const booking = await this.prisma.booking.create({
          data: {
            merchantId,
            locationId: dto.locationId || '',
            customerId: dto.customerId,
            providerId: dto.providerId,
            createdById: dto.createdById || createdById,
            bookingNumber,
            startTime,
            endTime,
            status: dto.status || BookingStatus.CONFIRMED,
            notes: dto.notes,
            totalAmount: dto.totalAmount,
            depositAmount: 0,
            reminderSent: false,
            services: {
              create: dto.services.map(s => ({
                serviceId: s.serviceId,
                price: s.price,
                duration: s.duration,
                staffId: dto.providerId, // Default to main provider
              })),
            },
          },
          include: {
            customer: true,
            provider: true,
            services: {
              include: {
                service: true,
              },
            },
          },
        });

        return booking;
      } catch (error: any) {
        attempts++;
        
        // If it's a unique constraint violation on bookingNumber, retry
        if (error.code === 'P2002' && error.meta?.target?.includes('bookingNumber') && attempts < maxAttempts) {
          // Wait a small random time before retrying
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          continue;
        }
        
        // For any other error or max attempts reached, throw
        throw error;
      }
    }

    throw new Error('Failed to generate unique booking number after multiple attempts');
  }

  async findAll(merchantId: string, params: any) {
    const {
      date,
      startDate,
      endDate,
      providerId,
      customerId,
      status,
      locationId,
      includeAll = false,
      page = 1,
      limit = 20,
    } = params;

    const where: Prisma.BookingWhereInput = {
      merchantId,
    };

    // Handle date filtering
    if (!includeAll) {
      if (date) {
        // Single date filter - use local date boundaries
        const dateObj = new Date(date);
        where.startTime = {
          gte: startOfDay(dateObj),
          lte: endOfDay(dateObj),
        };
      } else if (startDate || endDate) {
        // Date range filter
        where.startTime = {};
        if (startDate) {
          where.startTime.gte = startOfDay(new Date(startDate));
        }
        if (endDate) {
          where.startTime.lte = endOfDay(new Date(endDate));
        }
      } else {
        // Default: show upcoming bookings (today and future)
        where.startTime = {
          gte: startOfDay(new Date()),
        };
      }
    }
    // If includeAll is true, don't add any date filters

    // Add other filters
    if (providerId) where.providerId = providerId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (locationId) where.locationId = locationId;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          customer: true,
          provider: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(merchantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, merchantId },
      include: {
        customer: true,
        provider: true,
        createdBy: true,
        services: {
          include: {
            service: true,
            staff: true,
          },
        },
        invoice: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async update(merchantId: string, id: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(merchantId, id);

    // If rescheduling, check new availability
    if (dto.startTime && dto.startTime !== booking.startTime.toISOString()) {
      const totalDuration = booking.services.reduce((sum, s) => sum + s.duration, 0);
      const newStartTime = new Date(dto.startTime);

      const isAvailable = await this.checkStaffAvailability(
        dto.providerId || booking.providerId,
        newStartTime,
        totalDuration,
        id, // Exclude current booking
      );

      if (!isAvailable) {
        throw new ConflictException('Staff is not available at this time');
      }
    }

    // Handle status changes
    if (dto.status) {
      await this.handleStatusChange(booking, dto.status);
    }

    const updateData: any = {
      ...(dto.startTime && { startTime: new Date(dto.startTime) }),
      ...(dto.status && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.status === BookingStatus.CONFIRMED && { confirmedAt: new Date() }),
      ...(dto.status === BookingStatus.IN_PROGRESS && { checkedInAt: new Date() }),
      ...(dto.status === BookingStatus.COMPLETED && { completedAt: new Date() }),
      ...(dto.status === BookingStatus.CANCELLED && { 
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
      }),
    };

    // If rescheduling, update end time too
    if (dto.startTime) {
      const totalDuration = booking.services.reduce((sum: number, s: any) => sum + s.duration, 0);
      updateData.endTime = addMinutes(new Date(dto.startTime), totalDuration);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        provider: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    // Process loyalty points/visits when booking is completed
    if (dto.status === BookingStatus.COMPLETED) {
      try {
        await this.loyaltyService.processBookingCompletion(id);
      } catch (error) {
        // Log error but don't fail the booking update
        console.error('Failed to process loyalty for booking:', error);
      }
    }

    return updatedBooking;
  }

  async remove(merchantId: string, id: string) {
    await this.findOne(merchantId, id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Deleted by staff',
        cancelledAt: new Date(),
      },
    });
  }

  async checkAvailability(merchantId: string, dto: CheckAvailabilityDto) {
    const date = new Date(dto.date);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Get business hours (example: 9 AM - 7 PM)
    const businessStart = new Date(dayStart);
    businessStart.setHours(9, 0, 0, 0);
    const businessEnd = new Date(dayStart);
    businessEnd.setHours(19, 0, 0, 0);

    // Get services to calculate duration
    let totalDuration = dto.duration;
    if (!totalDuration && dto.serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: {
          id: { in: dto.serviceIds },
          merchantId,
        },
      });
      totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    }

    // Get staff members
    const staffWhere: Prisma.StaffWhereInput = {
      merchantId,
      status: 'ACTIVE',
      ...(dto.staffId && { id: dto.staffId }),
      ...(dto.locationId && {
        locations: {
          some: { locationId: dto.locationId },
        },
      }),
    };

    const staffMembers = await this.prisma.staff.findMany({
      where: staffWhere,
    });

    // Get existing bookings for the day
    const bookings = await this.prisma.booking.findMany({
      where: {
        merchantId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        ...(dto.excludeBookingId && { NOT: { id: dto.excludeBookingId } }),
        ...(dto.staffId && { providerId: dto.staffId }),
      },
      include: {
        services: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Generate available time slots
    const slots = [];
    const slotDuration = 30; // 30-minute slots

    for (const staff of staffMembers) {
      const staffBookings = bookings.filter(b => b.providerId === staff.id);
      const staffSlots = [];

      let currentTime = new Date(businessStart);
      while (isBefore(currentTime, businessEnd)) {
        const slotEnd = addMinutes(currentTime, totalDuration || slotDuration);

        // Check if slot fits within business hours
        if (isAfter(slotEnd, businessEnd)) {
          break;
        }

        // Check if slot conflicts with existing bookings
        const hasConflict = staffBookings.some(booking => {
          const bookingDuration = booking.services.reduce((sum, s) => sum + s.duration, 0);
          const bookingEnd = addMinutes(booking.startTime, bookingDuration);
          const bookingInterval = { start: booking.startTime, end: bookingEnd };
          
          return (
            isWithinInterval(currentTime, bookingInterval) ||
            isWithinInterval(slotEnd, bookingInterval) ||
            (isBefore(currentTime, booking.startTime) && isAfter(slotEnd, booking.startTime))
          );
        });

        if (!hasConflict) {
          staffSlots.push({
            time: format(currentTime, 'HH:mm'),
            available: true,
            staffId: staff.id,
            staffName: `${staff.firstName} ${staff.lastName}`,
          });
        }

        currentTime = addMinutes(currentTime, slotDuration);
      }

      slots.push({
        staffId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        slots: staffSlots,
      });
    }

    return dto.staffId ? slots[0]?.slots || [] : slots;
  }

  async getCalendarView(merchantId: string, params: any) {
    const { date, view = 'day', providerId, locationId } = params;
    
    // Handle missing or invalid date
    let viewDate: Date;
    if (!date) {
      viewDate = new Date(); // Default to today
    } else {
      viewDate = new Date(date);
      // Check if date is valid
      if (isNaN(viewDate.getTime())) {
        viewDate = new Date(); // Default to today if invalid
      }
    }

    let startDate: Date;
    let endDate: Date;

    if (view === 'week') {
      // Get week start (Monday) and end (Sunday)
      const day = viewDate.getDay();
      const diff = viewDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(viewDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = startOfDay(viewDate);
      endDate = endOfDay(viewDate);
    }

    const where: Prisma.BookingWhereInput = {
      merchantId,
      startTime: { gte: startDate, lte: endDate },
      ...(providerId && { providerId }),
      ...(locationId && { locationId }),
    };

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        customer: true,
        provider: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Get staff members for the calendar
    const staff = await this.prisma.staff.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
        ...(providerId && { id: providerId }),
        ...(locationId && {
          locations: {
            some: { locationId },
          },
        }),
      },
    });

    return {
      bookings,
      staff,
      view,
      startDate,
      endDate,
    };
  }

  private async checkStaffAvailability(
    staffId: string,
    startTime: Date,
    duration: number,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const endTime = addMinutes(startTime, duration);

    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        providerId: staffId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS] },
        ...(excludeBookingId && { NOT: { id: excludeBookingId } }),
        OR: [
          // New booking starts during existing booking
          {
            startTime: { lte: startTime },
            AND: {
              services: {
                some: {}, // Has services
              },
            },
          },
        ],
      },
      include: {
        services: true,
      },
    });

    if (conflictingBooking) {
      // Calculate actual end time of conflicting booking
      const conflictingDuration = conflictingBooking.services.reduce((sum, s) => sum + s.duration, 0);
      const conflictingEndTime = addMinutes(conflictingBooking.startTime, conflictingDuration);

      // Check for actual conflict
      if (
        (isAfter(startTime, conflictingBooking.startTime) && isBefore(startTime, conflictingEndTime)) ||
        (isAfter(endTime, conflictingBooking.startTime) && isBefore(endTime, conflictingEndTime)) ||
        (isBefore(startTime, conflictingBooking.startTime) && isAfter(endTime, conflictingEndTime))
      ) {
        return false;
      }
    }

    return true;
  }

  private async handleStatusChange(booking: any, newStatus: BookingStatus) {
    const oldStatus = booking.status;

    // Update customer stats based on status change
    if (newStatus === BookingStatus.COMPLETED && oldStatus !== BookingStatus.COMPLETED) {
      // Increment visit count and total spent
      await this.prisma.customer.update({
        where: { id: booking.customerId },
        data: {
          visitCount: { increment: 1 },
          totalSpent: { increment: booking.totalAmount },
        },
      });

      // Award loyalty points (example: 1 point per $10 spent)
      const pointsToAward = Math.floor(booking.totalAmount / 10);
      if (pointsToAward > 0) {
        await this.prisma.customer.update({
          where: { id: booking.customerId },
          data: {
            loyaltyPoints: { increment: pointsToAward },
          },
        });
      }
    }
  }

  private async generateBookingNumber(merchantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get the count of bookings for this merchant this month
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0);
    
    const count = await this.prisma.booking.count({
      where: {
        merchantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Add a random 3-digit suffix to prevent collisions in concurrent requests
    const sequence = String(count + 1).padStart(4, '0');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `B${year}${month}${sequence}-${randomSuffix}`;
  }
}