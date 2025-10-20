import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantSettings } from '../types/models/merchant';
import { DEFAULT_MERCHANT_SETTINGS } from './merchant.constants';
import { normalizeMerchantSettings } from '../utils/shared/merchant-settings';

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

    const settings = normalizeMerchantSettings<MerchantSettings>(merchant.settings);

    console.log('[MerchantService] getMerchantSettings returning:', JSON.stringify(settings, null, 2));
    return settings;
  }

  async updateMerchantSettings(
    merchantId: string,
    settings: Partial<MerchantSettings>,
  ): Promise<MerchantSettings> {
    console.log('[MerchantService] updateMerchantSettings called with:', JSON.stringify(settings, null, 2));
    
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const currentSettings = normalizeMerchantSettings<MerchantSettings>(merchant.settings);
    const updatedSettings = { ...currentSettings, ...settings };

    const previousAdvanceHours = currentSettings.bookingAdvanceHours ?? DEFAULT_MERCHANT_SETTINGS.bookingAdvanceHours;
    const requestedAdvanceHours = settings.bookingAdvanceHours;
    const advanceHoursProvided = requestedAdvanceHours !== undefined && requestedAdvanceHours !== null;
    const normalizedAdvanceHours = advanceHoursProvided ? Number(requestedAdvanceHours) : undefined;
    const previousAdvanceDays = Math.ceil(previousAdvanceHours / 24);
    const nextAdvanceDays = advanceHoursProvided && Number.isFinite(normalizedAdvanceHours)
      ? Math.ceil((normalizedAdvanceHours as number) / 24)
      : previousAdvanceDays;

    if (advanceHoursProvided && Number.isFinite(normalizedAdvanceHours)) {
      updatedSettings.bookingAdvanceHours = normalizedAdvanceHours as number;
    }

    console.log('[MerchantService] Saving settings:', JSON.stringify(updatedSettings, null, 2));

    const updated = await this.prisma.$transaction(async (tx) => {
      if (advanceHoursProvided && Number.isFinite(normalizedAdvanceHours) && previousAdvanceDays !== nextAdvanceDays) {
        await tx.service.updateMany({
          where: {
            merchantId,
            maxAdvanceBooking: previousAdvanceDays,
          },
          data: {
            maxAdvanceBooking: nextAdvanceDays,
          },
        });
      }

      return tx.merchant.update({
        where: { id: merchantId },
        data: {
          settings: updatedSettings as any,
        },
        select: { settings: true },
      });
    });

    console.log('[MerchantService] Settings saved successfully');
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

  async updateMerchantProfile(
    merchantId: string,
    profileData: {
      name?: string;
      email?: string;
      phone?: string;
      abn?: string;
      website?: string;
      description?: string;
    },
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Only update provided fields
    const updateData: any = {};
    if (profileData.name !== undefined) updateData.name = profileData.name;
    if (profileData.email !== undefined) updateData.email = profileData.email;
    if (profileData.phone !== undefined) updateData.phone = profileData.phone;
    if (profileData.abn !== undefined) updateData.abn = profileData.abn;
    if (profileData.website !== undefined) updateData.website = profileData.website;
    if (profileData.description !== undefined) updateData.description = profileData.description;

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
      include: {
        package: true,
        locations: true,
      },
    });

    // Also update the primary location's email and phone if provided
    if (profileData.email !== undefined || profileData.phone !== undefined) {
      const primaryLocation = await this.prisma.location.findFirst({
        where: {
          merchantId: merchantId,
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc', // Get the oldest active location as primary
        },
      });

      if (primaryLocation) {
        const locationUpdateData: any = {};
        if (profileData.email !== undefined) locationUpdateData.email = profileData.email;
        if (profileData.phone !== undefined) locationUpdateData.phone = profileData.phone;

        await this.prisma.location.update({
          where: { id: primaryLocation.id },
          data: locationUpdateData,
        });
      }
    }

    return updated;
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

  async updateLocation(
    merchantId: string,
    locationData: {
      address?: string;
      suburb?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      phone?: string;
      email?: string;
    },
  ) {
    // Find the primary location for this merchant
    const primaryLocation = await this.prisma.location.findFirst({
      where: {
        merchantId: merchantId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the oldest active location as primary
      },
    });

    if (!primaryLocation) {
      throw new NotFoundException('No active location found for this merchant');
    }

    // Update only the provided fields
    const updateData: any = {};
    if (locationData.address !== undefined) updateData.address = locationData.address;
    if (locationData.suburb !== undefined) updateData.suburb = locationData.suburb;
    if (locationData.state !== undefined) updateData.state = locationData.state;
    if (locationData.postalCode !== undefined) updateData.postalCode = locationData.postalCode;
    if (locationData.country !== undefined) updateData.country = locationData.country;
    if (locationData.phone !== undefined) updateData.phone = locationData.phone;
    if (locationData.email !== undefined) updateData.email = locationData.email;

    const updatedLocation = await this.prisma.location.update({
      where: { id: primaryLocation.id },
      data: updateData,
    });

    return updatedLocation;
  }
}
