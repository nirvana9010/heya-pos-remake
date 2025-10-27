import "dotenv/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { BookingAvailabilityService } from "../src/contexts/bookings/application/services/booking-availability.service";
import { IBookingRepository } from "../src/contexts/bookings/domain/repositories/booking.repository.interface";
import { TimezoneUtils } from "../src/utils/shared/timezone";

class NoopBookingRepository implements IBookingRepository {
  async lockStaff(): Promise<void> {
    return;
  }

  async save(): Promise<any> {
    throw new Error("Not implemented in availability checker");
  }

  async findById(): Promise<any> {
    throw new Error("Not implemented in availability checker");
  }

  async findMany(): Promise<{ bookings: any[]; total: number }> {
    throw new Error("Not implemented in availability checker");
  }

  async update(): Promise<any> {
    throw new Error("Not implemented in availability checker");
  }

  async delete(): Promise<void> {
    throw new Error("Not implemented in availability checker");
  }

  async isTimeSlotAvailable(): Promise<boolean> {
    return true;
  }

  async findConflictingBookings(): Promise<any[]> {
    return [];
  }
}

const args = process.argv.slice(2);
const argMap = args.reduce<Record<string, string>>((acc, curr) => {
  const [key, value] = curr.split("=");
  if (key && value) {
    acc[key.replace(/^--/, "")] = value;
  }
  return acc;
}, {});

async function main() {
  const merchantSubdomain = argMap.merchant ?? "zen-wellness";
  const dateInput = argMap.date;
  const serviceId = argMap.service;

  if (!dateInput) {
    console.error("Usage: ts-node check-merchant-availability.ts --date=YYYY-MM-DD [--merchant=subdomain] [--service=serviceId]");
    process.exit(1);
  }

  const prisma = new PrismaService();
  const bookingRepository = new NoopBookingRepository();
  const availabilityService = new BookingAvailabilityService(
    prisma,
    bookingRepository,
  );

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { subdomain: merchantSubdomain },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!merchant) {
      throw new Error(`Merchant with subdomain "${merchantSubdomain}" not found`);
    }

    const settings = (merchant.settings ?? {}) as Prisma.JsonObject;
    const timezone =
      (settings?.timezone as string) ||
      (settings?.businessHours && "Australia/Sydney");

    if (!timezone || typeof timezone !== "string") {
      throw new Error(
        `Merchant ${merchant.name} does not have a timezone configured`,
      );
    }

    const location = await prisma.location.findFirst({
      where: { merchantId: merchant.id, isActive: true },
      select: {
        id: true,
        name: true,
        timezone: true,
        businessHours: true,
      },
    });

    if (!location) {
      throw new Error(`No active location found for merchant ${merchant.name}`);
    }

    const targetDate = dateInput;
    const effectiveTimezone = location.timezone || timezone;
    const startDate = TimezoneUtils.startOfDayInTimezone(
      targetDate,
      effectiveTimezone,
    );
    const endDate = TimezoneUtils.endOfDayInTimezone(targetDate, effectiveTimezone);

    const services = await prisma.service.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
        ...(serviceId ? { id: serviceId } : {}),
      },
      select: {
        id: true,
        name: true,
        duration: true,
        paddingBefore: true,
        paddingAfter: true,
      },
      orderBy: { name: "asc" },
      take: serviceId ? undefined : 3,
    });

    if (services.length === 0) {
      throw new Error(
        serviceId
          ? `Service ${serviceId} not found for merchant ${merchant.name}`
          : `No active services found for merchant ${merchant.name}`,
      );
    }

    const staffMembers = await prisma.staff.findMany({
      where: { merchantId: merchant.id, status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schedules: true,
      },
    });

    const dayName = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: effectiveTimezone,
    });

    console.log(
      `🔍 Checking availability for ${merchant.name} (${merchantSubdomain})`,
    );
    console.log(
      `📅 Date: ${targetDate} (${dayName}) | Timezone: ${effectiveTimezone} | Location: ${location.name}`,
    );
    console.log(
      `🧾 Services considered: ${services
        .map((svc) => `${svc.name} (${svc.duration}m)`)
        .join(", ")}`,
    );
    console.log("");

    const dayIndexMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const localDayName = startDate
      .toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: effectiveTimezone,
      })
      .toLowerCase();
    const scheduleDayIndex = dayIndexMap[localDayName];
    const localDayNameDisplay =
      localDayName.charAt(0).toUpperCase() + localDayName.slice(1);

    for (const staff of staffMembers) {
      const staffName = `${staff.firstName} ${staff.lastName ?? ""}`.trim();
      const overrides = await prisma.scheduleOverride.findMany({
        where: {
          staffId: staff.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      });

      console.log(`👤 Staff: ${staffName} (${staff.id})`);

      if (staff.schedules.length === 0) {
        console.log("   • Baseline roster: none");
      } else {
        console.log(
          `   • Baseline roster entries: ${staff.schedules
            .map(
              (schedule) =>
                `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][schedule.dayOfWeek]} ${schedule.startTime}-${schedule.endTime}`,
            )
            .join(", ")}`,
        );

        if (scheduleDayIndex !== undefined) {
          const rosterForDay = staff.schedules.filter(
            (schedule) => schedule.dayOfWeek === scheduleDayIndex,
          );
          if (rosterForDay.length === 0) {
            console.log(`   • Roster on ${localDayNameDisplay}: none`);
          } else {
            console.log(
              `   • Roster on ${localDayNameDisplay}: ${rosterForDay
                .map((r) => `${r.startTime}-${r.endTime}`)
                .join(", ")}`,
            );
          }
        }
      }

      if (overrides.length > 0) {
        overrides.forEach((override) => {
          const localDate = override.date.toLocaleDateString("en-CA", {
            timeZone: effectiveTimezone,
          });
          if (!override.startTime || !override.endTime) {
            console.log(`   • Override: ${localDate} marked as day off`);
          } else {
            console.log(
              `   • Override: ${localDate} ${override.startTime}-${override.endTime}`,
            );
          }
        });
      } else {
        console.log("   • Overrides: none");
      }

      for (const service of services) {
        const slots = await availabilityService.getAvailableSlots({
          staffId: staff.id,
          serviceId: service.id,
          merchantId: merchant.id,
          startDate,
          endDate,
          timezone: effectiveTimezone,
          requireRosterOnly: true,
        });

        const availableSlots = slots.filter((slot) => slot.available);
        if (availableSlots.length === 0) {
          console.log(`   • No available slots for ${service.name}`);
        } else {
          const times = availableSlots.map((slot) =>
            slot.startTime.toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: effectiveTimezone,
            }),
          );
          console.log(
            `   • Available slots for ${service.name}: ${times.join(", ")}`,
          );
        }
      }

      console.log("");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Availability check failed:", err);
  process.exit(1);
});
