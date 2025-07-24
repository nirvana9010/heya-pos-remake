import { Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import * as process from 'process';
// import * as heapdump from 'heapdump';
import * as path from 'path';
import * as fs from 'fs';

interface MemoryUsage {
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  external?: number;
  arrayBuffers?: number;
}

@Controller('debug')
export class DebugController {
  private memorySnapshots: MemoryUsage[] = [];
  private readonly maxSnapshots = 100;

  @Get('memory')
  @Public()
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usage: MemoryUsage = {
      timestamp: new Date(),
      memoryUsage: memUsage,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };

    this.memorySnapshots.push(usage);
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }

    return {
      current: {
        ...usage,
        memoryUsageMB: {
          rss: (memUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          external: (memUsage.external / 1024 / 1024).toFixed(2) + ' MB',
          arrayBuffers: (memUsage.arrayBuffers / 1024 / 1024).toFixed(2) + ' MB',
        },
        percentHeapUsed: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%',
      },
      history: {
        count: this.memorySnapshots.length,
        oldest: this.memorySnapshots[0]?.timestamp,
        latest: this.memorySnapshots[this.memorySnapshots.length - 1]?.timestamp,
      },
      trends: this.calculateMemoryTrends(),
    };
  }

  @Get('memory/history')
  @Public()
  getMemoryHistory() {
    return {
      snapshots: this.memorySnapshots.map((snapshot) => ({
        timestamp: snapshot.timestamp,
        heapUsedMB: (snapshot.memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (snapshot.memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        rssMB: (snapshot.memoryUsage.rss / 1024 / 1024).toFixed(2),
        uptimeSeconds: snapshot.uptime.toFixed(0),
      })),
    };
  }

  @Post('memory/heapdump')
  @Public()
  async createHeapDump() {
    return {
      error: 'Heapdump functionality is disabled in production builds',
      note: 'This feature requires the heapdump package which is not included in production'
    };
    // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // const filename = `heapdump-${timestamp}.heapsnapshot`;
    // const filepath = path.join(process.cwd(), filename);

    // return new Promise((resolve, reject) => {
    //   heapdump.writeSnapshot(filepath, (err, filename) => {
    //     if (err) {
    //       reject({ error: 'Failed to create heap dump', details: err.message });
    //     } else {
    //       const stats = fs.statSync(filepath);
    //       resolve({
    //         success: true,
    //         filename,
    //         path: filepath,
    //         sizeMB: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
    //         timestamp: new Date(),
    //         note: 'Heap dump created. Use Chrome DevTools to analyze.',
    //       });
    //     }
    //   });
    // });
  }

  @Get('memory/gc')
  @Public()
  forceGarbageCollection() {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();

      return {
        success: true,
        before: {
          heapUsedMB: (before.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (before.heapTotal / 1024 / 1024).toFixed(2),
        },
        after: {
          heapUsedMB: (after.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (after.heapTotal / 1024 / 1024).toFixed(2),
        },
        freed: {
          heapMB: ((before.heapUsed - after.heapUsed) / 1024 / 1024).toFixed(2),
        },
      };
    } else {
      return {
        success: false,
        error: 'Garbage collection not exposed. Run with --expose-gc flag.',
      };
    }
  }

  private calculateMemoryTrends() {
    if (this.memorySnapshots.length < 2) {
      return { status: 'insufficient_data' };
    }

    const recent = this.memorySnapshots.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    const heapGrowth = newest.memoryUsage.heapUsed - oldest.memoryUsage.heapUsed;
    const timeElapsed = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / 1000;
    const growthRate = heapGrowth / timeElapsed;

    return {
      samples: recent.length,
      timeSpanSeconds: timeElapsed.toFixed(0),
      heapGrowthMB: (heapGrowth / 1024 / 1024).toFixed(2),
      growthRateMBPerSecond: (growthRate / 1024 / 1024).toFixed(4),
      growthRateMBPerMinute: ((growthRate * 60) / 1024 / 1024).toFixed(2),
      trend: heapGrowth > 0 ? 'increasing' : 'stable',
      warning: growthRate > 1024 * 1024 ? 'HIGH_GROWTH_RATE' : null,
    };
  }
}