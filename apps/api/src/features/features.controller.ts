import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeaturesService } from './features.service';
import { FEATURE_MODULES } from './feature-modules';
interface RequestWithUser extends Express.Request {
  user: {
    merchantId: string;
    [key: string]: any;
  };
}

@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  /**
   * Get merchant feature summary
   */
  @Get()
  async getFeatures(@Req() req: RequestWithUser) {
    const merchantId = req.user.merchantId;
    return this.featuresService.getMerchantFeatureSummary(merchantId);
  }

  /**
   * Get all available feature modules (for admin)
   */
  @Get('modules')
  async getFeatureModules() {
    return Object.values(FEATURE_MODULES);
  }
}