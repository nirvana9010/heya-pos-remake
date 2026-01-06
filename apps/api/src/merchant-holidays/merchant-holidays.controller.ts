import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { MerchantHolidaysService } from "./merchant-holidays.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateMerchantHolidayDto } from "./dto/create-merchant-holiday.dto";
import { UpdateMerchantHolidayDto } from "./dto/update-merchant-holiday.dto";
import { SetStateHolidaysDto } from "./dto/set-state-holidays.dto";
import type { MerchantHolidayResponse } from "./merchant-holidays.service";
import type { AustralianState } from "@heya-pos/types";

@Controller({
  path: "merchant/holidays",
  version: "1",
})
@UseGuards(JwtAuthGuard)
export class MerchantHolidaysController {
  constructor(private readonly holidaysService: MerchantHolidaysService) {}

  @Get()
  async list(@CurrentUser() user: any): Promise<MerchantHolidayResponse> {
    return this.holidaysService.getHolidays(user.merchantId);
  }

  @Put("state")
  async syncState(
    @CurrentUser() user: any,
    @Body() body: SetStateHolidaysDto,
  ): Promise<MerchantHolidayResponse> {
    const { state, year } = body;
    return this.holidaysService.syncStateHolidays(
      user.merchantId,
      state as AustralianState,
      year,
    );
  }

  @Post()
  async createCustom(
    @CurrentUser() user: any,
    @Body() dto: CreateMerchantHolidayDto,
  ) {
    return this.holidaysService.createCustomHoliday(
      user.merchantId,
      dto.name,
      dto.date,
    );
  }

  @Patch(":id")
  async updateHoliday(
    @CurrentUser() user: any,
    @Param("id") holidayId: string,
    @Body() dto: UpdateMerchantHolidayDto,
  ) {
    return this.holidaysService.updateHoliday(user.merchantId, holidayId, dto);
  }

  @Delete(":id")
  async removeHoliday(
    @CurrentUser() user: any,
    @Param("id") holidayId: string,
  ) {
    await this.holidaysService.deleteHoliday(user.merchantId, holidayId);
    return { success: true };
  }
}
