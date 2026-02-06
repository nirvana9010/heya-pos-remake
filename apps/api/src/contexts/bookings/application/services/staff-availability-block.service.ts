import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../../prisma/prisma.service";

export interface CreateBlockParams {
  merchantId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  locationId?: string | null;
  reason?: string | null;
  createdById?: string;
  suppressWarnings?: boolean;
}

@Injectable()
export class StaffAvailabilityBlockService {
  constructor(private readonly prisma: PrismaService) {}

  async createBlock(params: CreateBlockParams) {
    const {
      merchantId,
      staffId,
      startTime,
      endTime,
      locationId,
      reason,
      createdById,
      suppressWarnings,
    } = params;

    if (!(startTime instanceof Date) || !(endTime instanceof Date)) {
      throw new BadRequestException("Invalid start or end time");
    }
    if (startTime >= endTime) {
      throw new BadRequestException("Start time must be before end time");
    }

    const merged = await this.prisma.$transaction(async (tx) => {
      // Find overlapping/adjacent blocks for this staff & location
      const overlapping = await tx.staffAvailabilityBlock.findMany({
        where: {
          merchantId,
          staffId,
          startTime: { lte: endTime },
          endTime: { gte: startTime },
          locationId: locationId ?? null,
        },
      });

      const mergedStart = overlapping.length
        ? new Date(
            Math.min(
              startTime.getTime(),
              ...overlapping.map((b) => b.startTime.getTime()),
            ),
          )
        : startTime;

      const mergedEnd = overlapping.length
        ? new Date(
            Math.max(
              endTime.getTime(),
              ...overlapping.map((b) => b.endTime.getTime()),
            ),
          )
        : endTime;

      if (overlapping.length > 0) {
        await tx.staffAvailabilityBlock.deleteMany({
          where: { id: { in: overlapping.map((b) => b.id) } },
        });
      }

      const created = await tx.staffAvailabilityBlock.create({
        data: {
          merchantId,
          staffId,
          startTime: mergedStart,
          endTime: mergedEnd,
          locationId: locationId ?? null,
          reason: reason ?? null,
          createdById,
        },
      });

      // Look for upcoming bookings that overlap the new block
      const now = new Date();
      const bookingConflicts = await tx.booking.findMany({
        where: {
          merchantId,
          providerId: staffId,
          status: {
            notIn: ["CANCELLED", "NO_SHOW", "DELETED"],
          },
          AND: [
            { startTime: { lt: mergedEnd } },
            { endTime: { gt: mergedStart } },
            { endTime: { gt: now } },
            ...(locationId ? [{ locationId }] : []),
          ],
        },
        select: {
          id: true,
          bookingNumber: true,
          startTime: true,
          endTime: true,
          locationId: true,
          status: true,
        },
        orderBy: { startTime: "asc" },
      });

      return {
        block: created,
        warning: !suppressWarnings && bookingConflicts.length > 0,
        conflicts: bookingConflicts,
      };
    });

    return merged;
  }

  async listBlocks(
    merchantId: string,
    staffId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string | null,
  ) {
    return this.prisma.staffAvailabilityBlock.findMany({
      where: {
        merchantId,
        staffId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
        ...(locationId ? { locationId } : {}),
      },
      orderBy: { startTime: "asc" },
    });
  }

  async deleteBlock(merchantId: string, blockId: string) {
    const exists = await this.prisma.staffAvailabilityBlock.findFirst({
      where: { id: blockId, merchantId },
    });

    if (!exists) {
      throw new NotFoundException("Block not found");
    }

    await this.prisma.staffAvailabilityBlock.delete({
      where: { id: blockId },
    });

    return { id: blockId };
  }
}
