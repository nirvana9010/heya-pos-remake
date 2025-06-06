import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { MemoryMonitorService } from './memory-monitor.service';

@Module({
  controllers: [DebugController],
  providers: [MemoryMonitorService],
})
export class DebugModule {}