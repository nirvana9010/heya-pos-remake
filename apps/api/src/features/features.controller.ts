import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FeaturesService } from "./features.service";
import { FEATURE_MODULES } from "./feature-modules";
interface RequestWithUser extends Express.Request {
  user: {
    merchantId: string;
    [key: string]: any;
  };
}

@Controller("features")
@UseGuards(JwtAuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  /**
   * Get merchant feature summary
   */
  @Get()
  async getFeatures(@Req() req: RequestWithUser) {
    const merchantId = req.user.merchantId;
    const summary =
      await this.featuresService.getMerchantFeatureSummary(merchantId);

    console.log("[Features API] Summary from service:", {
      enabled: summary.enabled,
      enabledType: typeof summary.enabled,
      enabledIsArray: Array.isArray(summary.enabled),
      available: summary.available,
      availableType: typeof summary.available,
      availableIsArray: Array.isArray(summary.available),
    });

    // Transform to match frontend expectations
    const merchant =
      await this.featuresService.getMerchantWithPackage(merchantId);
    const packageFeatures = this.featuresService.getPackageFeatures(merchant);
    const packageName = merchant?.package?.name || "Standard";

    const response = {
      enabledFeatures: summary.enabled,
      disabledFeatures: summary.available, // Features not enabled
      overrides: summary.config,
      packageFeatures: packageFeatures,
      packageName: packageName,
    };

    console.log("[Features API] Response being sent:", {
      response,
      enabledType: typeof response.enabledFeatures,
      disabledType: typeof response.disabledFeatures,
    });

    return response;
  }

  /**
   * Get all available feature modules (for admin)
   */
  @Get("modules")
  async getFeatureModules() {
    return Object.values(FEATURE_MODULES);
  }
}
