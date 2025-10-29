import { Test, TestingModule } from "@nestjs/testing";
import { UnassignedCapacityService } from "./unassigned-capacity.service";
import { PrismaService } from "../../../../prisma/prisma.service";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

describe("UnassignedCapacityService", () => {
  let service: UnassignedCapacityService;
  let prisma: DeepMockProxy<PrismaService>;

  const transactionMock = {
    $queryRaw: jest.fn(),
    merchant: { findUnique: jest.fn() },
    merchantHoliday: { findFirst: jest.fn() },
    staff: { findMany: jest.fn() },
    scheduleOverride: { findMany: jest.fn() },
    booking: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnassignedCapacityService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get(UnassignedCapacityService);
    prisma = module.get(PrismaService);

    prisma.$transaction.mockImplementation(async (cb) => {
      return cb(transactionMock as any);
    });

    transactionMock.$queryRaw.mockResolvedValue(undefined);
    transactionMock.merchantHoliday.findFirst.mockResolvedValue(null);
    transactionMock.scheduleOverride.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createDate = (hour: number, minute = 0) => {
    const date = new Date("2025-01-06T00:00:00.000Z"); // Monday
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  it("returns capacity when roster and bookings allow unassigned slot", async () => {
    transactionMock.merchant.findUnique.mockResolvedValue({
      settings: {
        businessHours: {
          monday: { open: "09:00", close: "17:00", isOpen: true },
        },
        showOnlyRosteredStaffDefault: true,
      },
    });

    transactionMock.staff.findMany
      .mockResolvedValueOnce([
        { id: "staff-a", schedules: [{ startTime: "09:00", endTime: "17:00" }] },
        { id: "staff-b", schedules: [{ startTime: "09:00", endTime: "17:00" }] },
      ])
      .mockResolvedValueOnce([]);

    transactionMock.booking.count
      .mockResolvedValueOnce(1) // assigned bookings
      .mockResolvedValueOnce(0); // unassigned bookings

    const startTime = createDate(10);
    const endTime = createDate(11);

    const result = await service.evaluateSlot({
      merchantId: "merchant-1",
      startTime,
      endTime,
    });

    expect(result.hasCapacity).toBe(true);
    expect(result.remainingCapacity).toBe(1);
  });

  it("returns no capacity when assigned and unassigned bookings exhaust roster", async () => {
    transactionMock.merchant.findUnique.mockResolvedValue({
      settings: {
        businessHours: {
          monday: { open: "09:00", close: "17:00", isOpen: true },
        },
        showOnlyRosteredStaffDefault: true,
      },
    });

    transactionMock.staff.findMany
      .mockResolvedValueOnce([
        { id: "staff-a", schedules: [{ startTime: "09:00", endTime: "17:00" }] },
        { id: "staff-b", schedules: [{ startTime: "09:00", endTime: "17:00" }] },
      ])
      .mockResolvedValueOnce([{ id: "unassigned-id" }]);

    transactionMock.booking.count
      .mockResolvedValueOnce(2) // assigned bookings consume capacity
      .mockResolvedValueOnce(0);

    const startTime = createDate(14);
    const endTime = createDate(15);

    const result = await service.evaluateSlot({
      merchantId: "merchant-1",
      startTime,
      endTime,
    });

    expect(result.hasCapacity).toBe(false);
    expect(result.message).toBe("All staff members are already booked for this time.");
  });

  it("locks merchant row when requested", async () => {
    transactionMock.merchant.findUnique.mockResolvedValue({
      settings: {
        businessHours: {
          monday: { open: "09:00", close: "17:00", isOpen: true },
        },
        showOnlyRosteredStaffDefault: true,
      },
    });

    transactionMock.staff.findMany
      .mockResolvedValueOnce([
        { id: "staff-a", schedules: [{ startTime: "09:00", endTime: "17:00" }] },
      ])
      .mockResolvedValueOnce([]);

    transactionMock.booking.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const startTime = createDate(9);
    const endTime = createDate(10);

    await service.evaluateSlot({
      merchantId: "merchant-1",
      startTime,
      endTime,
      lockMerchantRow: true,
    });

    expect(transactionMock.$queryRaw).toHaveBeenCalled();
  });
});
