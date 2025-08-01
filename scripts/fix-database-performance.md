# Database Performance Fix Guide

## Problem
All database queries are taking 700ms+ baseline, causing 10+ second delays for operations with multiple queries.

## Immediate Fixes

### 1. Update DATABASE_URL Connection Parameters
Add these parameters to your Railway DATABASE_URL environment variable:

```
postgresql://postgres.hpvnmqvdgkfeykekosrh:WV3R4JZIF2Htu92k@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=30&statement_cache_size=0
```

Key parameters:
- `connection_limit=10` - Increase from default
- `pool_timeout=30` - Increase timeout
- `statement_cache_size=0` - Disable statement caching (can cause issues with poolers)

### 2. Add Prisma Environment Variables
In Railway, add these environment variables:

```
PRISMA_CLIENT_ENGINE_TYPE=binary
DATABASE_CONNECTION_LIMIT=10
```

### 3. Optimize OutboxEvent Polling
The OutboxEvent.findMany is running every 5 seconds and taking 700ms+. This is consuming connections.

Add index:
```sql
CREATE INDEX IF NOT EXISTS "OutboxEvent_processedAt_retryCount_idx" 
ON "OutboxEvent"("processedAt", "retryCount") 
WHERE "processedAt" IS NULL;
```

### 4. Consider Prisma Connection Pool Settings
In your Prisma client initialization, ensure:

```typescript
new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
})
```

## Long-term Solutions

### 1. Move to Edge Runtime
Consider deploying to Vercel Edge or Cloudflare Workers in the same region as your database.

### 2. Implement Connection Pooling Service
Use PgBouncer or a connection pooling service between your app and database.

### 3. Implement Caching Layer
Add Redis caching for frequently accessed data:
- MerchantAuth (rarely changes)
- MerchantNotification counts
- Static merchant data

### 4. Database Read Replicas
For read-heavy operations, use Supabase read replicas in the same region as Railway.

## Monitoring

After applying fixes, monitor:
1. Average query time should drop from 700ms to <100ms
2. Payment operations should complete in <2 seconds
3. Connection pool usage should stay below 80%

## Emergency Workaround

If connection issues persist, implement a retry mechanism:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.code === 'P2024') { // Connection pool timeout
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```