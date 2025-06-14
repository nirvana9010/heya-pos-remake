import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantSettings } from '../types/models/merchant';

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService) {}

  async getMerchantSettings(merchantId: string): Promise<MerchantSettings> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // The settings field should already be a proper object thanks to Prisma's JSON handling
    // If it's not, we have a data corruption issue that needs to be fixed at the source
    return merchant.settings as unknown as MerchantSettings;
  }

  async updateMerchantSettings(
    merchantId: string,
    settings: Partial<MerchantSettings>,
  ): Promise<MerchantSettings> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const currentSettings = merchant.settings as unknown as MerchantSettings;
    const updatedSettings = { ...currentSettings, ...settings };

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { 
        settings: updatedSettings
      },
      select: { settings: true },
    });

    return updated.settings as unknown as MerchantSettings;
  }

  async getMerchantById(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        package: true,
        locations: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async debugGetMerchantSettings(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return {
      raw: merchant.settings,
      type: typeof merchant.settings,
      isArray: Array.isArray(merchant.settings),
      hasZeroKey: merchant.settings && typeof merchant.settings === 'object' && '0' in merchant.settings,
      keys: merchant.settings && typeof merchant.settings === 'object' ? Object.keys(merchant.settings).slice(0, 10) : null,
      firstTenChars: merchant.settings && typeof merchant.settings === 'object' && '0' in merchant.settings
        ? Array.from({length: 10}, (_, i) => merchant.settings[i]).join('')
        : null,
    };
  }

  async getRawMerchantSettings(merchantId: string) {
    const result = await this.prisma.$queryRaw`
      SELECT settings FROM Merchant WHERE id = ${merchantId}
    `;
    
    return {
      queryResult: result,
      firstRow: result[0] || null,
      settingsValue: result[0]?.settings || null,
      settingsType: typeof (result[0]?.settings),
    };
  }
}