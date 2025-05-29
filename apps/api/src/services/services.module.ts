import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ServiceCategoriesController } from './service-categories.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}