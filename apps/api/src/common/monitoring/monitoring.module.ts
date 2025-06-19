import { Module, Global } from '@nestjs/common';
import { QueryMonitorService } from './query-monitor.service';

@Global()
@Module({
  providers: [QueryMonitorService],
  exports: [QueryMonitorService],
})
export class MonitoringModule {}