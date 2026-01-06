import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, HolidaySource, MerchantHoliday } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeMerchantSettings } from "../utils/shared/merchant-settings";
import type { MerchantSettings } from "../types/models/merchant";
import type { AustralianState } from "@heya-pos/types";
import {
  getAustralianStateHolidays,
  StateHolidayDefinition,
} from "@heya-pos/utils";

export interface MerchantHolidayResponse {
  holidays: MerchantHoliday[];
  selectedState: AustralianState | null;
  year: number;
}

@Injectable()
export class MerchantHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async getHolidays(merchantId: string): Promise<MerchantHolidayResponse> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    if (!merchant) {
      throw new NotFoundException("Merchant not found");
    }

    const settings = normalizeMerchantSettings<MerchantSettings>(
      merchant.settings,
    );
    const holidays = await this.prisma.merchantHoliday.findMany({
      where: { merchantId },
      orderBy: { date: "asc" },
    });

    const currentYear = new Date().getFullYear();

    return {
      holidays,
      selectedState: (settings?.holidayState as AustralianState | null) ?? null,
      year: currentYear,
    };
  }

  async syncStateHolidays(
    merchantId: string,
    state: AustralianState,
    year?: number,
  ): Promise<MerchantHolidayResponse> {
    const targetYear = year ?? new Date().getFullYear();
    let definitions: StateHolidayDefinition[];

    try {
      definitions = getAustralianStateHolidays(state, targetYear);
    } catch (error: any) {
      throw new BadRequestException(error?.message || "Invalid state provided");
    }

    return this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.findUnique({
        where: { id: merchantId },
        select: { settings: true },
      });

      if (!merchant) {
        throw new NotFoundException("Merchant not found");
      }

      const normalizedSettings = normalizeMerchantSettings<MerchantSettings>(
        merchant.settings,
      );
      const updatedSettings = {
        ...normalizedSettings,
        holidayState: state,
      };

      const existing = await tx.merchantHoliday.findMany({
        where: { merchantId },
      });

      const existingByDate = new Map(
        existing.map((holiday) => [
          holiday.date.toISOString().split("T")[0],
          holiday,
        ]),
      );

      const definitionDates = new Set<string>();

      for (const definition of definitions) {
        const dateKey = definition.date.toISOString().split("T")[0];
        definitionDates.add(dateKey);
        const current = existingByDate.get(dateKey);

        if (current) {
          if (current.source === HolidaySource.STATE) {
            await tx.merchantHoliday.update({
              where: { id: current.id },
              data: {
                name: definition.name,
                state,
              },
            });
          }
          continue;
        }

        await tx.merchantHoliday.create({
          data: {
            merchantId,
            name: definition.name,
            date: definition.date,
            isDayOff: true,
            source: HolidaySource.STATE,
            state,
          },
        });
      }

      const obsoleteStateHolidays = existing.filter(
        (holiday) =>
          holiday.source === HolidaySource.STATE &&
          holiday.state !== null &&
          !definitionDates.has(holiday.date.toISOString().split("T")[0]),
      );

      if (obsoleteStateHolidays.length > 0) {
        await tx.merchantHoliday.deleteMany({
          where: {
            merchantId,
            id: {
              in: obsoleteStateHolidays.map((holiday) => holiday.id),
            },
          },
        });
      }

      await tx.merchant.update({
        where: { id: merchantId },
        data: {
          settings: updatedSettings as unknown as Prisma.JsonValue,
        },
      });

      const refreshed = await tx.merchantHoliday.findMany({
        where: { merchantId },
        orderBy: { date: "asc" },
      });

      return {
        holidays: refreshed,
        selectedState: state,
        year: targetYear,
      };
    });
  }

  async createCustomHoliday(
    merchantId: string,
    name: string,
    dateInput: string,
  ) {
    const date = this.toDateOnly(dateInput);
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new BadRequestException("Holiday name is required");
    }

    const existing = await this.prisma.merchantHoliday.findFirst({
      where: {
        merchantId,
        date,
      },
    });

    if (existing) {
      throw new ConflictException(
        "A holiday already exists on this date. Remove the existing one first.",
      );
    }

    return this.prisma.merchantHoliday.create({
      data: {
        merchantId,
        name: normalizedName,
        date,
        isDayOff: true,
        source: HolidaySource.CUSTOM,
      },
    });
  }

  async updateHoliday(
    merchantId: string,
    holidayId: string,
    updates: {
      isDayOff?: boolean;
      name?: string;
      date?: string;
    },
  ) {
    const holiday = await this.prisma.merchantHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday || holiday.merchantId !== merchantId) {
      throw new NotFoundException("Holiday not found");
    }

    const data: Prisma.MerchantHolidayUpdateInput = {};

    if (typeof updates.isDayOff === "boolean") {
      data.isDayOff = updates.isDayOff;
    }

    if (updates.name !== undefined) {
      if (holiday.source !== HolidaySource.CUSTOM) {
        throw new BadRequestException("Only custom holidays can be renamed.");
      }

      const trimmed = updates.name.trim();
      if (!trimmed) {
        throw new BadRequestException("Holiday name cannot be empty");
      }
      data.name = trimmed;
    }

    if (updates.date) {
      if (holiday.source !== HolidaySource.CUSTOM) {
        throw new BadRequestException("Only custom holidays can change date.");
      }

      const newDate = this.toDateOnly(updates.date);
      if (newDate.getTime() !== holiday.date.getTime()) {
        const existing = await this.prisma.merchantHoliday.findFirst({
          where: {
            merchantId,
            date: newDate,
            NOT: { id: holidayId },
          },
        });

        if (existing) {
          throw new ConflictException(
            "Another holiday already exists on that date.",
          );
        }
        data.date = newDate;
      }
    }

    if (Object.keys(data).length === 0) {
      return holiday;
    }

    return this.prisma.merchantHoliday.update({
      where: { id: holidayId },
      data,
    });
  }

  async deleteHoliday(merchantId: string, holidayId: string) {
    const holiday = await this.prisma.merchantHoliday.findUnique({
      where: { id: holidayId },
    });

    if (!holiday || holiday.merchantId !== merchantId) {
      throw new NotFoundException("Holiday not found");
    }

    await this.prisma.merchantHoliday.delete({
      where: { id: holidayId },
    });
  }

  private toDateOnly(input: string | Date): Date {
    let date: Date;

    if (input instanceof Date) {
      date = input;
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        throw new BadRequestException(
          "Date must be in ISO format (YYYY-MM-DD)",
        );
      }
      date = new Date(`${input}T00:00:00.000Z`);
    }

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Invalid date value");
    }

    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
