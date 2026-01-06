import { Module } from "@nestjs/common";
import { PublicBookingController } from "./public-booking.controller";
import { PublicCheckInController } from "./public-checkin.controller";
import { AvailabilityController } from "./availability.controller";
import { BookingsContextModule } from "../contexts/bookings/bookings.context.module";
import { ServicesModule } from "../services/services.module";
import { StaffModule } from "../staff/staff.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { FeaturesModule } from "../features/features.module";
import { LoyaltyModule } from "../loyalty/loyalty.module";

@Module({
  imports: [
    PrismaModule,
    BookingsContextModule, // Use bounded context instead of legacy module
    ServicesModule,
    StaffModule,
    NotificationsModule, // Required for check-in notifications
    FeaturesModule, // Required for feature checks
    LoyaltyModule, // Required for loyalty processing
  ],
  controllers: [
    PublicBookingController,
    PublicCheckInController,
    AvailabilityController,
  ],
})
export class PublicModule {}
