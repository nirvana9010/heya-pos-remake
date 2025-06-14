import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { CustomersModule } from './customers/customers.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { StaffModule } from './staff/staff.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { SessionService } from './auth/session.service';
import { PublicModule } from './public/public.module';
import { LocationsModule } from './locations/locations.module';
import { MerchantModule } from './merchant/merchant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule, 
    AuthModule, 
    ServicesModule, 
    CustomersModule, 
    BookingsModule, 
    PaymentsModule,
    StaffModule,
    LoyaltyModule,
    PublicModule,
    LocationsModule,
    MerchantModule
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