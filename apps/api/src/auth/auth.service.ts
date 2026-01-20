import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { MerchantLoginDto } from "./dto/merchant-login.dto";
import { AuthUser, AuthSession } from "../types";
import { MerchantUsersService } from "../merchant-users/merchant-users.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => MerchantUsersService))
    private merchantUsersService: MerchantUsersService,
  ) {}

  async validateMerchant(emailOrUsername: string, password: string) {
    // First try to find merchant by email
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        email: {
          equals: emailOrUsername,
          mode: "insensitive", // Case insensitive search
        },
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
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(
      password,
      merchantAuth.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Check if merchant is active
    if (merchantAuth.merchant.status !== "ACTIVE") {
      throw new UnauthorizedException("Merchant account is not active");
    }

    // Check subscription status
    if (merchantAuth.merchant.subscriptionStatus === "CANCELLED") {
      throw new UnauthorizedException("Subscription has been cancelled");
    }

    // Check trial expiry
    if (
      merchantAuth.merchant.subscriptionStatus === "TRIAL" &&
      merchantAuth.merchant.trialEndsAt &&
      new Date(merchantAuth.merchant.trialEndsAt) < new Date()
    ) {
      throw new UnauthorizedException("Trial period has expired");
    }

    // Update last login
    await this.prisma.merchantAuth.update({
      where: { id: merchantAuth.id },
      data: { lastLoginAt: new Date() },
    });

    return merchantAuth;
  }

  async merchantLogin(dto: MerchantLoginDto): Promise<AuthSession> {
    // First, try to validate as owner (MerchantAuth)
    try {
      const merchantAuth = await this.validateMerchant(dto.email, dto.password);
      return this.createMerchantSession(merchantAuth);
    } catch (ownerError) {
      // If owner auth fails, try MerchantUser login
      const merchantUserResult = await this.tryMerchantUserLogin(
        dto.email,
        dto.password,
      );
      if (merchantUserResult) {
        return merchantUserResult;
      }
      // Re-throw the original error if both fail
      throw ownerError;
    }
  }

  private async tryMerchantUserLogin(
    email: string,
    password: string,
  ): Promise<AuthSession | null> {
    // Find MerchantUser by email across all merchants
    const merchantUser = await this.prisma.merchantUser.findFirst({
      where: {
        email: {
          equals: email.toLowerCase(),
          mode: "insensitive",
        },
        status: "ACTIVE",
      },
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
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

    if (!merchantUser) {
      return null;
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(
      password,
      merchantUser.passwordHash,
    );
    if (!isValidPassword) {
      return null;
    }

    // Check merchant status
    if (merchantUser.merchant.status !== "ACTIVE") {
      throw new UnauthorizedException("Merchant account is not active");
    }

    // Check subscription status
    if (merchantUser.merchant.subscriptionStatus === "CANCELLED") {
      throw new UnauthorizedException("Subscription has been cancelled");
    }

    // Check trial expiry
    if (
      merchantUser.merchant.subscriptionStatus === "TRIAL" &&
      merchantUser.merchant.trialEndsAt &&
      new Date(merchantUser.merchant.trialEndsAt) < new Date()
    ) {
      throw new UnauthorizedException("Trial period has expired");
    }

    // Update last login
    await this.prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createMerchantUserSession(merchantUser);
  }

  private async createMerchantSession(merchantAuth: any): Promise<AuthSession> {
    const merchant = merchantAuth.merchant;

    // Create auth user object
    const authUser: AuthUser = {
      id: merchantAuth.id,
      merchantId: merchant.id,
      email: merchant.email,
      firstName: merchant.name,
      lastName: "",
      role: "MERCHANT",
      permissions: ["*"], // Merchant owner has all permissions
      locations: merchant.locations.map((loc: any) => loc.id),
      type: "merchant",
    };

    // Check if merchant has check-in lite package
    let hasCheckInOnly = false;
    if (merchant.package?.features) {
      const packageFeatures = merchant.package.features as any;
      const features = Array.isArray(packageFeatures)
        ? packageFeatures
        : packageFeatures.enabled || [];
      hasCheckInOnly = features.includes("check_in_only");
    }

    console.log(`[AUTH] Owner login for ${merchant.name}:`, {
      packageName: merchant.package?.name,
      hasCheckInOnly,
    });

    const payload = {
      sub: merchantAuth.id,
      merchantId: merchant.id,
      type: "merchant",
      hasCheckInOnly,
    };

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "365d",
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

  private async createMerchantUserSession(
    merchantUser: any,
  ): Promise<AuthSession> {
    const merchant = merchantUser.merchant;
    const permissions = merchantUser.role.permissions;

    // Get location IDs for this user (if restricted) or all merchant locations
    const locationIds =
      merchantUser.locations.length > 0
        ? merchantUser.locations.map((ul: any) => ul.location.id)
        : merchant.locations.map((loc: any) => loc.id);

    // Create auth user object
    const authUser: AuthUser = {
      id: merchantUser.id,
      merchantId: merchant.id,
      merchantUserId: merchantUser.id,
      email: merchantUser.email,
      firstName: merchantUser.firstName,
      lastName: merchantUser.lastName || "",
      role: merchantUser.role.name,
      permissions,
      locations: locationIds,
      type: "merchant_user",
    };

    // Check if merchant has check-in lite package
    let hasCheckInOnly = false;
    if (merchant.package?.features) {
      const packageFeatures = merchant.package.features as any;
      const features = Array.isArray(packageFeatures)
        ? packageFeatures
        : packageFeatures.enabled || [];
      hasCheckInOnly = features.includes("check_in_only");
    }

    console.log(`[AUTH] MerchantUser login for ${merchantUser.email}:`, {
      merchantName: merchant.name,
      role: merchantUser.role.name,
      permissions: permissions.length > 5 ? `${permissions.length} permissions` : permissions,
      locationIds,
    });

    const payload = {
      sub: merchantUser.id,
      merchantId: merchant.id,
      merchantUserId: merchantUser.id,
      type: "merchant_user",
      hasCheckInOnly,
      permissions,
      locationIds,
    };

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "365d",
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

      if (payload.type === "merchant") {
        return this.refreshMerchantToken(payload);
      } else if (payload.type === "merchant_user") {
        return this.refreshMerchantUserToken(payload);
      } else {
        throw new UnauthorizedException("Invalid token type");
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private async refreshMerchantToken(payload: any): Promise<AuthSession> {
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
      throw new UnauthorizedException("Invalid token");
    }

    if (merchantAuth.merchant.status !== "ACTIVE") {
      throw new UnauthorizedException("Merchant account is not active");
    }

    return this.createMerchantSession(merchantAuth);
  }

  private async refreshMerchantUserToken(payload: any): Promise<AuthSession> {
    const merchantUser = await this.prisma.merchantUser.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        locations: {
          include: {
            location: true,
          },
        },
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

    if (!merchantUser) {
      throw new UnauthorizedException("Invalid token");
    }

    if (merchantUser.status !== "ACTIVE") {
      throw new UnauthorizedException("User account is not active");
    }

    if (merchantUser.merchant.status !== "ACTIVE") {
      throw new UnauthorizedException("Merchant account is not active");
    }

    return this.createMerchantUserSession(merchantUser);
  }

  async createMerchantAuth(
    merchantId: string,
    username: string,
    password: string,
  ) {
    // Check if username already exists
    const existing = await this.prisma.merchantAuth.findUnique({
      where: { username },
    });

    if (existing) {
      throw new BadRequestException("Username already exists");
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

  async changePassword(
    merchantAuthId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const merchantAuth = await this.prisma.merchantAuth.findUnique({
      where: { id: merchantAuthId },
    });

    if (!merchantAuth) {
      throw new UnauthorizedException("Invalid merchant auth");
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      merchantAuth.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.merchantAuth.update({
      where: { id: merchantAuthId },
      data: { passwordHash: hashedPassword },
    });

    return { success: true };
  }
}
