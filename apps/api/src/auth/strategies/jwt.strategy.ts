import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  merchantId: string;
  staffId?: string;
  locationId?: string;
  type: 'merchant' | 'staff';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'merchant') {
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

      if (!merchantAuth || merchantAuth.merchant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        id: merchantAuth.id,
        merchantId: merchantAuth.merchant.id,
        type: 'merchant',
        merchant: merchantAuth.merchant,
      };
    } else if (payload.type === 'staff') {
      const staff = await this.prisma.staff.findUnique({
        where: { id: payload.staffId },
        include: {
          merchant: true,
          locations: true,
        },
      });

      if (!staff || staff.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        id: staff.id,
        merchantId: staff.merchantId,
        staffId: staff.id,
        locationId: payload.locationId,
        type: 'staff',
        staff,
        merchant: staff.merchant,
      };
    }

    throw new UnauthorizedException('Invalid token type');
  }
}