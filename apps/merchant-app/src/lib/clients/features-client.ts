import { BaseApiClient } from './base-client';

export interface MerchantFeatures {
  enabledFeatures: string[];
  disabledFeatures: string[];
  overrides: Record<string, any>;
  packageFeatures: string[];
  packageName: string;
}

export interface FeatureModule {
  id: string;
  name: string;
  description: string;
  category: string;
  dependencies: string[];
  routes: string[];
  settings?: Array<{
    key: string;
    type: string;
    default: any;
  }>;
}

export class FeaturesClient extends BaseApiClient {
  async getFeatures(): Promise<MerchantFeatures> {
    return await this.get<MerchantFeatures>('/v1/features');
  }

  async getFeatureModules(): Promise<FeatureModule[]> {
    return await this.get<FeatureModule[]>('/v1/features/modules');
  }
}