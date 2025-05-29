import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MerchantStrategy } from './strategies/merchant.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PinAuthService } from './pin-auth.service';
import { SessionService } from './session.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PinAuthService,
    SessionService,
    MerchantStrategy,
    JwtStrategy,
  ],
  exports: [AuthService, PinAuthService, SessionService],
})
export class AuthModule {}