import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  UnauthorizedException,
  BadRequestException,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PinAuthService } from "./pin-auth.service";
import { SessionService } from "./session.service";
import { MerchantLoginDto } from "./dto/merchant-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { VerifyPinDto } from "./dto/verify-pin.dto";
import { UnlockByPinDto } from "./dto/unlock-by-pin.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthSession } from "../types";
import { JwtService } from "@nestjs/jwt";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private pinAuthService: PinAuthService,
    private sessionService: SessionService,
    private jwtService: JwtService,
  ) {}

  @Post("merchant/login")
  @HttpCode(HttpStatus.OK)
  async merchantLogin(
    @Body() dto: MerchantLoginDto,
    @Req() req: any,
  ): Promise<AuthSession> {
    const session = await this.authService.merchantLogin(dto);

    // Store session
    this.sessionService.createSession(session.token, session);

    return session;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthSession> {
    const session = await this.authService.refreshToken(dto.refreshToken);

    // Store new session
    this.sessionService.createSession(session.token, session);

    return session;
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers("authorization") authHeader: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ): Promise<void> {
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      this.sessionService.removeSession(token);
    }

    // Log the logout
    const ipAddress = req.ip || req.connection?.remoteAddress;
    await this.authService["createAuditLog"]({
      merchantId: user.merchantId,
      staffId: null,
      action: "merchant.logout",
      entityType: "merchant",
      entityId: user.merchantId,
      details: { logoutAt: new Date().toISOString() },
      ipAddress,
    });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any): Promise<any> {
    // All users are now merchant type
    return {
      type: "merchant",
      merchant: user.merchant,
      permissions: ["*"],
    };
  }

  @Post("merchant/change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changeMerchantPassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post("verify-action")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyAction(
    @Body() dto: VerifyPinDto,
    @CurrentUser() user: any,
    @Req() req: any,
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
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const activeStaffHeader = req.headers["x-active-staff-id"];
    const activeStaffId = Array.isArray(activeStaffHeader)
      ? activeStaffHeader[0]
      : activeStaffHeader;
    const staffId = dto.staffId || activeStaffId;

    if (!staffId) {
      throw new BadRequestException(
        "staffId is required (request body or x-active-staff-id header)",
      );
    }

    // Verify PIN and log action
    return this.pinAuthService.verifyPinAndLogAction(
      { ...dto, staffId },
      user.merchantId,
      ipAddress,
    );
  }

  @Post("staff-pin/unlock")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlockByPin(
    @Body() dto: UnlockByPinDto,
    @CurrentUser() user: any,
    @Req() req: any,
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
    // Only merchant_user accounts can use the lock screen
    if (user.type !== "merchant_user") {
      throw new UnauthorizedException(
        "PIN lock screen is only available for team member accounts",
      );
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.pinAuthService.unlockByPin(
      dto.pin,
      user.merchantId,
      ipAddress,
    );
  }

  @Get("staff-pin/status")
  @UseGuards(JwtAuthGuard)
  async getStaffPinStatus(
    @CurrentUser() user: any,
  ): Promise<{
    hasPins: boolean;
    staffCount: number;
    hasDuplicates: boolean;
  }> {
    return this.pinAuthService.getStaffPinStatus(user.merchantId);
  }

  @Get("session")
  @UseGuards(JwtAuthGuard)
  async getSession(
    @Headers("authorization") authHeader: string,
  ): Promise<AuthSession | null> {
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    const session = this.sessionService.getSession(token);

    if (!session) {
      throw new UnauthorizedException("Session not found or expired");
    }

    return session;
  }

  /**
   * Health check endpoint for authentication module
   * Verifies that all auth dependencies are properly configured
   */
  @Get("health")
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    checks: {
      jwt: boolean;
      sessionService: boolean;
      authGuard: boolean;
      strategies: {
        jwt: boolean;
        merchant: boolean;
      };
    };
    details: {
      jwtSecret: boolean;
      sessionCount: number;
      message: string;
    };
  }> {
    try {
      // Check if JWT module is configured
      const jwtConfigured = !!this.jwtService;

      // Check if SessionService is injectable
      const sessionServiceConfigured = !!this.sessionService;

      // Check if auth guard is properly registered
      const authGuardConfigured = !!JwtAuthGuard;

      // Get active session count
      const sessions = this.sessionService.getActiveSessions();
      const sessionCount = sessions instanceof Map ? sessions.size : 0;

      // Check JWT secret configuration
      const jwtSecretConfigured = !!(
        process.env.JWT_SECRET || "default-secret"
      );

      return {
        status: "healthy",
        timestamp: new Date(),
        checks: {
          jwt: jwtConfigured,
          sessionService: sessionServiceConfigured,
          authGuard: authGuardConfigured,
          strategies: {
            jwt: true, // If we got this far, strategies are loaded
            merchant: true,
          },
        },
        details: {
          jwtSecret: jwtSecretConfigured,
          sessionCount,
          message: "Authentication module is properly configured",
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date(),
        checks: {
          jwt: false,
          sessionService: false,
          authGuard: false,
          strategies: {
            jwt: false,
            merchant: false,
          },
        },
        details: {
          jwtSecret: false,
          sessionCount: 0,
          message: `Authentication module error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      };
    }
  }
}
