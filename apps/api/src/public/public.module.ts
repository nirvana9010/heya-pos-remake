import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicCheckInController } from './public-checkin.controller';
import { AvailabilityController } from './availability.controller';
import { BookingsContextModule } from '../contexts/bookings/bookings.context.module';
import { ServicesModule } from '../services/services.module';
import { StaffModule } from '../staff/staff.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BookingsContextModule, // Use bounded context instead of legacy module
    ServicesModule,
    StaffModule,
  ],
  controllers: [PublicBookingController, PublicCheckInController, AvailabilityController],
})
export class PublicModule {}