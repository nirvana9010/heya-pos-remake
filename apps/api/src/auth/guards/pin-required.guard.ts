import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PIN_REQUIRED_KEY } from "../decorators/pin-required.decorator";
import { PinAuthService } from "../pin-auth.service";

@Injectable()
export class PinRequiredGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private pinAuthService: PinAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<string>(PIN_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Merchant users don't need PIN verification
    if (user.type === "merchant") {
      return true;
    }

    // Staff users need PIN verification
    if (user.type === "staff" && user.staffId) {
      const pin = request.headers["x-staff-pin"] || request.body.staffPin;

      if (!pin) {
        throw new UnauthorizedException("PIN required for this action");
      }

      const ipAddress = request.ip || request.connection.remoteAddress;

      try {
        await this.pinAuthService.verifyPinAndLogAction(
          {
            staffId: user.staffId,
            pin,
            action,
            resourceId: request.params?.id || "unknown",
          },
          user.merchantId,
          ipAddress,
        );
        return true;
      } catch (error) {
        throw new UnauthorizedException("PIN verification failed");
      }
    }

    return false;
  }
}
