import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MerchantStrategy } from './strategies/merchant.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PinAuthService } from './pin-auth.service';
import { SessionService } from './session.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * AuthModule Configuration
 * 
 * This module is marked as @Global to ensure all authentication-related services
 * are available throughout the application without explicit imports.
 * 
 * Module Dependency Flow:
 * 1. PrismaModule - Provides database access (already global)
 * 2. PassportModule - Provides authentication strategies
 * 3. JwtModule - Provides JWT token generation/validation
 * 
 * Exported Services:
 * - AuthService: Main authentication logic (login, token generation)
 * - PinAuthService: PIN-based authentication for staff
 * - SessionService: In-memory session management
 * - JwtModule: Re-exported for token operations in other modules
 * - JwtAuthGuard: Authentication guard for protecting routes
 * - PassportModule: Re-exported for strategy access
 * 
 * This approach (Option A) was chosen because:
 * - Minimal maintenance: All auth concerns in one global module
 * - No circular dependencies: Clear one-way dependency flow
 * - Easy to use: No need to import AuthModule in feature modules
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '365d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PinAuthService,
    SessionService,
    MerchantStrategy,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    // Export all services that might be needed by other modules
    AuthService, 
    PinAuthService, 
    SessionService, 
    JwtModule, 
    JwtAuthGuard,
    PassportModule, // Export PassportModule so guards work properly
  ],
})
export class AuthModule {}