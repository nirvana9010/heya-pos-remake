import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { PinAuthManager } from '../utils/shared/pin';
import { AuditLog } from '@prisma/client';
import { formatName } from '@heya-pos/utils';

@Injectable()
export class PinAuthService {
  private pinAuthManager: PinAuthManager;

  constructor(
    private prisma: PrismaService,
  ) {
    this.pinAuthManager = new PinAuthManager(3, 15); // 3 attempts, 15 min lockout
  }

  async verifyPinAndLogAction(
    dto: VerifyPinDto,
    merchantId: string,
    ipAddress?: string,
  ): Promise<{
    success: boolean;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
      accessLevel: number;
      role: string;
    };
  }> {
    const { staffId, pin, action, resourceId } = dto;

    // Check if account is locked
    const lockKey = `${merchantId}:${pin.substring(0, 2)}`; // Use first 2 digits to prevent timing attacks
    if (this.pinAuthManager.isLocked(lockKey)) {
      const minutesRemaining = this.pinAuthManager.getTimeUntilUnlock(lockKey);
      throw new ForbiddenException(
        `Too many failed attempts. Please try again in ${minutesRemaining} minutes.`,
      );
    }

    // Find specific staff member
    const staff = await this.prisma.staff.findFirst({
      where: {
        id: staffId,
        merchantId,
        status: 'ACTIVE',
      },
    });

    if (!staff) {
      throw new UnauthorizedException('Staff member not found');
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, staff.pin);
    const authenticatedStaff = isPinValid ? staff : null;

    if (!authenticatedStaff) {
      // Record failed attempt
      const tracker = this.pinAuthManager.recordAttempt(lockKey, false);
      
      if (tracker.lockedUntil) {
        throw new ForbiddenException(
          'Too many failed attempts. Account has been locked.',
        );
      }

      const remainingAttempts = this.pinAuthManager.getRemainingAttempts(lockKey);
      
      // Log failed PIN verification
      await this.createAuditLog({
        merchantId,
        staffId: null,
        action: `pin.verify.failed`,
        entityType: 'action',
        entityId: resourceId || action,
        details: { attemptedAction: action },
        ipAddress,
      });

      throw new UnauthorizedException(
        `Invalid PIN. ${remainingAttempts} attempts remaining.`,
      );
    }

    // Clear failed attempts on successful authentication
    this.pinAuthManager.clearAttempts(lockKey);

    // Check if staff has permission for this action
    if (!this.hasPermissionForAction(authenticatedStaff.accessLevel, action)) {
      // Log unauthorized action attempt
      await this.createAuditLog({
        merchantId,
        staffId: authenticatedStaff.id,
        action: `action.unauthorized`,
        entityType: 'action',
        entityId: resourceId || action,
        details: { 
          attemptedAction: action,
          staffAccessLevel: authenticatedStaff.accessLevel,
          staffName: formatName(authenticatedStaff.firstName, authenticatedStaff.lastName)
        },
        ipAddress,
      });

      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    // Log successful PIN verification and action
    await this.createAuditLog({
      merchantId,
      staffId: authenticatedStaff.id,
      action: `action.${action}`,
      entityType: 'action',
      entityId: resourceId || action,
      details: { 
        verifiedAction: action,
        staffName: `${authenticatedStaff.firstName} ${authenticatedStaff.lastName}`,
        staffAccessLevel: authenticatedStaff.accessLevel
      },
      ipAddress,
    });

    return {
      success: true,
      staff: {
        id: authenticatedStaff.id,
        firstName: authenticatedStaff.firstName,
        lastName: authenticatedStaff.lastName,
        accessLevel: authenticatedStaff.accessLevel,
        role: this.getRoleByAccessLevel(authenticatedStaff.accessLevel),
      },
    };
  }

  private hasPermissionForAction(accessLevel: number, action: string): boolean {
    // Define which actions require which access levels
    const actionPermissions: Record<string, number> = {
      // Level 1 (Staff) actions
      'view_customer_details': 1,
      'process_payment': 1,
      'create_booking': 1,
      
      // Level 2 (Manager) actions
      'refund_payment': 2,
      'cancel_booking': 2,
      'view_reports': 2,
      'edit_staff': 2,
      'view_sensitive_customer_data': 2,
      
      // Level 3 (Owner) actions
      'delete_customer': 3,
      'export_all_data': 3,
      'modify_settings': 3,
      'view_financial_reports': 3,
    };

    const requiredLevel = actionPermissions[action] || 3; // Default to owner if not defined
    return accessLevel >= requiredLevel;
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

  private async createAuditLog(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const { staffId, ...logData } = data;
    await this.prisma.auditLog.create({
      data: {
        ...logData,
        details: logData.details as any,
        ...(staffId && { staffId }),
      },
    });
  }
}