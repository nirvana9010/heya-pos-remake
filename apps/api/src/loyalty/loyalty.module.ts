import { Module } from "@nestjs/common";
import { LoyaltyController } from "./loyalty.controller";
import { LoyaltyService } from "./loyalty.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { LoyaltyReminderService } from "./loyalty-reminder.service";

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyReminderService],
  exports: [LoyaltyService, LoyaltyReminderService],
})
export class LoyaltyModule {}
