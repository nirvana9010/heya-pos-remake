import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { DEFAULT_MERCHANT_SETTINGS } from "../merchant/merchant.constants";

interface CreateMerchantDto {
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  username: string;
  password: string;
  packageId: string;
  abn?: string;
  packageName?: string;
  address?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async createMerchant(dto: CreateMerchantDto & { skipTrial?: boolean }) {
    // Check if subdomain already exists
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { subdomain: dto.subdomain },
    });

    if (existingMerchant) {
      throw new BadRequestException(
        `Merchant with subdomain "${dto.subdomain}" already exists`,
      );
    }

    // Check if username already exists
    const existingAuth = await this.prisma.merchantAuth.findUnique({
      where: { username: dto.username.toUpperCase() },
    });

    if (existingAuth) {
      throw new BadRequestException(
        `Username "${dto.username}" already exists`,
      );
    }

    // Get package by ID or name
    let merchantPackage;
    if (dto.packageId) {
      merchantPackage = await this.prisma.package.findUnique({
        where: { id: dto.packageId },
      });
    } else {
      const packageName = dto.packageName || "Starter";
      merchantPackage = await this.prisma.package.findUnique({
        where: { name: packageName },
      });
    }

    if (!merchantPackage) {
      throw new BadRequestException(`Package not found`);
    }

    // Create merchant with auth and location in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create merchant
      const merchant = await tx.merchant.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          subdomain: dto.subdomain,
          abn: dto.abn,
          packageId: merchantPackage.id,
          subscriptionStatus: dto.skipTrial ? "ACTIVE" : "TRIAL",
          trialEndsAt: dto.skipTrial
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          settings: DEFAULT_MERCHANT_SETTINGS as any,
        },
      });

      // Create merchant auth
      await tx.merchantAuth.create({
        data: {
          merchantId: merchant.id,
          username: dto.username.toUpperCase(),
          passwordHash: await bcrypt.hash(dto.password, 10),
        },
      });

      // Create default location
      await tx.location.create({
        data: {
          merchantId: merchant.id,
          name: `${dto.name} Main`,
          address: dto.address || "123 Main Street",
          suburb: dto.suburb || dto.city || "Sydney",
          city: dto.city || "Sydney",
          state: dto.state || "NSW",
          country: "Australia",
          postalCode: dto.postalCode || "2000",
          phone: dto.phone,
          email: dto.email,
          timezone: "Australia/Sydney",
          businessHours: {
            monday: { open: "09:00", close: "18:00" },
            tuesday: { open: "09:00", close: "18:00" },
            wednesday: { open: "09:00", close: "18:00" },
            thursday: { open: "09:00", close: "18:00" },
            friday: { open: "09:00", close: "18:00" },
            saturday: { open: "10:00", close: "16:00" },
            sunday: { closed: true },
          },
          isActive: true,
          settings: {
            checkInRequired: false,
            autoCompleteBookings: false,
          },
        },
      });

      return merchant;
    });

    // Get the created merchant with package info
    const merchantWithPackage = await this.prisma.merchant.findUnique({
      where: { id: result.id },
      include: {
        package: true,
        _count: {
          select: {
            locations: true,
            staff: true,
            services: true,
            customers: true,
            bookings: true,
          },
        },
      },
    });

    return merchantWithPackage;
  }

  async listMerchants() {
    const merchants = await this.prisma.merchant.findMany({
      include: {
        package: true,
        _count: {
          select: {
            locations: true,
            staff: true,
            customers: true,
            services: true,
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to match frontend expectations
    return merchants.map((merchant) => ({
      ...merchant,
      isActive: merchant.status === "ACTIVE",
      subscription: {
        package: merchant.package,
        status: merchant.subscriptionStatus,
        endDate: merchant.subscriptionEnds || merchant.trialEndsAt,
      },
    }));
  }

  async getMerchant(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        package: true,
        locations: true,
        _count: {
          select: {
            locations: true,
            staff: true,
            customers: true,
            services: true,
            bookings: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new BadRequestException("Merchant not found");
    }

    // Transform to match frontend expectations
    return {
      ...merchant,
      isActive: merchant.status === "ACTIVE",
      subscription: {
        package: merchant.package,
        status: merchant.subscriptionStatus,
        endDate: merchant.subscriptionEnds || merchant.trialEndsAt,
      },
    };
  }

  async updateMerchant(
    id: string,
    dto: Partial<
      CreateMerchantDto & {
        isActive?: boolean;
        subscriptionStatus?: string;
        trialEndsAt?: Date | null;
        skipTrial?: boolean;
      }
    >,
  ) {
    console.log("[AdminService] updateMerchant called with:", { id, dto });
    const updateData: any = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.abn) updateData.abn = dto.abn;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Handle subscription status updates
    if (dto.subscriptionStatus) {
      updateData.subscriptionStatus = dto.subscriptionStatus;
    }

    // Handle trial end date updates
    if (dto.trialEndsAt !== undefined) {
      updateData.trialEndsAt = dto.trialEndsAt;
    }

    // If skipTrial is true, set to ACTIVE status and clear trial end date
    if (dto.skipTrial) {
      console.log("[AdminService] Removing trial for merchant:", id);
      updateData.subscriptionStatus = "ACTIVE";
      updateData.trialEndsAt = null;
    }

    // Handle subdomain updates with conflict validation
    if (dto.subdomain) {
      // Check if subdomain is changing and if new subdomain already exists
      const currentMerchant = await this.prisma.merchant.findUnique({
        where: { id },
        select: { subdomain: true },
      });

      if (currentMerchant && currentMerchant.subdomain !== dto.subdomain) {
        const existingMerchant = await this.prisma.merchant.findUnique({
          where: { subdomain: dto.subdomain },
        });

        if (existingMerchant) {
          throw new BadRequestException(
            `Subdomain "${dto.subdomain}" is already in use`,
          );
        }
      }

      updateData.subdomain = dto.subdomain;
    }

    // Update status if isActive is changed
    if (dto.isActive !== undefined) {
      updateData.status = dto.isActive ? "ACTIVE" : "INACTIVE";
      delete updateData.isActive;
    }

    // Handle package updates by validating the incoming packageId
    if (dto.packageId) {
      const targetPackage = await this.prisma.package.findUnique({
        where: { id: dto.packageId },
      });

      if (!targetPackage) {
        throw new BadRequestException(
          `Package with id "${dto.packageId}" not found`,
        );
      }

      updateData.packageId = dto.packageId;
    }

    console.log("[AdminService] Updating merchant with data:", updateData);
    const merchant = await this.prisma.merchant.update({
      where: { id },
      data: updateData,
      include: {
        package: true,
      },
    });
    console.log("[AdminService] Updated merchant:", {
      id: merchant.id,
      subscriptionStatus: merchant.subscriptionStatus,
      trialEndsAt: merchant.trialEndsAt,
    });

    // Transform to match frontend expectations
    return {
      ...merchant,
      isActive: merchant.status === "ACTIVE",
      subscription: {
        package: merchant.package,
        status: merchant.subscriptionStatus,
        endDate: merchant.subscriptionEnds || merchant.trialEndsAt,
      },
    };
  }

  async deleteMerchant(id: string) {
    // In production, this should soft delete
    await this.prisma.merchant.update({
      where: { id },
      data: {
        status: "DELETED",
      },
    });

    return { success: true };
  }

  async checkSubdomainAvailability(subdomain: string): Promise<boolean> {
    if (!subdomain) return false;

    const existing = await this.prisma.merchant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });

    return !existing;
  }

  async getPackages() {
    const packages = await this.prisma.package.findMany({
      orderBy: { monthlyPrice: "asc" },
    });

    // Add isActive field for compatibility
    return packages.map((pkg) => ({
      ...pkg,
      isActive: true,
      monthlyPrice: Number(pkg.monthlyPrice),
    }));
  }
}
