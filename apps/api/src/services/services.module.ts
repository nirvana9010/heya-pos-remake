import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceCategoriesController } from './service-categories.controller';
import { CsvParserService } from './csv-parser.service';
import { AuthModule } from '../auth/auth.module';
import { MerchantModule } from '../merchant/merchant.module';

@Module({
  imports: [AuthModule, MerchantModule],
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesService, CsvParserService],
  exports: [ServicesService],
})
export class ServicesModule {}