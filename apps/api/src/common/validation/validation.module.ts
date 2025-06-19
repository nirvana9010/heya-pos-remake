import { Module, Global } from '@nestjs/common';
import { BusinessValidationService } from './business-validation.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BusinessValidationService],
  exports: [BusinessValidationService],
})
export class ValidationModule {}