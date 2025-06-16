import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';

// Infrastructure
import { PrismaBookingRepository } from './infrastructure/persistence/prisma-booking.repository';
import { BookingsV2Controller } from './infrastructure/controllers/bookings.v2.controller';

// Application
import { CreateBookingHandler } from './application/commands/create-booking.handler';
import { BookingCreationService } from './application/services/booking-creation.service';
import { BookingUpdateService } from './application/services/booking-update.service';
import { BookingAvailabilityService } from './application/services/booking-availability.service';
import { PublicBookingService } from './application/services/public-booking.service';

// Domain services would go here

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(), // For domain events
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
    
    // Command Handlers
    CreateBookingHandler,
    
    // Query Handlers would go here
    
    // Event Handlers would go here
  ],
  exports: [
    'IBookingRepository',
    CreateBookingHandler,
    BookingCreationService,
    BookingUpdateService,
    BookingAvailabilityService,
    PublicBookingService,
  ],
})
export class BookingsContextModule {}