import { Test, TestingModule } from "@nestjs/testing";
import { BookingCreationService } from "./booking-creation.service";
import { PrismaService } from "../../../../prisma/prisma.service";
import { IBookingRepository } from "../../domain/repositories/booking.repository.interface";
import { OutboxEventRepository } from "../../../shared/outbox/infrastructure/outbox-event.repository";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";
import { ConflictException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Booking } from "../../domain/entities/booking.entity";
import { TimeSlot } from "../../domain/value-objects/time-slot.vo";
import { BookingStatusValue } from "../../domain/value-objects/booking-status.vo";
import { OrdersService } from "../../../../payments/orders.service";
import { UnassignedCapacityService } from "./unassigned-capacity.service";

describe("BookingCreationService", () => {
  let service: BookingCreationService;
  let prisma: DeepMockProxy<PrismaService>;
  let bookingRepository: DeepMockProxy<IBookingRepository>;
  let outboxRepository: DeepMockProxy<OutboxEventRepository>;
  let eventEmitter: DeepMockProxy<EventEmitter2>;
  let ordersService: DeepMockProxy<OrdersService>;
  let unassignedCapacityService: DeepMockProxy<UnassignedCapacityService>;

  const mockTransaction = {
    $queryRaw: jest.fn(),
    merchant: { findUnique: jest.fn() },
    staff: { findUnique: jest.fn(), findMany: jest.fn() },
    staffSchedule: { findFirst: jest.fn() },
    service: { findUnique: jest.fn() },
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    merchantHoliday: { findFirst: jest.fn() },
    scheduleOverride: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingCreationService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
        {
          provide: "IBookingRepository",
          useValue: mockDeep<IBookingRepository>(),
        },
        {
          provide: OutboxEventRepository,
          useValue: mockDeep<OutboxEventRepository>(),
        },
        {
          provide: EventEmitter2,
          useValue: mockDeep<EventEmitter2>(),
        },
        {
          provide: OrdersService,
          useValue: mockDeep<OrdersService>(),
        },
        {
          provide: UnassignedCapacityService,
          useValue: mockDeep<UnassignedCapacityService>(),
        },
      ],
    }).compile();

    service = module.get<BookingCreationService>(BookingCreationService);
    prisma = module.get(PrismaService);
    bookingRepository = module.get("IBookingRepository");
    outboxRepository = module.get(OutboxEventRepository);
    eventEmitter = module.get(EventEmitter2);
    ordersService = module.get(OrdersService);
    unassignedCapacityService = module.get(UnassignedCapacityService);

    // Setup transaction mock
    prisma.$transaction.mockImplementation(async (callback) => {
      return callback(mockTransaction as any);
    });

    unassignedCapacityService.evaluateSlot.mockResolvedValue({
      hasCapacity: true,
      rosteredStaffCount: 3,
      assignedBookingsCount: 0,
      unassignedBookingsCount: 0,
      remainingCapacity: 3,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createBooking with staff schedule validation", () => {
    const merchantId = "merchant-123";
    const staffId = "staff-123";
    const customerId = "customer-123";
    const serviceId = "service-123";
    const createdById = "user-123";

    // Helper to create a date with specific time
    const createDateTime = (hours: number, minutes: number = 0): Date => {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      // Set to Monday (day 1) for consistent testing
      const monday = new Date(date);
      monday.setDate(monday.getDate() - monday.getDay() + 1);
      return monday;
    };

    const buildPrismaBooking = (overrides: Record<string, any> = {}) => {
      const start = overrides.startTime ?? createDateTime(11, 0);
      const end = overrides.endTime ?? new Date(start.getTime() + 60 * 60000);

      return {
        id: overrides.id ?? "booking-123",
        bookingNumber: overrides.bookingNumber ?? "BK-001",
        status: overrides.status ?? "CONFIRMED",
        startTime: start,
        endTime: end,
        customerId: overrides.customerId ?? customerId,
        providerId: overrides.providerId ?? staffId,
        locationId: overrides.locationId ?? null,
        merchantId: overrides.merchantId ?? merchantId,
        notes: overrides.notes ?? null,
        totalAmount: overrides.totalAmount ?? 100,
        depositAmount: overrides.depositAmount ?? 0,
        source: overrides.source ?? "MERCHANT_APP",
        createdById: overrides.createdById ?? createdById,
        customerRequestedStaff: overrides.customerRequestedStaff ?? false,
        createdAt: overrides.createdAt ?? start,
        updatedAt: overrides.updatedAt ?? start,
        cancelledAt: overrides.cancelledAt ?? null,
        cancellationReason: overrides.cancellationReason ?? null,
        completedAt: overrides.completedAt ?? null,
        paymentStatus: overrides.paymentStatus ?? "UNPAID",
        paidAmount: overrides.paidAmount ?? 0,
        paymentMethod: overrides.paymentMethod ?? null,
        paymentReference: overrides.paymentReference ?? null,
        paidAt: overrides.paidAt ?? null,
        isOverride: overrides.isOverride ?? false,
        overrideReason: overrides.overrideReason ?? null,
        services: overrides.services ?? [
          {
            serviceId: serviceId,
            price: 100,
            duration: 60,
            service: {
              id: serviceId,
              name: "Test Service",
              duration: 60,
              price: 100,
            },
            staff: {
              id: staffId,
              firstName: "John",
              lastName: "Doe",
            },
          },
        ],
        customer: overrides.customer ?? {
          id: customerId,
          firstName: "Jane",
          lastName: "Customer",
        },
        provider: overrides.provider ?? {
          id: staffId,
          firstName: "John",
          lastName: "Doe",
        },
        location: overrides.location ?? null,
      };
    };

    beforeEach(() => {
      // Default mocks
      mockTransaction.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {
          businessHours: {
            monday: { open: "09:00", close: "18:00", isOpen: true },
            tuesday: { open: "09:00", close: "18:00", isOpen: true },
            wednesday: { open: "09:00", close: "18:00", isOpen: true },
            thursday: { open: "09:00", close: "18:00", isOpen: true },
            friday: { open: "09:00", close: "18:00", isOpen: true },
            saturday: { open: "10:00", close: "16:00", isOpen: true },
            sunday: { open: "10:00", close: "16:00", isOpen: false },
          },
        },
      });

      mockTransaction.service.findUnique.mockResolvedValue({
        id: serviceId,
        duration: 60,
        price: 100,
      });

      mockTransaction.booking.findFirst.mockResolvedValue(null);
      mockTransaction.booking.findUnique.mockResolvedValue(
        buildPrismaBooking(),
      );
      mockTransaction.booking.update.mockResolvedValue({});
      mockTransaction.booking.count.mockResolvedValue(0);

      mockTransaction.staff.findUnique.mockResolvedValue({
        id: staffId,
        firstName: "John",
        lastName: "Doe",
      });
        mockTransaction.staff.findMany.mockResolvedValue([]);
        mockTransaction.scheduleOverride.findMany.mockResolvedValue([]);
      mockTransaction.merchantHoliday.findFirst.mockResolvedValue(null);
      mockTransaction.$queryRaw.mockResolvedValue(undefined);

      bookingRepository.lockStaff.mockResolvedValue(undefined);
      bookingRepository.findConflictingBookings.mockResolvedValue([]);
      bookingRepository.save.mockImplementation(async (booking) => booking);
      outboxRepository.save.mockResolvedValue(undefined);
    });

    it("should successfully create booking within staff schedule", async () => {
      // Staff available 10:00-16:00 on Monday
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "16:00",
      });

      const startTime = createDateTime(11, 0); // 11:00 AM Monday

        const result = await service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
        startTime,
        source: "MERCHANT_APP",
        createdById,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status.value).toBe(BookingStatusValue.CONFIRMED);
      expect(bookingRepository.save).toHaveBeenCalled();
      expect(outboxRepository.save).toHaveBeenCalled();
    });

    it("should reject booking when the date is marked as a merchant holiday day off", async () => {
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      });

      const startTime = createDateTime(10, 0);
      const dateKey = startTime.toISOString().split("T")[0];

      mockTransaction.merchantHoliday.findFirst.mockResolvedValue({
        id: "holiday-1",
        merchantId,
        name: "Test Holiday",
        date: new Date(dateKey),
        isDayOff: true,
        source: "STATE",
        state: "NSW",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
          startTime,
          source: "MERCHANT_APP",
          createdById,
        }),
      ).rejects.toThrow("Business is closed on this day (Test Holiday)");
    });

    it("should reject booking outside staff schedule", async () => {
      // Staff available 10:00-16:00 on Monday
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "16:00",
      });

      const startTime = createDateTime(9, 0); // 9:00 AM Monday (too early)

      await expect(
        service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
          startTime,
          source: "MERCHANT_APP",
          createdById,
        }),
      ).rejects.toThrow(ConflictException);

      expect(bookingRepository.save).not.toHaveBeenCalled();
    });

    it("should reject booking when staff not available on that day", async () => {
      // No schedule for Monday
      mockTransaction.staffSchedule.findFirst.mockResolvedValue(null);

      const startTime = createDateTime(11, 0); // 11:00 AM Monday

      await expect(
        service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
          startTime,
          source: "MERCHANT_APP",
          createdById,
        }),
      ).rejects.toThrow("John Doe is not available on monday");
    });

    it("should reject booking that extends beyond staff schedule", async () => {
      // Staff available 10:00-16:00 on Monday
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "16:00",
      });

      mockTransaction.service.findUnique.mockResolvedValue({
        id: serviceId,
        duration: 120, // 2 hour service
        price: 100,
      });

      const startTime = createDateTime(15, 0); // 3:00 PM Monday (would end at 5:00 PM)

      await expect(
        service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
          startTime,
          source: "MERCHANT_APP",
          createdById,
        }),
      ).rejects.toThrow(
        "John Doe is only available from 10:00 to 16:00 on monday",
      );
    });

    it("should allow merchant override to book outside staff schedule", async () => {
      // Staff available 10:00-16:00 on Monday
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "16:00",
      });

      const startTime = createDateTime(9, 0); // 9:00 AM Monday (outside schedule)

      const result = await service.createBooking({
        merchantId,
        staffId,
        customerId,
        serviceId,
        startTime,
        source: "MERCHANT_APP",
        createdById,
        isOverride: true,
        overrideReason: "Customer requested early appointment",
      });

      expect(result).toBeDefined();
      expect(bookingRepository.save).toHaveBeenCalled();
    });

    it("should reject booking outside business hours even within staff schedule", async () => {
      // Staff available beyond business hours
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "20:00",
      });

      const startTime = createDateTime(19, 0); // 7:00 PM Monday (after business hours)

      await expect(
        service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
          startTime,
          source: "MERCHANT_APP",
          createdById,
        }),
      ).rejects.toThrow(
        "Booking time must be within business hours (09:00 - 18:00)",
      );
    });

    it("should reject booking on closed business day", async () => {
      // Sunday is closed
      const sunday = new Date();
      sunday.setDate(sunday.getDate() - sunday.getDay()); // Set to Sunday
      sunday.setHours(11, 0, 0, 0);

      await expect(
        service.createBooking({
          merchantId,
          staffId,
          customerId,
          serviceId,
          startTime: sunday,
          source: "MERCHANT_APP",
          createdById,
        }),
      ).rejects.toThrow("Business is closed on this day");
    });

    it("should handle multi-service bookings with different staff", async () => {
      const staff2Id = "staff-456";
      const service2Id = "service-456";

      // Setup second staff
      mockTransaction.staff.findUnique
        .mockResolvedValueOnce({
          id: staffId,
          firstName: "John",
          lastName: "Doe",
        })
        .mockResolvedValueOnce({
          id: staff2Id,
          firstName: "Jane",
          lastName: "Smith",
        });

      // Setup schedules for both staff
      mockTransaction.staffSchedule.findFirst
        .mockResolvedValueOnce({
          staffId,
          dayOfWeek: 1,
          startTime: "10:00",
          endTime: "16:00",
        })
        .mockResolvedValueOnce({
          staffId: staff2Id,
          dayOfWeek: 1,
          startTime: "12:00",
          endTime: "18:00",
        });

      // Setup services
      mockTransaction.service.findUnique
        .mockResolvedValueOnce({ id: serviceId, duration: 60, price: 100 })
        .mockResolvedValueOnce({ id: service2Id, duration: 60, price: 150 });

      const startTime = createDateTime(12, 0); // 12:00 PM Monday

      const result = await service.createBooking({
        merchantId,
        customerId,
        startTime,
        services: [
          { serviceId, staffId },
          { serviceId: service2Id, staffId: staff2Id },
        ],
        source: "MERCHANT_APP",
        createdById,
      });

      expect(result).toBeDefined();
      expect(bookingRepository.lockStaff).toHaveBeenCalledTimes(2);
      expect(bookingRepository.save).toHaveBeenCalled();
    });

    it("should enqueue confirmed outbox event when booking auto-confirms", async () => {
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "16:00",
      });

      const startTime = createDateTime(11, 0);

      await service.createBooking({
        merchantId,
        staffId,
        customerId,
        serviceId,
        startTime,
        source: "MERCHANT_APP",
        createdById,
      });

      const eventTypes = outboxRepository.save.mock.calls.map(
        ([event]) => event.eventType,
      );
      expect(eventTypes).toContain("confirmed");

      const confirmedCall = outboxRepository.save.mock.calls.find(
        ([event]) => event.eventType === "confirmed",
      );
      expect(confirmedCall).toBeDefined();
      const confirmedEvent = confirmedCall?.[0];
      expect(confirmedEvent?.eventData.previousStatus).toBe("PENDING");
      expect(confirmedEvent?.eventData.newStatus).toBe("CONFIRMED");

      const createdCall = outboxRepository.save.mock.calls.find(
        ([event]) => event.eventType === "created",
      );
      expect(createdCall?.[0].eventData.status).toBe("CONFIRMED");
    });

    it("should skip confirmed outbox event when booking starts pending", async () => {
      mockTransaction.staffSchedule.findFirst.mockResolvedValue({
        staffId,
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "16:00",
      });

      mockTransaction.merchant.findUnique.mockResolvedValue({
        id: merchantId,
        settings: {
          autoConfirmBookings: false,
          businessHours: {
            monday: { open: "09:00", close: "18:00", isOpen: true },
            tuesday: { open: "09:00", close: "18:00", isOpen: true },
            wednesday: { open: "09:00", close: "18:00", isOpen: true },
            thursday: { open: "09:00", close: "18:00", isOpen: true },
            friday: { open: "09:00", close: "18:00", isOpen: true },
            saturday: { open: "10:00", close: "16:00", isOpen: true },
            sunday: { open: "10:00", close: "16:00", isOpen: false },
          },
        },
      });

      const startTime = createDateTime(11, 0);

      await service.createBooking({
        merchantId,
        staffId,
        customerId,
        serviceId,
        startTime,
        source: "ONLINE",
        createdById,
      });

      const eventTypes = outboxRepository.save.mock.calls.map(
        ([event]) => event.eventType,
      );
      const confirmedEvents = eventTypes.filter((type) => type === "confirmed");
      expect(confirmedEvents.length).toBe(0);
    });

    describe("unassigned bookings capacity", () => {
      it("allows unassigned booking when roster capacity is available", async () => {
        const startTime = createDateTime(11, 0);

        await service.createBooking({
          merchantId,
          customerId,
          startTime,
          services: [{ serviceId }],
          source: "ONLINE",
          createdById,
        });

        expect(unassignedCapacityService.evaluateSlot).toHaveBeenCalledWith(
          expect.objectContaining({
            merchantId,
            startTime,
          }),
        );
      });

      it("rejects unassigned booking when staff capacity is exhausted", async () => {
        const startTime = createDateTime(13, 0);

        unassignedCapacityService.evaluateSlot.mockResolvedValueOnce({
          hasCapacity: false,
          rosteredStaffCount: 2,
          assignedBookingsCount: 2,
          unassignedBookingsCount: 0,
          remainingCapacity: 0,
          message: "No unassigned capacity remaining for this time slot.",
        });

        await expect(
          service.createBooking({
            merchantId,
            customerId,
            startTime,
            services: [{ serviceId }],
            source: "ONLINE",
            createdById,
          }),
        ).rejects.toThrow("No unassigned capacity remaining for this time slot.");

        expect(bookingRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe("edge cases", () => {
    it("should handle missing business hours configuration", async () => {
      mockTransaction.merchant.findUnique.mockResolvedValue({
        id: "merchant-123",
        settings: {},
      });

      await expect(
        service.createBooking({
          merchantId: "merchant-123",
          staffId: "staff-123",
          customerId: "customer-123",
          serviceId: "service-123",
          startTime: new Date(),
          source: "MERCHANT_APP",
          createdById: "user-123",
        }),
      ).rejects.toThrow("Business hours not configured");
    });

    it("should require at least one service", async () => {
      await expect(
        service.createBooking({
          merchantId: "merchant-123",
          customerId: "customer-123",
          startTime: new Date(),
          services: [],
          source: "MERCHANT_APP",
          createdById: "user-123",
        }),
      ).rejects.toThrow("At least one service is required");
    });
  });
});
