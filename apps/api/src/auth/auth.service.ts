import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MerchantLoginDto } from './dto/merchant-login.dto';
import { AuthUser, AuthSession } from '../types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateMerchant(emailOrUsername: string, password: string) {
    
    // First try to find merchant by email
    const merchant = await this.prisma.merchant.findFirst({
      where: { 
        email: {
          equals: emailOrUsername,
          mode: 'insensitive' // Case insensitive search
        }
      },
    });
    


    let merchantAuth = null;

    if (merchant) {
      // Found merchant by email, get their auth record
      merchantAuth = await this.prisma.merchantAuth.findUnique({
        where: { merchantId: merchant.id },
        include: {
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
              },
              package: true,
            },
          },
        },
      });
    } else {
      // Fallback to username for backward compatibility
      merchantAuth = await this.prisma.merchantAuth.findUnique({
        where: { username: emailOrUsername },
        include: {
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
              },
              package: true,
            },
          },
        },
      });
    }

    if (!merchantAuth) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, merchantAuth.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if merchant is active
    if (merchantAuth.merchant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Merchant account is not active');
    }

    // Check subscription status
    if (merchantAuth.merchant.subscriptionStatus === 'CANCELLED') {
      throw new UnauthorizedException('Subscription has been cancelled');
    }

    // Check trial expiry
    if (
      merchantAuth.merchant.subscriptionStatus === 'TRIAL' &&
      merchantAuth.merchant.trialEndsAt &&
      new Date(merchantAuth.merchant.trialEndsAt) < new Date()
    ) {
      throw new UnauthorizedException('Trial period has expired');
    }

    // Update last login
    await this.prisma.merchantAuth.update({
      where: { id: merchantAuth.id },
      data: { lastLoginAt: new Date() },
    });

    return merchantAuth;
  }

  async merchantLogin(dto: MerchantLoginDto): Promise<AuthSession> {
    const merchantAuth = await this.validateMerchant(dto.email, dto.password);
    const merchant = merchantAuth.merchant;

    // Create auth user object
    const authUser: AuthUser = {
      id: merchantAuth.id,
      merchantId: merchant.id,
      email: merchant.email,
      firstName: merchant.name,
      lastName: '',
      role: 'MERCHANT',
      permissions: ['*'], // Merchant has all permissions
      locations: merchant.locations.map(loc => loc.id),
    };

    // Generate tokens
    // Check if merchant has check-in lite package
    let hasCheckInOnly = false;
    if (merchant.package?.features) {
      // Handle both old array format and new object format
      const packageFeatures = merchant.package.features as any;
      const features = Array.isArray(packageFeatures) 
        ? packageFeatures 
        : packageFeatures.enabled || [];
      hasCheckInOnly = features.includes('check_in_only');
    }
    
    console.log(`[AUTH] Login for ${merchant.name}:`, {
      packageName: merchant.package?.name,
      hasCheckInOnly,
      features: merchant.package?.features
    });
    
    const payload = {
      sub: merchantAuth.id,
      merchantId: merchant.id,
      type: 'merchant',
      hasCheckInOnly,
    };

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    return {
      user: authUser,
      merchantId: merchant.id,
      token,
      refreshToken,
      expiresAt,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        subdomain: merchant.subdomain,
        locations: merchant.locations,
        settings: merchant.settings,
        package: merchant.package,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthSession> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      if (payload.type !== 'merchant') {
        throw new UnauthorizedException('Invalid token type');
      }

      const merchantAuth = await this.prisma.merchantAuth.findUnique({
        where: { id: payload.sub },
        include: {
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
              },
              package: true,
            },
          },
        },
      });

      if (!merchantAuth) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check if merchant is still active
      if (merchantAuth.merchant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Merchant account is not active');
      }

      // Create new auth session
      const authUser: AuthUser = {
        id: merchantAuth.id,
        merchantId: merchantAuth.merchant.id,
        email: merchantAuth.merchant.email,
        firstName: merchantAuth.merchant.name,
        lastName: '',
        role: 'MERCHANT',
        permissions: ['*'],
        locations: merchantAuth.merchant.locations.map(loc => loc.id),
      };

      // Check if merchant has check-in lite package
      let hasCheckInOnly = false;
      if (merchantAuth.merchant.package?.features) {
        // Handle both old array format and new object format
        const packageFeatures = merchantAuth.merchant.package.features as any;
        const features = Array.isArray(packageFeatures) 
          ? packageFeatures 
          : packageFeatures.enabled || [];
        hasCheckInOnly = features.includes('check_in_only');
      }
      
      const newPayload = {
        sub: merchantAuth.id,
        merchantId: merchantAuth.merchant.id,
        type: 'merchant',
        hasCheckInOnly,
      };

      const newToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);

      return {
        user: authUser,
        merchantId: merchantAuth.merchant.id,
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt,
        merchant: {
          id: merchantAuth.merchant.id,
          name: merchantAuth.merchant.name,
          email: merchantAuth.merchant.email,
          subdomain: merchantAuth.merchant.subdomain,
          locations: merchantAuth.merchant.locations,
          settings: merchantAuth.merchant.settings,
          package: merchantAuth.merchant.package,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createMerchantAuth(merchantId: string, username: string, password: string) {
    // Check if username already exists
    const existing = await this.prisma.merchantAuth.findUnique({
      where: { username },
    });

    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.merchantAuth.create({
      data: {
        merchantId,
        username,
        passwordHash: hashedPassword,
      },
    });
  }

  async changePassword(merchantAuthId: string, currentPassword: string, newPassword: string) {
    const merchantAuth = await this.prisma.merchantAuth.findUnique({
      where: { id: merchantAuthId },
    });

    if (!merchantAuth) {
      throw new UnauthorizedException('Invalid merchant auth');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, merchantAuth.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.merchantAuth.update({
      where: { id: merchantAuthId },
      data: { passwordHash: hashedPassword },
    });

    return { success: true };
  }
}