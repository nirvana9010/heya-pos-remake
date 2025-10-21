import { Test, TestingModule } from "@nestjs/testing";
import { StaffService } from "./staff.service";
import { PrismaService } from "../prisma/prisma.service";
import { MerchantService } from "../merchant/merchant.service";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

describe("StaffService - Merchant Holidays", () => {
  let service: StaffService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
        {
          provide: MerchantService,
          useValue: mockDeep<MerchantService>(),
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const merchantId = "merchant-1";
  const staffId = "staff-1";

  it("includes synthesized overrides for merchant holidays marked as day off", async () => {
    prisma.staff.findFirst.mockResolvedValue({
      id: staffId,
      merchantId,
    } as any);
    prisma.scheduleOverride.findMany.mockResolvedValue([]);
    prisma.merchantHoliday.findMany.mockResolvedValue([
      {
        id: "holiday-1",
        merchantId,
        name: "Test Holiday",
        date: new Date("2025-01-01"),
        isDayOff: true,
        source: "STATE",
        state: "NSW",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const overrides = await service.getScheduleOverrides(
      merchantId,
      staffId,
      "2025-01-01",
      "2025-01-07",
    );

    expect(overrides).toEqual([
      expect.objectContaining({
        staffId,
        date: "2025-01-01",
        startTime: null,
        endTime: null,
        reason: "Test Holiday",
        source: "HOLIDAY",
        holidayName: "Test Holiday",
      }),
    ]);
  });

  it("does not duplicate holiday overrides when manual overrides exist", async () => {
    prisma.staff.findFirst.mockResolvedValue({
      id: staffId,
      merchantId,
    } as any);
    prisma.scheduleOverride.findMany.mockResolvedValue([
      {
        staffId,
        date: new Date("2025-01-01"),
        startTime: null,
        endTime: null,
        reason: "Manual Day Off",
      },
    ] as any);
    prisma.merchantHoliday.findMany.mockResolvedValue([
      {
        id: "holiday-1",
        merchantId,
        name: "Test Holiday",
        date: new Date("2025-01-01"),
        isDayOff: true,
        source: "STATE",
        state: "NSW",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const overrides = await service.getScheduleOverrides(
      merchantId,
      staffId,
      "2025-01-01",
      "2025-01-07",
    );

    expect(overrides).toHaveLength(1);
    expect(overrides[0]).toEqual(
      expect.objectContaining({
        source: "MANUAL",
        reason: "Manual Day Off",
      }),
    );
  });
});
