import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";
import { JwtAuthGuard } from "../../../../auth/guards/jwt-auth.guard";
import { PinAuthGuard } from "../../../../auth/guards/pin-auth.guard";
import { CurrentUser } from "../../../../auth/decorators/current-user.decorator";
import { StaffAvailabilityBlockService } from "../../application/services/staff-availability-block.service";
import { PrismaService } from "../../../../prisma/prisma.service";
import { MerchantSettings } from "../../../../types/models/merchant";
import { normalizeMerchantSettings } from "../../../../utils/shared/merchant-settings";
import { TimezoneUtils } from "../../../../utils/shared/timezone";

class CreateBlockDto {
  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;

  @IsOptional()
  suppressWarnings?: boolean;
}

class ListBlocksQueryDto {
  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

@Controller({
  path: "staff",
  version: "2",
})
@UseGuards(JwtAuthGuard, PinAuthGuard)
export class StaffBlocksV2Controller {
  constructor(
    private readonly blocksService: StaffAvailabilityBlockService,
    private readonly prisma: PrismaService,
  ) {}

  private ensureBlocksEnabled(settings: any) {
    const normalized = normalizeMerchantSettings<MerchantSettings>(settings);
    // Default to true - block feature is non-intrusive and enabled by default
    const enabled = normalized?.enableCalendarBlocks ?? true;
    if (!enabled) {
      throw new BadRequestException(
        "Calendar blocks feature is disabled for this merchant",
      );
    }
  }

  @Post(":staffId/blocks")
  async createBlock(
    @CurrentUser() user: any,
    @Param("staffId") staffId: string,
    @Body() dto: CreateBlockDto,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { settings: true },
    });
    this.ensureBlocksEnabled(merchant?.settings);

    // Get merchant timezone from settings
    const merchantSettings = normalizeMerchantSettings<MerchantSettings>(
      merchant?.settings,
    );
    const timezone = merchantSettings?.timezone || "Australia/Sydney";

    // Parse the incoming datetime strings (in merchant timezone)
    // Expected format: "2025-11-27T14:00:00" or "2025-11-27T14:00"
    const startMatch = dto.startTime.match(
      /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/,
    );
    const endMatch = dto.endTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);

    if (!startMatch || !endMatch) {
      throw new BadRequestException(
        "Invalid datetime format. Expected YYYY-MM-DDTHH:mm",
      );
    }

    const [, startDate, startTimeStr] = startMatch;
    const [, endDate, endTimeStr] = endMatch;

    // Convert from merchant timezone to UTC using TimezoneUtils
    const startTime = TimezoneUtils.createDateInTimezone(
      startDate,
      startTimeStr,
      timezone,
    );
    const endTime = TimezoneUtils.createDateInTimezone(
      endDate,
      endTimeStr,
      timezone,
    );

    const result = await this.blocksService.createBlock({
      merchantId: user.merchantId,
      staffId,
      startTime,
      endTime,
      locationId: dto.locationId,
      reason: dto.reason,
      createdById: user.staffId || null,
      suppressWarnings: dto.suppressWarnings,
    });

    return result;
  }

  @Get(":staffId/blocks")
  async listBlocks(
    @CurrentUser() user: any,
    @Param("staffId") staffId: string,
    @Query() query: ListBlocksQueryDto,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { settings: true },
    });
    this.ensureBlocksEnabled(merchant?.settings);

    // Get merchant timezone from settings
    const merchantSettings = normalizeMerchantSettings<MerchantSettings>(
      merchant?.settings,
    );
    const timezone = merchantSettings?.timezone || "Australia/Sydney";

    // Parse date strings (expected format: "2025-11-27" or "2025-11-27T00:00:00")
    const startDateStr = query.startDate.split("T")[0];
    const endDateStr = query.endDate.split("T")[0];

    // Convert to start and end of day in merchant timezone
    const startDate = TimezoneUtils.createDateInTimezone(
      startDateStr,
      "00:00",
      timezone,
    );
    const endDate = TimezoneUtils.createDateInTimezone(
      endDateStr,
      "23:59",
      timezone,
    );

    if (startDate >= endDate) {
      throw new BadRequestException("startDate must be before endDate");
    }

    const blocks = await this.blocksService.listBlocks(
      user.merchantId,
      staffId,
      startDate,
      endDate,
      query.locationId,
    );

    return { blocks };
  }

  @Delete("blocks/:blockId")
  async deleteBlock(
    @CurrentUser() user: any,
    @Param("blockId") blockId: string,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: user.merchantId },
      select: { settings: true },
    });
    this.ensureBlocksEnabled(merchant?.settings);

    return this.blocksService.deleteBlock(user.merchantId, blockId);
  }
}
