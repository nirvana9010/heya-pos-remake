import { Module, Global } from '@nestjs/common';
import { OutboxEventRepository } from './infrastructure/outbox-event.repository';
import { OutboxPublisherService } from './application/outbox-publisher.service';
import { OutboxMonitoringController } from './infrastructure/outbox-monitoring.controller';
import { PrismaModule } from '../../../prisma/prisma.module';

@Global() // Make it global so it can be used across all bounded contexts
@Module({
  imports: [PrismaModule],
  controllers: [OutboxMonitoringController],
  providers: [
    OutboxEventRepository,
    OutboxPublisherService,
  ],
  exports: [
    OutboxEventRepository,
  ],
})
export class OutboxModule {}