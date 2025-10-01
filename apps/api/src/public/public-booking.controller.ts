import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { PublicBookingService } from "../contexts/bookings/application/services/public-booking.service";
import { ServicesService } from "../services/services.service";
import { StaffService } from "../staff/staff.service";
import { PrismaService } from "../prisma/prisma.service";
import { TimezoneUtils } from "../utils/shared/timezone";
import { toNumber } from "../utils/decimal";
import { formatName } from "../utils/shared/format";
import { IsDateString, IsOptional, IsString } from "class-validator";

interface PublicCreateBookingDto {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  // Support both single service (backward compatibility) and multiple services
  serviceId?: string;
  staffId?: string;
  // New fields for multiple services
  services?: Array<{
    serviceId: string;
    staffId?: string;
  }>;
  date: string;
  startTime: string;
  notes?: string;
}

interface CheckAvailabilityDto {
  date: string;
  // Support both single service (backward compatibility) and multiple services
  serviceId?: string;
  staffId?: string;
  // New fields for multiple services
  services?: Array<{
    serviceId: string;
    staffId?: string;
  }>;
}

class PublicStaffQueryDto {
  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

@Controller("public")
@Public()
export class PublicBookingController {
  constructor(
    private readonly publicBookingService: PublicBookingService,
    private readonly servicesService: ServicesService,
    private readonly staffService: StaffService,
    private readonly prisma: PrismaService,
  ) {}

  // Helper method to get merchant by subdomain
  private async getMerchantBySubdomain(
    subdomain?: string,
    headerSubdomain?: string,
  ) {
    const merchantSubdomain = subdomain || headerSubdomain;

    if (!merchantSubdomain) {
      throw new BadRequestException("Merchant subdomain is required");
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: {
        subdomain: merchantSubdomain,
        status: "ACTIVE",
      },
    });

    if (!merchant) {
      throw new BadRequestException(`Merchant not found: ${merchantSubdomain}`);
    }

    return merchant;
  }

  @Get("merchant-info")
  async getMerchantInfo(
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    // Use helper to get merchant (without locations)
    const merchantBase = await this.getMerchantBySubdomain(
      subdomain,
      headerSubdomain,
    );

    // Fetch merchant with locations
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantBase.id },
      include: {
        locations: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    const location = merchant.locations[0];
    if (!location) {
      throw new BadRequestException("No active location found");
    }

    const settings = merchant.settings as any;

    return {
      id: merchant.id,
      name: merchant.name,
      logo: merchant.logo,
      timezone: location.timezone,
      currency: settings?.currency || "AUD",
      address: location.address,
      suburb: location.suburb,
      state: location.state,
      postalCode: location.postalCode,
      phone: location.phone,
      email: location.email,
      businessHours: settings?.businessHours || location.businessHours,
      requireDeposit: settings?.requireDeposit || false,
      depositPercentage: settings?.depositPercentage || 0,
      allowUnassignedBookings: settings?.allowUnassignedBookings ?? true,
      settings: {
        bookingAdvanceHours: settings?.bookingAdvanceHours || 168, // Default 7 days
        cancellationHours: settings?.cancellationHours || 24, // Default 24 hours
        minimumBookingNotice: settings?.minimumBookingNotice || 0, // Default no restriction
        appointmentReminder24hEmail:
          settings?.appointmentReminder24hEmail ?? true,
        appointmentReminder24hSms: settings?.appointmentReminder24hSms ?? false,
        appointmentReminder2hEmail:
          settings?.appointmentReminder2hEmail ?? true,
        appointmentReminder2hSms: settings?.appointmentReminder2hSms ?? false,
        autoConfirmBookings: settings?.autoConfirmBookings ?? true, // Default to auto-confirm
      },
    };
  }

