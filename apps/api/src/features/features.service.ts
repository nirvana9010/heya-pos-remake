import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Merchant } from "@prisma/client";
import {
  FEATURE_MODULES,
  validateFeatureDependencies,
  canDisableFeature,
} from "./feature-modules";

interface MerchantWithPackage extends Merchant {
  package?: {
    id: string;
    name: string;
    features?: any;
  } | null;
}

@Injectable()
export class FeaturesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a merchant has access to a specific feature
   */
  async hasFeature(merchantId: string, featureId: string): Promise<boolean> {
    const merchant = await this.getMerchantWithPackage(merchantId);
    if (!merchant) return false;

    return this.hasFeatureForMerchant(merchant, featureId);
  }

  /**
   * Check if a merchant object has access to a specific feature
   */
  hasFeatureForMerchant(
    merchant: MerchantWithPackage,
    featureId: string,
  ): boolean {
    // Get features from package
    const packageFeatures = this.getPackageFeatures(merchant);

    // Get disabled features from merchant settings
    const disabledFeatures = this.getDisabledFeatures(merchant);

    // Feature must be in package and not disabled
    return (
      packageFeatures.includes(featureId) &&
      !disabledFeatures.includes(featureId)
    );
  }

  /**
   * Get all enabled features for a merchant
   */
  async getEnabledFeatures(merchantId: string): Promise<string[]> {
    const merchant = await this.getMerchantWithPackage(merchantId);
    if (!merchant) return [];

    return this.getEnabledFeaturesForMerchant(merchant);
  }

  /**
   * Get all enabled features for a merchant object
   */
  getEnabledFeaturesForMerchant(merchant: MerchantWithPackage): string[] {
    const packageFeatures = this.getPackageFeatures(merchant);
    const disabledFeatures = this.getDisabledFeatures(merchant);

    return packageFeatures.filter((f) => !disabledFeatures.includes(f));
  }

  /**
   * Get feature configuration for a merchant
   */
  async getFeatureConfig(merchantId: string, featureId: string): Promise<any> {
    const merchant = await this.getMerchantWithPackage(merchantId);
    if (!merchant) return {};

    return this.getFeatureConfigForMerchant(merchant, featureId);
  }

  /**
   * Get feature configuration for a merchant object
   */
  getFeatureConfigForMerchant(
    merchant: MerchantWithPackage,
    featureId: string,
  ): any {
    // Package-level config
    const packageConfig = merchant.package?.features?.config?.[featureId] || {};

    // Merchant-level overrides
    const merchantOverrides =
      (merchant.settings as any)?.featureOverrides?.config?.[featureId] || {};

    // Merge with merchant overrides taking precedence
    return { ...packageConfig, ...merchantOverrides };
  }

  /**
   * Check if features can be enabled for a merchant
   */
  async canEnableFeatures(
    merchantId: string,
    featuresToEnable: string[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    const currentFeatures = await this.getEnabledFeatures(merchantId);
    const allFeatures = [...new Set([...currentFeatures, ...featuresToEnable])];

    return validateFeatureDependencies(allFeatures);
  }

  /**
   * Check if features can be disabled for a merchant
   */
  async canDisableFeatures(
    merchantId: string,
    featuresToDisable: string[],
  ): Promise<{ canDisable: boolean; errors: string[] }> {
    const currentFeatures = await this.getEnabledFeatures(merchantId);
    const errors: string[] = [];

    for (const feature of featuresToDisable) {
      const result = canDisableFeature(feature, currentFeatures);
      if (!result.canDisable && result.reason) {
        errors.push(result.reason);
      }
    }

    return {
      canDisable: errors.length === 0,
      errors,
    };
  }

  /**
   * Update merchant feature overrides
   */
  async updateFeatureOverrides(
    merchantId: string,
    overrides: {
      disabled?: string[];
      config?: Record<string, any>;
    },
  ): Promise<void> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const currentSettings = (merchant.settings as any) || {};
    const newSettings = {
      ...currentSettings,
      featureOverrides: {
        ...currentSettings.featureOverrides,
        ...overrides,
      },
    };

    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { settings: newSettings },
    });
  }

  /**
   * Create system service for check-in only merchants
   */
  async createCheckInService(merchantId: string): Promise<void> {
    // Check if service already exists
    const existingService = await this.prisma.service.findFirst({
      where: {
        merchantId,
        name: "Check-In",
      },
    });

    if (existingService) {
      return;
    }

    // Create the check-in service
    await this.prisma.service.create({
      data: {
        merchantId,
        name: "Check-In",
        description: "System service for check-ins",
        duration: 0,
        price: 0,
        currency: "AUD",
        isActive: true,
        metadata: {
          isSystem: true,
          hidden: true,
        },
      },
    });
  }

  /**
   * Get feature limits for a merchant
   */
  async getFeatureLimits(merchantId: string): Promise<Record<string, any>> {
    const merchant = await this.getMerchantWithPackage(merchantId);
    if (!merchant || !merchant.package) return {};

    const limits: Record<string, any> = {};

    // Map package limits to feature limits
    if ("maxStaff" in merchant.package) {
      limits.staff = { max: merchant.package.maxStaff };
    }
    if ("maxServices" in merchant.package) {
      limits.services = { max: merchant.package.maxServices };
    }
    if ("maxCustomers" in merchant.package) {
      limits.customers = { max: merchant.package.maxCustomers };
    }
    if ("maxLocations" in merchant.package) {
      limits.locations = { max: merchant.package.maxLocations };
    }

    return limits;
  }

  /**
   * Get merchant summary for feature discovery
   */
  async getMerchantFeatureSummary(merchantId: string): Promise<{
    enabled: string[];
    available: string[];
    limits: Record<string, any>;
    config: Record<string, any>;
  }> {
    const merchant = await this.getMerchantWithPackage(merchantId);
    if (!merchant) {
      return {
        enabled: [],
        available: [],
        limits: {},
        config: {},
      };
    }

    const enabled = this.getEnabledFeaturesForMerchant(merchant);
    const all = Object.keys(FEATURE_MODULES);
    const available = all.filter((f) => !enabled.includes(f));
    const limits = await this.getFeatureLimits(merchantId);

    // Get config for all enabled features
    const config: Record<string, any> = {};
    for (const feature of enabled) {
      const featureConfig = this.getFeatureConfigForMerchant(merchant, feature);
      if (Object.keys(featureConfig).length > 0) {
        config[feature] = featureConfig;
      }
    }

    return {
      enabled,
      available,
      limits,
      config,
    };
  }

  // Helper methods (public for controller use)
  async getMerchantWithPackage(
    merchantId: string,
  ): Promise<MerchantWithPackage | null> {
    return this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { package: true },
    });
  }

  getPackageFeatures(merchant: MerchantWithPackage): string[] {
    // Handle both old and new feature formats
    const features = merchant.package?.features;

    if (Array.isArray(features)) {
      // Old format: ['feature1', 'feature2']
      // Map old features to new feature IDs
      return this.mapLegacyFeatures(features);
    } else if (features?.enabled) {
      // New format: { enabled: ['feature1', 'feature2'] }
      return features.enabled;
    }

    // Default features based on package type
    return this.getDefaultFeaturesForPackage(merchant.packageId);
  }

  private getDisabledFeatures(merchant: MerchantWithPackage): string[] {
    return (merchant.settings as any)?.featureOverrides?.disabled || [];
  }

  private mapLegacyFeatures(legacyFeatures: string[]): string[] {
    const featureMap: Record<string, string[]> = {
      basic_booking: ["customers", "services", "bookings"],
      advanced_booking: ["customers", "services", "bookings", "staff", "roster"],
      customer_management: ["customers"],
      basic_reports: ["reports"],
      advanced_reports: ["reports"],
      loyalty_program: ["loyalty"],
      multi_location: ["locations"],
    };

    const mappedFeatures = new Set<string>();

    for (const legacy of legacyFeatures) {
      const mapped = featureMap[legacy];
      if (mapped) {
        mapped.forEach((f) => mappedFeatures.add(f));
      }
    }

    // Always include payments if any booking feature exists
    if (mappedFeatures.has("bookings")) {
      mappedFeatures.add("payments");
    }

    // Always include roster if staff feature exists
    if (mappedFeatures.has("staff")) {
      mappedFeatures.add("roster");
    }

    return Array.from(mappedFeatures);
  }

  private getDefaultFeaturesForPackage(packageId: string): string[] {
    // Return default features based on known package IDs
    // This is a fallback for merchants without feature configuration

    // You can map specific package IDs to feature sets here
    // For now, return a basic set
    return ["customers", "services", "bookings", "payments", "reports"];
  }
}
