import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { LoyaltyService } from "./loyalty.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PinRequiredGuard } from "../auth/guards/pin-required.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PinRequired } from "../auth/decorators/pin-required.decorator";
import { UpdateLoyaltyRemindersDto } from "./dto/update-loyalty-reminders.dto";

@Controller("loyalty")
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  @Get("program")
  async getProgram(@CurrentUser() user: any) {
    const merchantId = user?.merchantId || "cmbcxfd6s0003vopjw80c3qpe";
    return this.loyaltyService.getProgram(merchantId);
  }

  @Post("program")
  @HttpCode(HttpStatus.OK)
  async updateProgram(@CurrentUser() user: any, @Body() data: any) {
    // Validate program data
    if (data.type && !["VISITS", "POINTS"].includes(data.type)) {
      throw new BadRequestException(
        "Invalid loyalty type. Must be VISITS or POINTS",
      );
    }

    if (data.type === "VISITS") {
      if (!data.visitsRequired || data.visitsRequired < 1) {
        throw new BadRequestException("Visits required must be at least 1");
      }
      if (
        !data.visitRewardType ||
        !["FREE", "PERCENTAGE"].includes(data.visitRewardType)
      ) {
        throw new BadRequestException(
          "Invalid reward type. Must be FREE or PERCENTAGE",
        );
      }
      if (
        data.visitRewardType === "PERCENTAGE" &&
        (!data.visitRewardValue ||
          data.visitRewardValue <= 0 ||
          data.visitRewardValue > 100)
      ) {
        throw new BadRequestException(
          "Percentage reward must be between 1 and 100",
        );
      }
    }

    const merchantId = user?.merchantId || "cmbcxfd6s0003vopjw80c3qpe";
    return this.loyaltyService.updateProgram(merchantId, data);
  }

  @Get("reminders")
  async getReminderConfig(@CurrentUser() user: any) {
    return this.loyaltyService.getReminderTouchpoints(user.merchantId);
  }

  @Post("reminders")
  @HttpCode(HttpStatus.OK)
  async updateReminderConfig(
    @CurrentUser() user: any,
    @Body() dto: UpdateLoyaltyRemindersDto,
  ) {
    return this.loyaltyService.updateReminderTouchpoints(
      user.merchantId,
      dto.touchpoints ?? [],
    );
  }

  @Get("customers/:customerId")
  async getCustomerLoyalty(
    @Param("customerId") customerId: string,
    @CurrentUser() user: any,
  ) {
    return this.loyaltyService.getCustomerLoyalty(customerId, user.merchantId);
  }

  @Post("redeem-visit")
  // @UseGuards(PinRequiredGuard)
  // @PinRequired('redeem_loyalty')
  @HttpCode(HttpStatus.OK)
  async redeemVisit(
    @Body() body: { customerId: string; bookingId?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.customerId) {
      throw new BadRequestException("Customer ID is required");
    }

    return this.loyaltyService.redeemVisitReward(
      body.customerId,
      user.merchantId,
      body.bookingId,
      user.type === "staff" ? user.staffId : undefined,
    );
  }

  @Post("redeem-points")
  // @UseGuards(PinRequiredGuard)
  // @PinRequired('redeem_loyalty')
  @HttpCode(HttpStatus.OK)
  async redeemPoints(
    @Body() body: { customerId: string; points: number; bookingId?: string },
    @CurrentUser() user: any,
  ) {
    if (!body.customerId) {
      throw new BadRequestException("Customer ID is required");
    }
    if (!body.points || body.points <= 0) {
      throw new BadRequestException("Points must be greater than 0");
    }

    return this.loyaltyService.redeemPoints(
      body.customerId,
      user.merchantId,
      body.points,
      body.bookingId,
      user.type === "staff" ? user.staffId : undefined,
    );
  }

  @Post("adjust")
  // @UseGuards(PinRequiredGuard)
  // @PinRequired('adjust_loyalty')
  @HttpCode(HttpStatus.OK)
  async adjustLoyalty(
    @Body()
    body: {
      customerId: string;
      points?: number;
      visits?: number;
      reason: string;
    },
    @CurrentUser() user: any,
  ) {
    if (!body.customerId) {
      throw new BadRequestException("Customer ID is required");
    }
    if (!body.reason || body.reason.trim().length === 0) {
      throw new BadRequestException("Reason is required for adjustments");
    }
    if (body.points === undefined && body.visits === undefined) {
      throw new BadRequestException(
        "Either points or visits adjustment is required",
      );
    }

    return this.loyaltyService.adjustLoyalty(
      body.customerId,
      user.merchantId,
      {
        points: body.points,
        visits: body.visits,
        reason: body.reason,
      },
      user.type === "staff" ? user.staffId : undefined,
    );
  }

  // Quick check endpoint for POS
  @Get("check/:customerId")
  async checkLoyalty(
    @Param("customerId") customerId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const loyalty = await this.loyaltyService.getCustomerLoyalty(
        customerId,
        user.merchantId,
      );
      const program = await this.loyaltyService.getProgram(user.merchantId);

      return {
        hasProgram: !!program?.isActive,
        type: program?.type || null,
        ...loyalty,
      };
    } catch (error) {
      // If customer not found, return empty state
      return {
        hasProgram: false,
        type: null,
        currentPoints: 0,
        currentVisits: 0,
      };
    }
  }
}