  @Get("services")
  async getServices(
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    const merchant = await this.getMerchantBySubdomain(
      subdomain,
      headerSubdomain,
    );

    const services = await this.prisma.service.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
      include: {
        categoryModel: true,
      },
      orderBy: [
        { categoryModel: { sortOrder: "asc" } },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    return {
      data: services.map((service) => ({
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

  @Get("staff")
  async getStaff(
    @Query() query: PublicStaffQueryDto,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    const merchant = await this.getMerchantBySubdomain(
      query.subdomain,
      headerSubdomain,
    );

    const staffMembers = await this.prisma.staff.findMany({
      where: {
        merchantId: merchant.id,
        status: "ACTIVE",
      },
      orderBy: {
        firstName: "asc",
      },
    });

    const targetDate = query.date ? new Date(query.date) : null;
    let filteredStaff = staffMembers;

    if (targetDate && staffMembers.length > 0) {
      const overrides = await this.prisma.scheduleOverride.findMany({
        where: {
          staffId: { in: staffMembers.map((member) => member.id) },
          date: targetDate,
        },
        select: {
          staffId: true,
          startTime: true,
          endTime: true,
        },
      });

      if (overrides.length > 0) {
        const dayOffStaffIds = new Set(
          overrides
            .filter((override) => !override.startTime || !override.endTime)
            .map((override) => override.staffId),
        );

        filteredStaff = filteredStaff.filter(
          (member) => !dayOffStaffIds.has(member.id),
        );
      }
    }

    return {
      data: filteredStaff.map((member) => ({
        id: member.id,
        name: formatName(member.firstName, member.lastName),
        email: member.email,
        phone: member.phone,
        role: "Staff",
        isActive: member.status === "ACTIVE",
        services: [], // TODO: Add service assignments if needed
      })),
    };
  }

  @Post("customers/lookup")
  @HttpCode(HttpStatus.OK)
  async lookupCustomer(
    @Body() dto: { email?: string; phone?: string },
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    // Validate input - need at least one identifier
    if (!dto.email && !dto.phone) {
      throw new BadRequestException("Email or phone number is required");
    }

    const merchant = await this.getMerchantBySubdomain(
      subdomain,
      headerSubdomain,
    );

    if (!merchant) {
      throw new BadRequestException("No active merchant found");
    }

    // Find customer by email or phone
    const customer = await this.prisma.customer.findFirst({
      where: {
        merchantId: merchant.id,
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (!customer) {
      return { found: false };
    }

    // Return sanitized customer data
    return {
      found: true,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        // Don't expose sensitive data like birthday, notes, etc.
      },
    };
  }

  @Post("bookings/check-availability")
  @HttpCode(HttpStatus.OK)
  async checkAvailability(
    @Body() dto: CheckAvailabilityDto,
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    try {
      const merchant = await this.getMerchantBySubdomain(
        subdomain,
        headerSubdomain,
      );

      // Debug logging
      console.log("[PUBLIC API] Check availability request:", {
        date: dto.date,
        staffId: dto.staffId,
        services: dto.services,
        serviceId: dto.serviceId,
        merchantId: merchant.id,
      });

      const result = await this.publicBookingService.checkAvailability(
        dto,
        merchant.id,
      );

      console.log("[PUBLIC API] Availability response:", {
        totalSlots: result.slots?.length || 0,
        availableSlots: result.slots?.filter((s) => s.available).length || 0,
        lastAvailableSlot:
          result.slots?.filter((s) => s.available).slice(-1)[0]?.time || "none",
      });

      return result;
    } catch (error: any) {
      console.error("[PUBLIC API] Check availability error:", error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Post("bookings")
  async createBooking(
    @Body() dto: PublicCreateBookingDto,
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    try {
      const merchant = await this.getMerchantBySubdomain(
        subdomain,
        headerSubdomain,
      );
      return await this.publicBookingService.createPublicBooking(
        dto,
        merchant.id,
      );
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  // Get customer's confirmed bookings
  @Get("customers/:customerId/bookings")
  async getCustomerBookings(
    @Param("customerId") customerId: string,
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException("Customer ID is required");
    }

    const merchant = await this.getMerchantBySubdomain(
      subdomain,
      headerSubdomain,
    );

    // Get merchant's timezone from first location
    const location = await this.prisma.location.findFirst({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
    });

    const timezone = location?.timezone || "Australia/Sydney";

    // Get today's date range in merchant timezone
    const startOfDay = TimezoneUtils.startOfDayInTimezone(new Date(), timezone);
    const endOfDay = TimezoneUtils.endOfDayInTimezone(new Date(), timezone);

    const bookings = await this.prisma.booking.findMany({
      where: {
        customerId,
        merchantId: merchant.id,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: "CONFIRMED",
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
        startTime: "asc",
      },
    });

    return {
      bookings: bookings.map((booking) => {
        const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(
          booking.startTime,
          timezone,
        );
        const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(
          booking.endTime,
          timezone,
        );

        return {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          serviceName: booking.services[0]?.service?.name || "Service",
          staffName: booking.provider
            ? formatName(booking.provider.firstName, booking.provider.lastName)
            : "Unassigned",
          startTime: startTimeDisplay.time.substring(0, 5), // HH:MM format
          endTime: endTimeDisplay.time.substring(0, 5),
          status: booking.status,
        };
      }),
    };
  }

  @Get("bookings/:id")
  async getBooking(@Param("id") id: string) {
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
      throw new BadRequestException("Booking not found");
    }

    const service = booking.services[0]?.service;

    // Convert times to location timezone for display
    const startTimeDisplay = TimezoneUtils.toTimezoneDisplay(
      booking.startTime,
      booking.location.timezone,
    );
    const endTimeDisplay = TimezoneUtils.toTimezoneDisplay(
      booking.endTime,
      booking.location.timezone,
    );

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: formatName(
        booking.customer.firstName,
        booking.customer.lastName,
      ),
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone,
      serviceId: service?.id,
      serviceName: service?.name,
      staffId: booking.providerId,
      staffName: formatName(
        booking.provider.firstName,
        booking.provider.lastName,
      ),
      date:
        startTimeDisplay.date.split("/")[2] +
        "-" +
        startTimeDisplay.date.split("/")[1].padStart(2, "0") +
        "-" +
        startTimeDisplay.date.split("/")[0].padStart(2, "0"), // Convert DD/MM/YYYY to YYYY-MM-DD
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

  @Get("service-categories")
  async getServiceCategories(
    @Query("subdomain") subdomain?: string,
    @Headers("x-merchant-subdomain") headerSubdomain?: string,
  ) {
    const merchant = await this.getMerchantBySubdomain(
      subdomain,
      headerSubdomain,
    );

    const categories = await this.prisma.serviceCategory.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return {
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        displayOrder: category.sortOrder,
        isActive: category.isActive,
      })),
    };
  }
}
