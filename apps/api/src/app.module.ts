import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { MerchantModule } from './merchant/merchant.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FeaturesModule } from './features/features.module';

// Common modules
import { CacheModule } from './common/cache/cache.module';
import { ValidationModule } from './common/validation/validation.module';
import { CommonServicesModule } from './common/services/common-services.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { SupabaseModule } from './supabase/supabase.module';
import { RedisModule } from './common/redis/redis.module';

// Bounded Contexts
import { BookingsContextModule } from './contexts/bookings/bookings.context.module';
import { OutboxModule } from './contexts/shared/outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      global: true,
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    RedisModule, // Global Redis caching module
    CacheModule, // Global cache module
    ValidationModule, // Global validation module
    CommonServicesModule, // Global common services
    MonitoringModule, // Global monitoring
    SupabaseModule, // Global Supabase module for realtime
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
    MerchantModule,
    FeaturesModule,
    AdminModule,
    ReportsModule,
    HealthModule,
    NotificationsModule,
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