import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutboxModule } from '../shared/outbox/outbox.module';
import { LoyaltyModule } from '../../loyalty/loyalty.module';
import { PaymentsModule } from '../../payments/payments.module';
import { CacheModule } from '../../common/cache/cache.module';
import { AuthModule } from '../../auth/auth.module';

// Infrastructure
import { PrismaBookingRepository } from './infrastructure/persistence/prisma-booking.repository';
import { BookingsV2Controller } from './infrastructure/controllers/bookings.v2.controller';

// Application
import { CreateBookingHandler } from './application/commands/create-booking.handler';
import { BookingCreationService } from './application/services/booking-creation.service';
import { BookingUpdateService } from './application/services/booking-update.service';
import { BookingAvailabilityService } from './application/services/booking-availability.service';
import { PublicBookingService } from './application/services/public-booking.service';
import { UnassignedCapacityService } from './application/services/unassigned-capacity.service';
import { QueryHandlers } from './application/queries/handlers';

// Domain services would go here

@Module({
  imports: [
    PrismaModule,
    CqrsModule,
    OutboxModule,
    LoyaltyModule, // For loyalty points accrual
    PaymentsModule, // For marking bookings as paid
    CacheModule, // For cache invalidation
    AuthModule,
  ],
  controllers: [
    BookingsV2Controller,
  ],
  providers: [
    
    // Repository
    {
      provide: 'IBookingRepository',
      useClass: PrismaBookingRepository,
    },
    
    // Application Services
    BookingCreationService,
    BookingUpdateService,
    BookingAvailabilityService,
    PublicBookingService,
    UnassignedCapacityService,
    
    // Command Handlers
    CreateBookingHandler,
    
    // Query Handlers
    ...QueryHandlers,
    
    // Event Handlers would go here
  ],
  exports: [
    'IBookingRepository',
    CreateBookingHandler,
    BookingCreationService,
    BookingUpdateService,
    BookingAvailabilityService,
    PublicBookingService,
    UnassignedCapacityService,
  ],
})
export class BookingsContextModule {}
