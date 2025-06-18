import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { CustomersModule } from './customers/customers.module';
import { PaymentsModule } from './payments/payments.module';
import { StaffModule } from './staff/staff.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { SessionService } from './auth/session.service';
import { PublicModule } from './public/public.module';
import { LocationsModule } from './locations/locations.module';
import { MerchantModule } from './merchant/merchant.module';
import { AdminModule } from './admin/admin.module';

// Bounded Contexts
import { BookingsContextModule } from './contexts/bookings/bookings.context.module';
import { OutboxModule } from './contexts/shared/outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, 
    AuthModule, 
    ServicesModule, 
    CustomersModule, 
    OutboxModule, // Global outbox module for event publishing
    BookingsContextModule, // New bounded context v2 module
    PaymentsModule,
    StaffModule,
    LoyaltyModule,
    PublicModule,
    LocationsModule,
    MerchantModule,
    AdminModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private sessionService: SessionService) {}

  onModuleInit() {
    // Start session cleanup interval
    this.sessionService.startCleanupInterval();
  }
}