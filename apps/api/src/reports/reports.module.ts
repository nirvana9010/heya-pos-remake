import { Module } from "@nestjs/common";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { QueryOptimizationService } from "./services/query-optimization.service";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonServicesModule } from "../common/services/common-services.module";

@Module({
  imports: [PrismaModule, CommonServicesModule],
  controllers: [ReportsController],
  providers: [ReportsService, QueryOptimizationService],
  exports: [ReportsService, QueryOptimizationService],
})
export class ReportsModule {}
