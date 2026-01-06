import { Module } from "@nestjs/common";
import { MerchantHolidaysController } from "./merchant-holidays.controller";
import { MerchantHolidaysService } from "./merchant-holidays.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MerchantHolidaysController],
  providers: [MerchantHolidaysService],
  exports: [MerchantHolidaysService],
})
export class MerchantHolidaysModule {}
