import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  UnauthorizedException,
  BadRequestException,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { CustomThrottlerGuard } from "../common/guards/custom-throttler.guard";
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

const isProd = process.env.NODE_ENV === "production";
const returnTokensInBody = process.env.RETURN_TOKENS_IN_BODY !== "false";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private pinAuthService: PinAuthService,
    private sessionService: SessionService,
    private jwtService: JwtService,
  ) {}

  @Post("merchant/login")
  @UseGuards(CustomThrottlerGuard)
  @Throttle({ default: { ttl: 300000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async merchantLogin(
    @Body() dto: MerchantLoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    const session = await this.authService.merchantLogin(dto);

    // Store session
    await this.sessionService.createSession(session.token, session);

    // Set httpOnly cookies
    res.cookie("access_token", session.token, {
      ...cookieOptions(),
      path: "/",
    });
    if (session.refreshToken) {
      res.cookie("refresh_token", session.refreshToken, {
        ...cookieOptions(),
        path: "/api",
      });
    }

    // Return tokens in body during rollout (controlled by env var)
    if (!returnTokensInBody) {
      const { token, refreshToken, ...sessionWithoutTokens } = session;
      return sessionWithoutTokens as AuthSession;
    }

    return session;
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    // Accept refresh token from body OR cookie
    const refreshTokenValue = dto.refreshToken || req.cookies?.refresh_token;

    if (!refreshTokenValue) {
      throw new BadRequestException("Refresh token is required");
    }

    const session = await this.authService.refreshToken(refreshTokenValue);

    // Store new session
    await this.sessionService.createSession(session.token, session);

    // Set httpOnly cookies
    res.cookie("access_token", session.token, {
      ...cookieOptions(),
      path: "/",
    });
    if (session.refreshToken) {
      res.cookie("refresh_token", session.refreshToken, {
        ...cookieOptions(),
        path: "/api",
      });
    }

    if (!returnTokensInBody) {
      const { token, refreshToken, ...sessionWithoutTokens } = session;
      return sessionWithoutTokens as AuthSession;
    }

    return session;
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers("authorization") authHeader: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token =
      req.cookies?.access_token || authHeader?.replace("Bearer ", "");

    if (token) {
      await this.sessionService.removeSession(token);
    }

    // Clear httpOnly cookies (path/secure/sameSite must match set options)
    res.clearCookie("access_token", { ...cookieOptions(), path: "/" });
    res.clearCookie("refresh_token", { ...cookieOptions(), path: "/api" });

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
    return {
      type: user.type || "merchant",
      merchant: user.merchant,
      permissions: user.type === "merchant" ? ["*"] : user.permissions || [],
      ...(user.type === "merchant_user" && {
        merchantUserId: user.merchantUserId,
        role: user.role,
        locationIds: user.locationIds,
      }),
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
    return this.pinAuthService.unlockByPin(dto.pin, user.merchantId, ipAddress);
  }

  @Get("staff-pin/status")
  @UseGuards(JwtAuthGuard)
  async getStaffPinStatus(@CurrentUser() user: any): Promise<{
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
    @Req() req: any,
  ): Promise<AuthSession | null> {
    const token =
      req.cookies?.access_token || authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    const session = await this.sessionService.getSession(token);

    if (!session) {
      throw new UnauthorizedException("Session not found or expired");
    }

    return session;
  }

  @Get("health")
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: "healthy",
      timestamp: new Date(),
    };
  }
}
