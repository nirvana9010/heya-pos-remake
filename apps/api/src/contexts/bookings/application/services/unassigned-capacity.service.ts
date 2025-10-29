import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { normalizeMerchantSettings } from "../../../../utils/shared/merchant-settings";
import { MerchantSettings } from "../../../../types/models/merchant";

export interface EvaluateUnassignedCapacityInput {
  merchantId: string;
  locationId?: string;
  startTime: Date;
  endTime: Date;
  lockMerchantRow?: boolean;
  tx?: Prisma.TransactionClient;
}

export interface EvaluateUnassignedCapacityResult {
  hasCapacity: boolean;
  rosteredStaffCount: number;
  assignedBookingsCount: number;
  unassignedBookingsCount: number;
  remainingCapacity: number;
  message?: string;
}

@Injectable()
export class UnassignedCapacityService {
  private readonly logger = new Logger(UnassignedCapacityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateSlot(
    input: EvaluateUnassignedCapacityInput,
  ): Promise<EvaluateUnassignedCapacityResult> {
    if (input.tx) {
      return this.evaluateWithClient(input, input.tx);
    }

    return this.prisma.$transaction(async (tx) =>
      this.evaluateWithClient({ ...input, tx }, tx),
    );
  }

  private async evaluateWithClient(
    input: EvaluateUnassignedCapacityInput,
    tx: Prisma.TransactionClient,
  ): Promise<EvaluateUnassignedCapacityResult> {
    const { merchantId, startTime, endTime, lockMerchantRow } = input;

    if (lockMerchantRow) {
      await tx.$queryRaw`
        SELECT 1 FROM "Merchant"
        WHERE "id" = ${merchantId}
        FOR UPDATE
      `;
    }

    const merchant = await tx.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    if (!merchant?.settings) {
      this.logger.warn(
        "Skipping unassigned capacity evaluation due to missing merchant settings",
        { merchantId },
      );
      return {
        hasCapacity: true,
        rosteredStaffCount: 0,
        assignedBookingsCount: 0,
        unassignedBookingsCount: 0,
        remainingCapacity: Number.POSITIVE_INFINITY,
      };
    }

    const settings = normalizeMerchantSettings<MerchantSettings>(
      merchant.settings,
    );
    const businessHours = settings?.businessHours;

    if (!businessHours) {
      this.logger.warn(
        "Skipping unassigned capacity evaluation due to missing business hours",
        { merchantId },
      );
      return {
        hasCapacity: true,
        rosteredStaffCount: 0,
        assignedBookingsCount: 0,
        unassignedBookingsCount: 0,
        remainingCapacity: Number.POSITIVE_INFINITY,
      };
    }

    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayOfWeek = startTime.getDay();
    const dayName = dayNames[dayOfWeek];
    const dayHours = businessHours[dayName] ?? businessHours[dayName.toUpperCase()];

    const bookingDateKey = startTime.toISOString().split("T")[0];

    const merchantHoliday = await tx.merchantHoliday.findFirst({
      where: {
        merchantId,
        date: new Date(bookingDateKey),
        isDayOff: true,
      },
    });

    if (merchantHoliday) {
      return {
        hasCapacity: false,
        rosteredStaffCount: 0,
        assignedBookingsCount: 0,
        unassignedBookingsCount: 0,
        remainingCapacity: 0,
        message: `Business is closed on this day (${merchantHoliday.name})`,
      };
    }

    if (!dayHours || dayHours.isOpen === false || !dayHours.open || !dayHours.close || dayHours.open === "closed") {
      return {
        hasCapacity: false,
        rosteredStaffCount: 0,
        assignedBookingsCount: 0,
        unassignedBookingsCount: 0,
        remainingCapacity: 0,
        message: "Business is closed on this day",
      };
    }

    const toMinutes = (value: string | null | undefined): number | null => {
      if (!value || value === "closed") {
        return null;
      }
      const [hourStr, minuteStr] = value.split(":");
      const hours = parseInt(hourStr ?? "0", 10);
      const minutes = parseInt(minuteStr ?? "0", 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }
      return hours * 60 + minutes;
    };

    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    const staffMembers = await tx.staff.findMany({
      where: {
        merchantId,
        status: "ACTIVE",
        NOT: {
          firstName: {
            equals: "Unassigned",
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
        schedules: {
          where: { dayOfWeek },
          select: { startTime: true, endTime: true },
        },
      },
    });

    if (staffMembers.length === 0) {
      return {
        hasCapacity: false,
        rosteredStaffCount: 0,
        assignedBookingsCount: 0,
        unassignedBookingsCount: 0,
        remainingCapacity: 0,
        message: "No staff members are scheduled for this time slot.",
      };
    }

    const staffIds = staffMembers.map((staff) => staff.id);
    const overrides = staffIds.length
      ? await tx.scheduleOverride.findMany({
          where: {
            staffId: { in: staffIds },
            date: new Date(bookingDateKey),
          },
        })
      : [];

    const overrideMap = new Map<
      string,
      { startTime: string | null; endTime: string | null }
    >();

    overrides.forEach((override) => {
      overrideMap.set(override.staffId, {
        startTime: override.startTime,
        endTime: override.endTime,
      });
    });

    const showOnlyRostered =
      settings?.showOnlyRosteredStaffDefault ?? true;

    let rosteredStaffCount = 0;

    const businessOpenMinutes = toMinutes(dayHours.open);
    const businessCloseMinutes = toMinutes(dayHours.close);

    for (const staff of staffMembers) {
      const override = overrideMap.get(staff.id);
      let shiftStart: number | null = null;
      let shiftEnd: number | null = null;

      if (override) {
        shiftStart = toMinutes(override.startTime);
        shiftEnd = toMinutes(override.endTime);
        if (shiftStart === null || shiftEnd === null) {
          continue;
        }
      } else if (staff.schedules.length > 0) {
        const schedule = staff.schedules[0];
        shiftStart = toMinutes(schedule.startTime);
        shiftEnd = toMinutes(schedule.endTime);
        if (shiftStart === null || shiftEnd === null) {
          continue;
        }
      } else if (!showOnlyRostered && businessOpenMinutes !== null && businessCloseMinutes !== null) {
        shiftStart = businessOpenMinutes;
        shiftEnd = businessCloseMinutes;
      } else {
        continue;
      }

      if (shiftStart > startMinutes || shiftEnd < endMinutes) {
        continue;
      }

      rosteredStaffCount += 1;
    }

    if (rosteredStaffCount === 0) {
      return {
        hasCapacity: false,
        rosteredStaffCount,
        assignedBookingsCount: 0,
        unassignedBookingsCount: 0,
        remainingCapacity: 0,
        message: "No staff members are available for this time slot.",
      };
    }

    const baseWhere: Prisma.BookingWhereInput = {
      merchantId,
      status: {
        notIn: ["CANCELLED", "NO_SHOW", "DELETED"],
      },
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    };

    const assignedBookingsCount = await tx.booking.count({
      where: {
        ...baseWhere,
        providerId: { in: staffIds },
      },
    });

    const unassignedStaff = await tx.staff.findMany({
      where: {
        merchantId,
        firstName: {
          equals: "Unassigned",
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    const unassignedStaffIds = unassignedStaff.map((staff) => staff.id);
    const unassignedCondition: Prisma.BookingWhereInput[] =
      unassignedStaffIds.length > 0
        ? [
            { providerId: null },
            { providerId: { in: unassignedStaffIds } },
          ]
        : [{ providerId: null }];

    const unassignedBookingsCount = await tx.booking.count({
      where: {
        ...baseWhere,
        OR: unassignedCondition,
      },
    });

    const remainingCapacity = rosteredStaffCount - assignedBookingsCount;

    if (remainingCapacity <= 0) {
      return {
        hasCapacity: false,
        rosteredStaffCount,
        assignedBookingsCount,
        unassignedBookingsCount,
        remainingCapacity,
        message: "All staff members are already booked for this time.",
      };
    }

    if (unassignedBookingsCount >= remainingCapacity) {
      return {
        hasCapacity: false,
        rosteredStaffCount,
        assignedBookingsCount,
        unassignedBookingsCount,
        remainingCapacity,
        message: "No unassigned capacity remaining for this time slot.",
      };
    }

    return {
      hasCapacity: true,
      rosteredStaffCount,
      assignedBookingsCount,
      unassignedBookingsCount,
      remainingCapacity,
    };
  }
}
