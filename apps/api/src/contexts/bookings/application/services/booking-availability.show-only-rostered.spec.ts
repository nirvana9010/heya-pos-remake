import { Test, TestingModule } from "@nestjs/testing";
import { BookingAvailabilityService } from "./booking-availability.service";
import { PrismaService } from "../../../../prisma/prisma.service";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

describe("BookingAvailabilityService - Show Only Rostered Staff", () => {
  let service: BookingAvailabilityService;
  let prisma: DeepMockProxy<PrismaService>;

  const merchantId = "merchant-show-only-rostered";
  const staffId = "staff-no-schedule";
  const serviceId = "service-basic";
  const timezone = "Australia/Sydney";
  const testDate = new Date("2030-01-07T00:00:00.000Z"); // Future Monday

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

    prisma.service.findFirst.mockResolvedValue({
      id: serviceId,
      duration: 60,
      paddingBefore: 0,
      paddingAfter: 0,
      merchantId,
    } as any);

    prisma.staff.findFirst.mockResolvedValue({
      id: staffId,
      merchantId,
      firstName: "Rosterless",
      lastName: "Staff",
    } as any);

    prisma.booking.findMany.mockResolvedValue([]);
    prisma.staffSchedule.findMany.mockResolvedValue([]);
    prisma.scheduleOverride.findMany.mockResolvedValue([]);
    prisma.merchantHoliday.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseSettings = {
    businessHours: {
      monday: { open: "09:00", close: "17:00", isOpen: true },
      tuesday: { open: "09:00", close: "17:00", isOpen: true },
      wednesday: { open: "09:00", close: "17:00", isOpen: true },
      thursday: { open: "09:00", close: "17:00", isOpen: true },
      friday: { open: "09:00", close: "17:00", isOpen: true },
      saturday: { open: "10:00", close: "14:00", isOpen: true },
      sunday: { open: "10:00", close: "14:00", isOpen: false },
    },
    minimumBookingNotice: 0,
    showOnlyRosteredStaffDefault: true,
  };

  it("returns no slots when merchant enforces roster-only availability", async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: merchantId,
      settings: baseSettings,
    } as any);

    const slots = await service.getAvailableSlots({
      merchantId,
      staffId,
      serviceId,
      startDate: new Date(testDate),
      endDate: new Date(testDate),
      timezone,
    });

    expect(slots).toHaveLength(0);
  });

  it("falls back to business hours when merchant allows unrostered staff", async () => {
    prisma.merchant.findUnique.mockResolvedValue({
      id: merchantId,
      settings: {
        ...baseSettings,
        showOnlyRosteredStaffDefault: false,
      },
    } as any);

    const slots = await service.getAvailableSlots({
      merchantId,
      staffId,
      serviceId,
      startDate: new Date(testDate),
      endDate: new Date(testDate),
      timezone,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((slot) => slot.available)).toBe(true);
  });
});
