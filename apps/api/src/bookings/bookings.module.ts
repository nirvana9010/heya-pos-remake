import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsV1Controller } from './v1/bookings.v1.controller';
import { BookingsService } from './bookings.service';
import { BookingsGateway } from './bookings.gateway';
import { AvailabilityService } from './availability.service';
import { BookingRepository } from './booking.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { MerchantModule } from '../merchant/merchant.module';

@Module({
  imports: [PrismaModule, AuthModule, LoyaltyModule, MerchantModule],
  controllers: [
    BookingsController, // Keep original for backward compatibility
    BookingsV1Controller, // Explicit v1 controller
  ],
  providers: [BookingsService, BookingsGateway, AvailabilityService, BookingRepository],
  exports: [BookingsService, AvailabilityService, BookingRepository],
})
export class BookingsModule {}