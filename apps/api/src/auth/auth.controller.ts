import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  UnauthorizedException,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PinAuthService } from './pin-auth.service';
import { SessionService } from './session.service';
import { MerchantLoginDto } from './dto/merchant-login.dto';
import { PinAuthDto } from './dto/pin-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePinDto } from './dto/change-pin.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthSession, PinAuthResponse } from '@heya-pos/types';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private pinAuthService: PinAuthService,
    private sessionService: SessionService,
  ) {}

  @Post('merchant/login')
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

  @Post('staff/pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async staffPinAuth(
    @Body() dto: PinAuthDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ): Promise<{ pinAuth: PinAuthResponse; session: AuthSession }> {
    // Only merchant users can authenticate staff
    if (user.type !== 'merchant') {
      throw new UnauthorizedException('Only merchant accounts can authenticate staff');
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    
    // Authenticate PIN
    const pinAuth = await this.pinAuthService.authenticatePin(
      dto,
      user.merchantId,
      ipAddress,
    );

    // Create staff session
    const session = await this.pinAuthService.createStaffSession(
      pinAuth.staffId,
      user.merchantId,
      dto.locationId,
    );

    // Store session
    this.sessionService.createSession(session.token, session);

    return { pinAuth, session };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthSession> {
    const session = await this.authService.refreshToken(dto.refreshToken);
    
    // Store new session
    this.sessionService.createSession(session.token, session);
    
    return session;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers('authorization') authHeader: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ): Promise<void> {
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      this.sessionService.removeSession(token);
    }

    // Log the logout
    if (user.staffId) {
      const ipAddress = req.ip || req.connection?.remoteAddress;
      await this.pinAuthService['createAuditLog']({
        merchantId: user.merchantId,
        staffId: user.staffId,
        action: 'staff.logout',
        entityType: 'staff',
        entityId: user.staffId,
        details: { logoutAt: new Date().toISOString() },
        ipAddress,
      });
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any): Promise<any> {
    if (user.type === 'merchant') {
      return {
        type: 'merchant',
        merchant: user.merchant,
        permissions: ['*'],
      };
    } else if (user.type === 'staff') {
      return {
        type: 'staff',
        staff: user.staff,
        locationId: user.locationId,
        permissions: this.getStaffPermissions(user.staff.accessLevel),
      };
    }

    throw new UnauthorizedException('Invalid user type');
  }

  @Post('merchant/change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changeMerchantPassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: any,
  ): Promise<{ success: boolean }> {
    if (user.type !== 'merchant') {
      throw new UnauthorizedException('Only merchant accounts can change password');
    }

    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('staff/change-pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changeStaffPin(
    @Body() dto: ChangePinDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    if (user.type !== 'staff' || !user.staffId) {
      throw new UnauthorizedException('Only staff accounts can change PIN');
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    return this.pinAuthService.changePin(
      user.staffId,
      dto.currentPin,
      dto.newPin,
      ipAddress,
    );
  }

  @Post('staff/verify-pin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPin(
    @Body() dto: VerifyPinDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ): Promise<{ verified: boolean }> {
    if (user.type !== 'staff' || !user.staffId) {
      throw new UnauthorizedException('Only staff accounts can verify PIN');
    }

    const ipAddress = req.ip || req.connection?.remoteAddress;
    const verified = await this.pinAuthService.verifyPinForAction(
      user.staffId,
      dto.pin,
      dto.action,
      ipAddress,
    );

    return { verified };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  async getSession(
    @Headers('authorization') authHeader: string,
  ): Promise<AuthSession | null> {
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const session = this.sessionService.getSession(token);
    
    if (!session) {
      throw new UnauthorizedException('Session not found or expired');
    }

    return session;
  }

  private getStaffPermissions(accessLevel: number): string[] {
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