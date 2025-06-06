import * as heapdump from 'heapdump';
import * as fs from 'fs';
import * as path from 'path';

export class HeapProfiler {
  private snapshotCount = 0;
  private snapshotDir = path.join(process.cwd(), 'heap-snapshots');
  private startTime = Date.now();
  private intervalId: NodeJS.Timeout;

  constructor() {
    // Create snapshot directory
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }

    console.log('[HEAP PROFILER] Starting heap profiling...');
    console.log(`[HEAP PROFILER] Snapshots will be saved to: ${this.snapshotDir}`);

    // Take initial snapshot
    this.takeSnapshot('startup');

    // Set up automatic snapshots every 2 minutes
    this.intervalId = setInterval(() => {
      const memory = process.memoryUsage();
      const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
      
      // Take snapshot if heap is growing or every 2 minutes
      if (heapUsedMB > 500) {
        this.takeSnapshot(`auto-${heapUsedMB}MB`);
      }
    }, 120000); // 2 minutes

    // Clean up on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  takeSnapshot(label: string): void {
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `heap-${timestamp}-${label}-${heapUsedMB}MB.heapsnapshot`;
    const filepath = path.join(this.snapshotDir, filename);

    console.log(`[HEAP PROFILER] Taking snapshot: ${filename}`);
    console.log(`[HEAP PROFILER] Current heap usage: ${heapUsedMB}MB`);

    heapdump.writeSnapshot(filepath, (err, filename) => {
      if (err) {
        console.error('[HEAP PROFILER] Error writing snapshot:', err);
      } else {
        console.log(`[HEAP PROFILER] Snapshot saved: ${filename}`);
        this.snapshotCount++;

        // Compare with previous snapshots
        if (this.snapshotCount > 1) {
          console.log('[HEAP PROFILER] To compare snapshots:');
          console.log('  1. Open Chrome DevTools');
          console.log('  2. Go to Memory tab');
          console.log('  3. Load the snapshots');
          console.log('  4. Use "Comparison" view to see what objects grew');
        }
      }
    });
  }

  cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.takeSnapshot('shutdown');
    console.log('[HEAP PROFILER] Heap profiling stopped');
    console.log(`[HEAP PROFILER] Total snapshots taken: ${this.snapshotCount}`);
  }
}

// Initialize profiler on require
if (require.main === module || process.env.HEAP_PROFILE === 'true') {
  new HeapProfiler();
}