# Claude Code Configuration Guide

This file contains important configuration information for Claude Code to help maintain and troubleshoot this project effectively.

## Database Configuration

### Connection URLs

The project uses Supabase PostgreSQL with two connection types:

1. **Direct Connection (Port 5432)** - Used for migrations
   ```
   DIRECT_URL="postgresql://[user]:[password]@[host]:5432/postgres"
   ```

2. **Pooled Connection (Port 6543)** - Used for runtime queries
   ```
   DATABASE_URL="postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true"
   ```

### Important Notes

- **Always use the pooled connection for DATABASE_URL** to handle multiple concurrent connections efficiently
- The `?pgbouncer=true` parameter is **required** for the pooled connection
- Do NOT add `NODE_TLS_REJECT_UNAUTHORIZED="0"` unless absolutely necessary - it bypasses SSL verification
- If you see SSL certificate errors, ensure you're using the correct port and connection parameters

### Common Issues and Solutions

1. **"Can't reach database server" error**
   - Check that DATABASE_URL uses port 6543 (not 5432)
   - Ensure `?pgbouncer=true` is included in the pooled connection URL

2. **SSL certificate errors**
   - Verify you're using the pooled connection (port 6543) with pgbouncer=true
   - The pooled connection handles SSL differently than direct connections

3. **Slow queries**
   - Check pm2 logs for slow query warnings
   - Consider adding indexes for frequently queried columns
   - Current known issue: OutboxEvent queries need optimization

## Commands to Run

When making code changes, always run these commands before committing:

```bash
# Lint and type checking (run from project root)
npm run lint
npm run typecheck

# If commands are not found, ask the user for the correct commands
```

## Project Structure

- `/apps/api` - NestJS backend API (connects to database)
- `/apps/merchant-app` - Next.js merchant dashboard
- `/apps/booking-app` - Next.js customer booking interface
- `/apps/admin-dashboard` - Next.js admin interface

Only the API service connects to the database. Frontend apps communicate through the API.

## Performance Considerations

### Known Slow Queries

1. **OutboxEvent.findMany** - Queries filtering on `processedAt IS NULL AND retryCount < X`
   - Consider adding composite index: `@@index([processedAt, retryCount])`
   - Monitor with: `pm2 logs api | grep "Slow/Heavy query"`

## Environment Files

- `.env` - Main environment file (not tracked in git)
- `.env.example` - Template for environment variables
- `.env.postgresql` - PostgreSQL-specific configuration reference
- `.env.development` - Development-specific overrides

## Monitoring

Use PM2 for process management and monitoring:
```bash
pm2 status          # Check all processes
pm2 logs api        # View API logs
pm2 restart api --update-env  # Restart with new env vars
```