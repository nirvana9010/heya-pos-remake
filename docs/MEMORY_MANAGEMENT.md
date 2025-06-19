# Memory Management Guide - Heya POS

## Overview
This guide documents memory management best practices, monitoring tools, and troubleshooting procedures for the Heya POS application.

## Memory Monitoring Tools

### 1. Built-in Debug Endpoints

The API includes several endpoints for monitoring memory usage:

- **GET `/api/debug/memory`** - Current memory usage and trends
- **GET `/api/debug/memory/history`** - Historical memory snapshots
- **POST `/api/debug/memory/heapdump`** - Create a heap snapshot for analysis
- **GET `/api/debug/memory/gc`** - Force garbage collection (requires --expose-gc flag)

### 2. Automatic Memory Logging

When running in development mode, the API automatically logs memory usage every 30 seconds. Look for logs like:
```
[MemoryMonitorService] Memory Usage: {"uptime":"5.2 min","heap":{"used":"152.34 MB","total":"512.00 MB","percent":"29.8%","growth":"+2.15 MB","peak":"152.34 MB"}...}
```

Warning levels:
- **Normal**: < 1500 MB heap usage
- **Warning**: > 1500 MB heap usage (logged as WARN)
- **Critical**: > 1700 MB heap usage (logged as ERROR)

### 3. Memory Profiling Scripts

```bash
# Run with memory profiling using clinic.js
npm run memory:profile

# Create heap profile
npm run memory:heap

# Run with exposed garbage collection
npm run start:dev:gc

# Run with Node.js inspector for Chrome DevTools
npm run start:dev:inspect
```

## Common Memory Leak Patterns

### 1. Uncleaned Intervals/Timeouts
```typescript
// BAD - Memory leak
export class LeakyService {
  onModuleInit() {
    setInterval(() => this.doWork(), 1000);
  }
}

// GOOD - Proper cleanup
export class ProperService implements OnModuleDestroy {
  private intervalId: NodeJS.Timeout;
  
  onModuleInit() {
    this.intervalId = setInterval(() => this.doWork(), 1000);
  }
  
  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
```

### 2. Event Listener Accumulation
```typescript
// BAD - Listeners accumulate
socket.on('message', handler);

// GOOD - Remove listeners on cleanup
socket.on('message', handler);
// Later...
socket.off('message', handler);
```

### 3. Large Data Structures in Memory
```typescript
// BAD - Unbounded growth
private cache: Map<string, any> = new Map();

// GOOD - Bounded cache with cleanup
private cache: Map<string, any> = new Map();
private readonly MAX_CACHE_SIZE = 1000;

addToCache(key: string, value: any) {
  if (this.cache.size >= this.MAX_CACHE_SIZE) {
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }
  this.cache.set(key, value);
}
```

### 4. Circular References
```typescript
// BAD - Circular reference prevents GC
class Parent {
  child: Child;
  constructor() {
    this.child = new Child(this);
  }
}

class Child {
  constructor(public parent: Parent) {}
}

// GOOD - Break circular references
class Parent {
  child: Child;
  
  destroy() {
    this.child.parent = null;
    this.child = null;
  }
}
```

## Memory Leak Detection Process

### 1. Monitor Memory Growth
```bash
# Watch memory usage in real-time
curl http://localhost:3000/api/debug/memory

# Check historical data
curl http://localhost:3000/api/debug/memory/history
```

### 2. Create Heap Dumps
```bash
# Create initial heap dump
curl -X POST http://localhost:3000/api/debug/memory/heapdump

# Run application under load for 5-10 minutes

# Create second heap dump
curl -X POST http://localhost:3000/api/debug/memory/heapdump
```

### 3. Analyze Heap Dumps
1. Open Chrome DevTools
2. Go to Memory tab
3. Load the heap snapshots
4. Compare snapshots to find objects that grew
5. Look for:
   - Detached DOM nodes
   - Growing arrays/maps
   - Retained closures
   - Event listeners

