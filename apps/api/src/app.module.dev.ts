import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { CustomersModule } from './customers/customers.module';
import { BookingsContextModule } from './contexts/bookings/bookings.context.module';
import { PaymentsModule } from './payments/payments.module';
import { StaffModule } from './staff/staff.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { SessionService } from './auth/session.service';
import { PublicModule } from './public/public.module';
import { DebugModule } from './debug/debug.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, 
    AuthModule, 
    ServicesModule, 
    CustomersModule, 
    BookingsContextModule, 
    PaymentsModule,
    StaffModule,
    LoyaltyModule,
    PublicModule,
    DebugModule // Include debug module in development
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModuleDev implements OnModuleInit {
  constructor(private sessionService: SessionService) {}

  onModuleInit() {
    // Start session cleanup interval
    this.sessionService.startCleanupInterval();
  }
}