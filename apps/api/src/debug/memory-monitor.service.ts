import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as process from 'process';

@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private intervalId: NodeJS.Timeout;
  private readonly intervalMs = 30000; // 30 seconds
  private lastHeapUsed = 0;
  private peakHeapUsed = 0;
  private startTime = Date.now();

  onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('Starting memory monitoring (every 30 seconds)');
      this.logMemoryUsage();
      this.intervalId = setInterval(() => this.logMemoryUsage(), this.intervalMs);
    }
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Stopped memory monitoring');
    }
  }

  private logMemoryUsage() {
    const memUsage = process.memoryUsage();
    const uptimeMinutes = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
    
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    const arrayBuffersMB = memUsage.arrayBuffers / 1024 / 1024;
    
    const heapGrowth = this.lastHeapUsed > 0 ? heapUsedMB - this.lastHeapUsed : 0;
    this.lastHeapUsed = heapUsedMB;
    
    if (heapUsedMB > this.peakHeapUsed) {
      this.peakHeapUsed = heapUsedMB;
    }

    const memoryInfo = {
      uptime: `${uptimeMinutes} min`,
      heap: {
        used: `${heapUsedMB.toFixed(2)} MB`,
        total: `${heapTotalMB.toFixed(2)} MB`,
        percent: `${((heapUsedMB / heapTotalMB) * 100).toFixed(1)}%`,
        growth: heapGrowth > 0 ? `+${heapGrowth.toFixed(2)} MB` : `${heapGrowth.toFixed(2)} MB`,
        peak: `${this.peakHeapUsed.toFixed(2)} MB`,
      },
      rss: `${rssMB.toFixed(2)} MB`,
      external: `${externalMB.toFixed(2)} MB`,
      arrayBuffers: `${arrayBuffersMB.toFixed(2)} MB`,
    };

    const logLevel = heapUsedMB > 1500 ? 'warn' : 'log';
    const warningMsg = heapUsedMB > 1500 ? ' ⚠️ HIGH MEMORY USAGE' : '';
    
    this.logger[logLevel](`Memory Usage${warningMsg}:`, JSON.stringify(memoryInfo));

    if (heapGrowth > 50) {
      this.logger.warn(`⚠️ Significant heap growth detected: ${heapGrowth.toFixed(2)} MB in last 30 seconds`);
    }

    if (heapUsedMB > 1700) {
      this.logger.error(`🚨 CRITICAL: Heap usage approaching limit (${heapUsedMB.toFixed(2)} MB). Memory leak likely!`);
    }
  }
}