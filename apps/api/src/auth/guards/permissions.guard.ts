import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

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
      throw new ForbiddenException("User not authenticated");
    }

    // Merchant owners have all permissions
    // Also treat undefined type as merchant (backward compat for old tokens)
    if (user.type === "merchant" || user.type === undefined) {
      return true;
    }

    // MerchantUser permissions are stored in user.permissions from JWT
    if (user.type === "merchant_user") {
      const userPermissions = user.permissions || [];

      // Check if user has wildcard permission
      if (userPermissions.includes("*")) {
        return true;
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some((permission) =>
        this.checkPermission(userPermissions, permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
        );
      }

      return true;
    }

    // Staff users need specific permissions based on access level
    if (user.type === "staff" && user.staff) {
      const staffPermissions = this.getStaffPermissions(user.staff.accessLevel);

      // Check if user has wildcard permission
      if (staffPermissions.includes("*")) {
        return true;
      }

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some((permission) =>
        this.checkPermission(staffPermissions, permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
        );
      }

      return true;
    }

    // Fail closed: unknown user type = no access
    throw new ForbiddenException("Invalid user type");
  }

  /**
   * Check if a permission matches the required permission.
   * Supports both exact matches and partial matches:
   * - "bookings.view" matches "bookings.view" (exact)
   * - "bookings.*" matches "bookings.view", "bookings.create", etc. (wildcard)
   * - "bookings" matches "bookings.view" (parent permission)
   */
  private checkPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    // Check for wildcard
    if (userPermissions.includes("*")) {
      return true;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check for wildcard matches (e.g., "bookings.*" matches "bookings.view")
    const [category, action] = requiredPermission.split(".");
    if (action && userPermissions.includes(`${category}.*`)) {
      return true;
    }

    // Check for parent permission (e.g., "bookings" grants "bookings.view")
    if (action && userPermissions.includes(category)) {
      return true;
    }

    return false;
  }

  private getStaffPermissions(accessLevel: number): string[] {
    // These should match the permissions in PinAuthService
    const basePermissions = [
      "booking.view",
      "booking.create",
      "booking.update",
      "bookings.view",
      "bookings.create",
      "bookings.update",
      "customer.view",
      "customer.create",
      "customers.view",
      "customers.create",
      "payment.view",
      "payment.process",
      "payments.view",
      "payments.process",
      "service.view",
      "services.view",
    ];

    const managerPermissions = [
      ...basePermissions,
      "booking.cancel",
      "bookings.cancel",
      "customer.update",
      "customers.update",
      "customers.delete",
      "customers.import",
      "customers.export",
      "staff.view",
      "report.view",
      "reports.view",
    ];

    const ownerPermissions = ["*"];

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
