import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MerchantSettings } from '../types/models/merchant';

@Controller('merchant')
@UseGuards(JwtAuthGuard)
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get('settings')
  async getSettings(@Request() req) {
    return this.merchantService.getMerchantSettings(req.user.merchantId);
  }

  @Put('settings')
  async updateSettings(
    @Request() req,
    @Body() settings: Partial<MerchantSettings>,
  ) {
    return this.merchantService.updateMerchantSettings(
      req.user.merchantId,
      settings,
    );
  }

  @Get('profile')
  async getMerchantProfile(@Request() req) {
    return this.merchantService.getMerchantById(req.user.merchantId);
  }

  @Get('settings/debug')
  async debugSettings(@Request() req) {
    const merchant = await this.merchantService.debugGetMerchantSettings(req.user.merchantId);
    return merchant;
  }

  @Get('settings/raw')
  async getRawSettings(@Request() req) {
    return this.merchantService.getRawMerchantSettings(req.user.merchantId);
  }
}