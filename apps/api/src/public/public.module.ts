import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { AvailabilityController } from './availability.controller';
import { BookingsModule } from '../bookings/bookings.module';
import { ServicesModule } from '../services/services.module';
import { StaffModule } from '../staff/staff.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BookingsModule,
    ServicesModule,
    StaffModule,
  ],
  controllers: [PublicBookingController, AvailabilityController],
})
export class PublicModule {}