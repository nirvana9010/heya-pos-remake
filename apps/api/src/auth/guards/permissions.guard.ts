import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Merchant users have all permissions
    if (user.type === 'merchant') {
      return true;
    }

    // Staff users need specific permissions
    if (user.type === 'staff' && user.staff) {
      const staffPermissions = this.getStaffPermissions(user.staff.accessLevel);
      
      // Check if user has wildcard permission
      if (staffPermissions.includes('*')) {
        return true;
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(permission =>
        staffPermissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        );
      }

      return true;
    }

    throw new ForbiddenException('Invalid user type');
  }

  private getStaffPermissions(accessLevel: number): string[] {
    // These should match the permissions in PinAuthService
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

    const ownerPermissions = ['*'];

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
}