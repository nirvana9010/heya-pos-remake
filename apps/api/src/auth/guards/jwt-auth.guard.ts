import { Injectable, ExecutionContext, Logger } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { SessionService } from "../session.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthSession } from "../../types";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private sessionService: SessionService,
    private reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.access_token ||
      request.headers.authorization?.replace("Bearer ", "");

    if (token) {
      let session = await this.sessionService.getSession(token);

      if (!session) {
        // JWT is valid (Passport verified it) but session was lost
        // (e.g. in-memory store wiped by deploy). Reconstruct it.
        session = this.rebuildSession(request.user, token);
        if (session) {
          await this.sessionService.createSession(token, session);
          this.logger.warn(
            `Rebuilt missing session for user ${session.user.id} (deploy recovery)`,
          );
        } else {
          return false;
        }
      }

      // Extend session activity (keeping session alive during use)
      await this.sessionService.extendSession(token);

      // Attach session to request
      request.session = session;
    }

    return true;
  }

  /**
   * Reconstruct an AuthSession from the validated JWT user payload.
   * This handles the case where in-memory sessions are lost after a deploy.
   */
  private rebuildSession(
    user: any,
    token: string,
  ): AuthSession | null {
    if (!user || !user.id || !user.merchantId) {
      return null;
    }

    return {
      user: {
        id: user.id,
        merchantId: user.merchantId,
        staffId: user.staffId,
        merchantUserId: user.merchantUserId,
        email: user.merchant?.email || user.merchantUser?.email || "",
        firstName:
          user.merchant?.businessName ||
          user.merchantUser?.firstName ||
          user.staff?.firstName ||
          "",
        lastName: user.merchantUser?.lastName || user.staff?.lastName || "",
        role:
          user.role?.name ||
          (user.type === "merchant" ? "owner" : user.type || "unknown"),
        permissions: user.permissions || (user.type === "merchant" ? ["*"] : []),
        locationId: user.locationId,
        locations:
          user.locationIds ||
          user.merchant?.locations?.map((l: any) => l.id) ||
          [],
        type: user.type,
      },
      merchantId: user.merchantId,
      locationId: user.locationId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      merchant: user.merchant,
    };
  }
}
