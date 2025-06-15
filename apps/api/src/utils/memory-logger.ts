export class MemoryLogger {
  private static instance: MemoryLogger;
  private startMemory: NodeJS.MemoryUsage;
  private lastLogTime: number = Date.now();
  private operationCounts: Map<string, number> = new Map();
  private readonly MAX_OPERATIONS = 1000; // Limit operation tracking
  private totalOperations = 0;

  private constructor() {
    this.startMemory = process.memoryUsage();
  }

  static getInstance(): MemoryLogger {
    if (!MemoryLogger.instance) {
      MemoryLogger.instance = new MemoryLogger();
    }
    return MemoryLogger.instance;
  }

  logMemory(context: string, details?: any): void {
    const now = Date.now();
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memory.rss / 1024 / 1024);
    const externalMB = Math.round(memory.external / 1024 / 1024);
    
    // Track operation counts with limit
    this.totalOperations++;
    const count = (this.operationCounts.get(context) || 0) + 1;
    this.operationCounts.set(context, count);

    // Prevent unbounded growth
    if (this.operationCounts.size > this.MAX_OPERATIONS) {
      // Keep only top 500 most frequent operations
      const sorted = Array.from(this.operationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, this.MAX_OPERATIONS / 2);
      
      this.operationCounts.clear();
      sorted.forEach(([op, cnt]) => this.operationCounts.set(op, cnt));
      
      console.log(`[MEMORY] Pruned operation counts. Kept ${sorted.length} most frequent operations.`);
    }

    // Log every 5 seconds or if heap usage is high
    const shouldLog = (now - this.lastLogTime) > 5000 || heapUsedMB > 500;

    if (shouldLog) {
      console.log(`[MEMORY] ${new Date().toISOString()} - ${context} (${count} calls)`);
      console.log(`  Heap: ${heapUsedMB}MB / ${heapTotalMB}MB | RSS: ${rssMB}MB | External: ${externalMB}MB`);
      
      if (details) {
        if (Array.isArray(details)) {
          console.log(`  Array size: ${details.length}`);
        } else if (typeof details === 'object' && details !== null) {
          const keys = Object.keys(details);
          console.log(`  Object keys: ${keys.length}`);
          if (details.count !== undefined) {
            console.log(`  Result count: ${details.count}`);
          }
        }
      }

      // Log top operations
      const topOps = Array.from(this.operationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log(`  Top operations (total: ${this.totalOperations} calls, tracking ${this.operationCounts.size} unique):`);
      topOps.forEach(([op, count]) => {
        console.log(`    ${op}: ${count} calls`);
      });

      this.lastLogTime = now;
    }

    // Force GC if available and heap is high
    if (global.gc && heapUsedMB > 1000) {
      console.log('[MEMORY] Forcing garbage collection...');
      global.gc();
    }
  }

  logQuery(operation: string, query: any, result: any): void {
    let resultCount = 0;
    let resultSize = 0;

    try {
      if (Array.isArray(result)) {
        resultCount = result.length;
        resultSize = JSON.stringify(result).length;
      } else if (result && typeof result === 'object') {
        resultCount = 1;
        // Safely stringify to avoid circular references or other issues
        resultSize = JSON.stringify(result).length;
      }
    } catch (error) {
      // If stringify fails, just estimate size
      resultSize = 0;
    }

    this.logMemory(`DB:${operation}`, {
      count: resultCount,
      size: Math.round(resultSize / 1024),
      query: query
    });

    // Warn about large results
    if (resultCount > 1000 || resultSize > 1024 * 1024) {
      console.warn(`[MEMORY WARNING] Large query result: ${operation} returned ${resultCount} items (${Math.round(resultSize / 1024)}KB)`);
    }
  }

  reset(): void {
    this.operationCounts.clear();
    this.startMemory = process.memoryUsage();
    this.lastLogTime = Date.now();
  }
}

export const memoryLogger = MemoryLogger.getInstance();