import { Module } from "@nestjs/common";
import { MerchantUsersService } from "./merchant-users.service";
import {
  MerchantUsersController,
  MerchantUsersInviteController,
} from "./merchant-users.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MerchantUsersController, MerchantUsersInviteController],
  providers: [MerchantUsersService],
  exports: [MerchantUsersService],
})
export class MerchantUsersModule {}
