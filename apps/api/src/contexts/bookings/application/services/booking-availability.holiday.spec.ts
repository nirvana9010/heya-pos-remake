import { Test, TestingModule } from "@nestjs/testing";
import { BookingAvailabilityService } from "./booking-availability.service";
import { PrismaService } from "../../../../prisma/prisma.service";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

describe("BookingAvailabilityService - Holidays", () => {
  let service: BookingAvailabilityService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingAvailabilityService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
        {
          provide: "IBookingRepository",
          useValue: mockDeep<any>(),
        },
      ],
    }).compile();

    service = module.get<BookingAvailabilityService>(
      BookingAvailabilityService,
    );
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns no slots when the day is marked as a merchant holiday", async () => {
    const merchantId = "merchant-1";
    const staffId = "staff-1";
    const serviceId = "service-1";
    const timezone = "Australia/Sydney";
    const startDate = new Date("2025-01-01T00:00:00.000Z");
    const endDate = new Date("2025-01-01T23:59:59.000Z");

    prisma.service.findFirst.mockResolvedValue({
      id: serviceId,
      duration: 60,
      paddingBefore: 0,
      paddingAfter: 0,
    } as any);

    prisma.staff.findFirst.mockResolvedValue({
      id: staffId,
      merchantId,
    } as any);

    prisma.merchant.findUnique.mockResolvedValue({
      settings: {
        businessHours: {
          wednesday: { open: "09:00", close: "17:00", isOpen: true },
        },
        minimumBookingNotice: 0,
      },
    } as any);

    prisma.booking.findMany.mockResolvedValue([]);
    prisma.staffSchedule.findMany.mockResolvedValue([
      {
        staffId,
        dayOfWeek: 3,
        startTime: "09:00",
        endTime: "17:00",
      },
    ] as any);

    prisma.scheduleOverride.findMany.mockResolvedValue([]);
    prisma.merchantHoliday.findMany.mockResolvedValue([
      {
        id: "holiday-1",
        merchantId,
        name: "New Year's Day",
        date: new Date("2025-01-01"),
        isDayOff: true,
        source: "STATE",
        state: "NSW",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const slots = await service.getAvailableSlots({
      merchantId,
      staffId,
      serviceId,
      startDate,
      endDate,
      timezone,
    });

    expect(Array.isArray(slots)).toBe(true);
    expect(slots).toHaveLength(0);
  });
});
