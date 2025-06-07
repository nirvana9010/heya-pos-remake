import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PinAuthDto } from './dto/pin-auth.dto';
import { AuthUser, AuthSession, PinAuthResponse } from '../types';
import { PinAuthManager } from '../utils/shared/pin';
import { AuditLog } from '@prisma/client';

@Injectable()
export class PinAuthService {
  private pinAuthManager: PinAuthManager;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.pinAuthManager = new PinAuthManager(3, 15); // 3 attempts, 15 min lockout
  }

  async authenticatePin(
    dto: PinAuthDto,
    merchantId: string,
    ipAddress?: string,
  ): Promise<PinAuthResponse> {
    const { pin, locationId } = dto;

    // Check if account is locked
    const lockKey = `${merchantId}:${locationId}:${pin.substring(0, 2)}`; // Use first 2 digits to prevent timing attacks
    if (this.pinAuthManager.isLocked(lockKey)) {
      const minutesRemaining = this.pinAuthManager.getTimeUntilUnlock(lockKey);
      throw new ForbiddenException(
        `Too many failed attempts. Please try again in ${minutesRemaining} minutes.`,
      );
    }

    // Find staff by PIN within the merchant's staff
    const staffList = await this.prisma.staff.findMany({
      where: {
        merchantId,
        status: 'ACTIVE',
      },
      include: {
        locations: {
          where: {
            locationId,
          },
        },
      },
    });

    let authenticatedStaff = null;
    for (const staff of staffList) {
      if (await bcrypt.compare(pin, staff.pin)) {
        authenticatedStaff = staff;
        break;
      }
    }

    if (!authenticatedStaff) {
      // Record failed attempt
      const tracker = this.pinAuthManager.recordAttempt(lockKey, false);
      
      if (tracker.lockedUntil) {
        throw new ForbiddenException(
          'Too many failed attempts. Account has been locked.',
        );
      }

      const remainingAttempts = this.pinAuthManager.getRemainingAttempts(lockKey);
      throw new UnauthorizedException(
        `Invalid PIN. ${remainingAttempts} attempts remaining.`,
      );
    }

    // Check if staff has access to this location
    if (!authenticatedStaff.locations.some(loc => loc.locationId === locationId)) {
      throw new ForbiddenException('Staff does not have access to this location');
    }

    // Clear failed attempts on successful authentication
    this.pinAuthManager.clearAttempts(lockKey);

    // Update last login
    await this.prisma.staff.update({
      where: { id: authenticatedStaff.id },
      data: { lastLogin: new Date() },
    });

    // Log the authentication
    await this.createAuditLog({
      merchantId,
      staffId: authenticatedStaff.id,
      action: 'staff.login',
      entityType: 'staff',
      entityId: authenticatedStaff.id,
      details: { locationId, method: 'pin' },
      ipAddress,
    });

    // Get permissions based on access level
    const permissions = this.getPermissionsByAccessLevel(authenticatedStaff.accessLevel);

    return {
      staffId: authenticatedStaff.id,
      firstName: authenticatedStaff.firstName,
      lastName: authenticatedStaff.lastName,
      role: this.getRoleByAccessLevel(authenticatedStaff.accessLevel),
      permissions,
    };
  }

  async createStaffSession(
    staffId: string,
    merchantId: string,
    locationId: string,
  ): Promise<AuthSession> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        locations: true,
        merchant: true,
      },
    });

    if (!staff) {
      throw new UnauthorizedException('Staff not found');
    }

    const authUser: AuthUser = {
      id: staff.id,
      merchantId: staff.merchantId,
      staffId: staff.id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: this.getRoleByAccessLevel(staff.accessLevel),
      permissions: this.getPermissionsByAccessLevel(staff.accessLevel),
      locationId,
      locations: staff.locations.map(loc => loc.locationId),
    };

    const payload = {
      sub: staff.id,
      merchantId,
      staffId: staff.id,
      locationId,
      type: 'staff',
    };

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 365 days for permanent sessions

    return {
      user: authUser,
      merchantId,
      locationId,
      token,
      refreshToken,
      expiresAt,
    };
  }

  async verifyPinForAction(
    staffId: string,
    pin: string,
    action: string,
    ipAddress?: string,
  ): Promise<boolean> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff || staff.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid staff');
    }

    const isValidPin = await bcrypt.compare(pin, staff.pin);
    if (!isValidPin) {
      // Log failed PIN verification
      await this.createAuditLog({
        merchantId: staff.merchantId,
        staffId: staff.id,
        action: `pin.verify.failed`,
        entityType: 'staff',
        entityId: staff.id,
        details: { attemptedAction: action },
        ipAddress,
      });

      throw new UnauthorizedException('Invalid PIN');
    }

    // Log successful PIN verification
    await this.createAuditLog({
      merchantId: staff.merchantId,
      staffId: staff.id,
      action: `pin.verify.success`,
      entityType: 'staff',
      entityId: staff.id,
      details: { verifiedAction: action },
      ipAddress,
    });

    return true;
  }

  async changePin(
    staffId: string,
    currentPin: string,
    newPin: string,
    ipAddress?: string,
  ): Promise<{ success: boolean }> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new UnauthorizedException('Staff not found');
    }

    // Verify current PIN
    const isValidPin = await bcrypt.compare(currentPin, staff.pin);
    if (!isValidPin) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update PIN
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { pin: hashedPin },
    });

    // Log PIN change
    await this.createAuditLog({
      merchantId: staff.merchantId,
      staffId: staff.id,
      action: 'staff.pin.changed',
      entityType: 'staff',
      entityId: staff.id,
      details: { changedAt: new Date().toISOString() },
      ipAddress,
    });

    return { success: true };
  }

  private getRoleByAccessLevel(accessLevel: number): string {
    switch (accessLevel) {
      case 3:
        return 'OWNER';
      case 2:
        return 'MANAGER';
      case 1:
      default:
        return 'STAFF';
    }
  }

  private getPermissionsByAccessLevel(accessLevel: number): string[] {
    // These match the constants in @heya-pos/utils
    const basePermissions = [
      'booking.view',
      'booking.create',
      'booking.update',
      'customer.view',
      'customer.create',
      'payment.view',
      'payment.process',
      'service.view',
    ];

    const managerPermissions = [
      ...basePermissions,
      'booking.cancel',
      'customer.update',
      'staff.view',
      'report.view',
    ];

    const ownerPermissions = [
      '*', // All permissions
    ];

    switch (accessLevel) {
      case 3:
        return ownerPermissions;
      case 2:
        return managerPermissions;
      case 1:
      default:
        return basePermissions;
    }
  }

  private async createAuditLog(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        ...data,
        details: data.details as any,
      },
    });
  }
}