import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface CreateMerchantDto {
  name: string;
  email: string;
  phone: string;
  subdomain: string;
  username: string;
  password: string;
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

  async createMerchant(dto: CreateMerchantDto) {
    // Check if subdomain already exists
    const existingMerchant = await this.prisma.merchant.findUnique({
      where: { subdomain: dto.subdomain },
    });

    if (existingMerchant) {
      throw new BadRequestException(`Merchant with subdomain "${dto.subdomain}" already exists`);
    }

    // Check if username already exists
    const existingAuth = await this.prisma.merchantAuth.findUnique({
      where: { username: dto.username.toUpperCase() },
    });

    if (existingAuth) {
      throw new BadRequestException(`Username "${dto.username}" already exists`);
    }

    // Get package
    const packageName = dto.packageName || 'Starter';
    const merchantPackage = await this.prisma.package.findUnique({
      where: { name: packageName },
    });

    if (!merchantPackage) {
      throw new BadRequestException(`Package "${packageName}" not found`);
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
          packageId: merchantPackage.id,
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          settings: {
            currency: 'AUD',
            timezone: 'Australia/Sydney',
            bookingBuffer: 15,
            cancellationHours: 24,
            bookingAdvanceHours: 168, // 7 days
            requirePinForRefunds: true,
            requirePinForCancellations: true,
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '12h',
            requireDeposit: false,
            depositPercentage: 0,
          },
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
          address: dto.address || '123 Main Street',
          suburb: dto.suburb || dto.city || 'Sydney',
          city: dto.city || 'Sydney',
          state: dto.state || 'NSW',
          country: 'Australia',
          postalCode: dto.postalCode || '2000',
          phone: dto.phone,
          email: dto.email,
          timezone: 'Australia/Sydney',
          businessHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '10:00', close: '16:00' },
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

    return {
      merchant: result,
      credentials: {
        username: dto.username.toUpperCase(),
        password: dto.password,
      },
      bookingUrl: `http://localhost:3001/${dto.subdomain}`,
    };
  }

  async listMerchants() {
    const merchants = await this.prisma.merchant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        subdomain: true,
        status: true,
        subscriptionStatus: true,
        createdAt: true,
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
        createdAt: 'desc',
      },
    });

    return merchants;
  }
}