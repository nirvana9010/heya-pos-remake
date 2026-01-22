import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  merchantId: string;
  staffId?: string;
  merchantUserId?: string;
  locationId?: string;
  type: "merchant" | "merchant_user" | "staff";
  permissions?: string[];
  locationIds?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "default-secret",
    });
  }

  async validate(payload: JwtPayload) {
    // Treat undefined type as merchant (backward compat for old tokens)
    if (payload.type === "merchant" || payload.type === undefined) {
      const merchantAuth = await this.prisma.merchantAuth.findUnique({
        where: { id: payload.sub },
        include: {
          merchant: {
            include: {
              locations: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      if (!merchantAuth || merchantAuth.merchant.status !== "ACTIVE") {
        throw new UnauthorizedException("Invalid token");
      }

      return {
        id: merchantAuth.id,
        merchantId: merchantAuth.merchant.id,
        type: "merchant",
        merchant: merchantAuth.merchant,
      };
    } else if (payload.type === "merchant_user") {
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

      if (!merchantUser || merchantUser.status !== "ACTIVE") {
        throw new UnauthorizedException("Invalid token");
      }

      if (merchantUser.merchant.status !== "ACTIVE") {
        throw new UnauthorizedException("Merchant account is not active");
      }

      // Get permissions from role
      const permissions = merchantUser.role.permissions;

      // Get location IDs the user has access to
      const locationIds = merchantUser.locations.map((ul) => ul.location.id);

      return {
        id: merchantUser.id,
        merchantId: merchantUser.merchantId,
        merchantUserId: merchantUser.id,
        type: "merchant_user",
        merchantUser,
        merchant: merchantUser.merchant,
        role: merchantUser.role,
        permissions,
        locationIds,
      };
    } else if (payload.type === "staff") {
      const staff = await this.prisma.staff.findUnique({
        where: { id: payload.staffId },
        include: {
          merchant: true,
          locations: true,
        },
      });

      if (!staff || staff.status !== "ACTIVE") {
        throw new UnauthorizedException("Invalid token");
      }

      return {
        id: staff.id,
        merchantId: staff.merchantId,
        staffId: staff.id,
        locationId: payload.locationId,
        type: "staff",
        staff,
        merchant: staff.merchant,
      };
    }

    throw new UnauthorizedException("Invalid token type");
  }
}