### 4. Using Chrome DevTools Inspector
```bash
# Start with inspector
npm run start:dev:inspect

# Open Chrome and navigate to:
chrome://inspect

# Click "inspect" on the Node.js process
# Use Memory profiler to take heap snapshots
```

## Cleanup Patterns for Services

### Basic Service Cleanup Template
```typescript
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class MyService implements OnModuleDestroy {
  private readonly logger = new Logger(MyService.name);
  private intervals: NodeJS.Timeout[] = [];
  private subscriptions: any[] = [];

  onModuleDestroy() {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe?.());
    
    // Clear any caches or maps
    this.cache?.clear();
    
    // Close any connections
    this.connection?.close();
    
    this.logger.log('Service cleanup completed');
  }
}
```

### WebSocket Cleanup
```typescript
@WebSocketGateway()
export class MyGateway implements OnGatewayDisconnect {
  private clients = new Map<string, ClientInfo>();

  handleDisconnect(client: Socket) {
    // Clean up client data
    this.clients.delete(client.id);
    
    // Leave all rooms
    client.rooms.forEach(room => client.leave(room));
  }
}
```

## Performance Optimization Tips

### 1. Increase Node.js Memory Limit
Already configured in package.json scripts:
```json
"start:dev": "NODE_OPTIONS='--max-old-space-size=4096' nest start --watch"
```

### 2. Optimize NestJS Build
```json
// nest-cli.json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "preserveWatchOutput": true
  }
}
```

### 3. Disable Source Maps in Development
If memory is critical:
```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": false
  }
}
```

### 4. Use Lazy Loading for Large Modules
```typescript
// Instead of eager loading
@Module({
  imports: [HeavyModule]
})

// Use lazy loading
@Module({
  imports: [
    {
      module: HeavyModule,
      lazy: true
    }
  ]
})
```

## Troubleshooting Checklist

When encountering "JavaScript heap out of memory" errors:

1. **Check current memory usage**
   ```bash
   curl http://localhost:3000/api/debug/memory
   ```

2. **Look for memory growth patterns**
   - Is it gradual (leak) or sudden (spike)?
   - Which operations trigger growth?

3. **Review recent changes**
   - New intervals/timeouts?
   - New event listeners?
   - Large data processing?

4. **Check for common issues**
   - [ ] All intervals have cleanup
   - [ ] All event listeners are removed
   - [ ] No unbounded arrays/maps
   - [ ] WebSocket clients are cleaned up
   - [ ] Database connections are pooled

5. **Create heap dumps**
   - Before high memory usage
   - After high memory usage
   - Compare in Chrome DevTools

6. **Run with profiling**
   ```bash
   npm run memory:profile
   ```

## Emergency Response

If the application is running out of memory in production:

1. **Immediate mitigation**
   - Restart the application
   - Increase memory limit temporarily
   - Scale horizontally if possible

2. **Gather diagnostics**
   - Create heap dump before restart
   - Save application logs
   - Note what operations were running

3. **Fix root cause**
   - Analyze heap dumps
   - Review code for leak patterns
   - Implement proper cleanup
   - Test fix under load

## Best Practices Summary

1. **Always implement OnModuleDestroy** for services with resources
2. **Clear intervals and timeouts** in cleanup methods
3. **Limit cache sizes** to prevent unbounded growth
4. **Monitor memory usage** regularly in development
5. **Test under load** to catch leaks early
6. **Use memory profiling tools** when debugging
7. **Document resource cleanup** in service comments
8. **Review PRs for memory leak patterns**

## Quick Commands Reference

```bash
# Start with increased memory
npm run start:dev

# Start with memory profiling
npm run start:dev:inspect

# Check for circular dependencies
npx madge --circular --extensions ts src

# Monitor memory via API
watch -n 5 'curl -s http://localhost:3000/api/debug/memory | jq .current.memoryUsageMB'

# Force garbage collection (requires --expose-gc)
curl http://localhost:3000/api/debug/memory/gc

# Create heap dump
curl -X POST http://localhost:3000/api/debug/memory/heapdump
```