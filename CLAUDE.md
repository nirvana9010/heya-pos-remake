# Claude Code Configuration Guide

This file contains important configuration information for Claude Code to help maintain and troubleshoot this project effectively.

## Database Configuration

### Connection URLs - BEST PRACTICES

**IMPORTANT: Stay on the pooler!** Both runtime and migrations should use the pooled connection:

```
DATABASE_URL=postgresql://svc_role:pwd@project.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

### Critical Configuration Points

1. **Shrink Prisma's appetite** - Add to your `.env` file:
   ```
   PRISMA_CLIENT_ENGINE_TYPE=binary   # keeps pool at 1
   ```

2. **One and only one env source** - In `ecosystem.config.js`:
   ```javascript
   env_file: '.env',   // in ecosystem.config.js
   ```
   Remove duplicate DATABASE_URL lines from everywhere else.

3. **Clean restarts** - Always use:
   ```bash
   pm2 delete api && pm2 start ecosystem.config.js --only api
   ```
   This fully kills abandoned workers before spawning new ones.

### Important Notes

- **Always use the pooled connection for DATABASE_URL** for both runtime and migrations
- The `?pgbouncer=true&connection_limit=1` parameters are **required** for stable connections
- Include `sslmode=require` for security
- Do NOT add `NODE_TLS_REJECT_UNAUTHORIZED="0"` unless absolutely necessary - it bypasses SSL verification

### Common Issues and Solutions

1. **"Can't reach database server" error**
   - Check that DATABASE_URL uses port 6543 (not 5432)
   - Ensure `?pgbouncer=true` is included in the pooled connection URL
   - **IMPORTANT: Check if PM2 is loading environment variables correctly!** (see PM2 section below)

2. **SSL certificate errors**
   - Verify you're using the pooled connection (port 6543) with pgbouncer=true
   - The pooled connection handles SSL differently than direct connections

3. **Slow queries**
   - Check pm2 logs for slow query warnings
   - Consider adding indexes for frequently queried columns
   - Current known issue: OutboxEvent queries need optimization

4. **PM2 Not Loading Environment Variables**
   - **This is a common cause of database connection failures!**
   - PM2's `env_file` option doesn't always work reliably
   - The API may fail with "Can't reach database server" even when the database is accessible
   - **Solution**: We use a wrapper script `/scripts/start-api-with-env.sh` that explicitly loads the `.env` file before starting the API
   - If you see database connection errors, first verify the API works when run directly with `cd apps/api && npm run start:dev`
   - If it works directly but not with PM2, the environment variables aren't being loaded

## Known Issues to Avoid

### "crypto is not defined" Error in Production
**IMPORTANT**: Never use `require('crypto')` in Next.js webpack configuration or any client-side code. This will cause a "crypto is not defined" error in production builds. Instead, use a simple hash function for generating unique identifiers in webpack configs.

## Commands to Run

When making code changes, always run these commands before committing:

```bash
# Lint and type checking (run from project root)
npm run lint
npm run typecheck

# If commands are not found, ask the user for the correct commands
```

### Important: Commands to Avoid

**NEVER use heredoc syntax (cat > file << 'EOF') in Bash commands** - This can cause system crashes. Instead:
- Use the Write tool to create files
- Use echo commands with proper escaping for simple content
- Use multiple echo commands with >> for multi-line content

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
pm2 logs api --nostream --lines 20  # View recent API logs (use --nostream to avoid hanging)
pm2 restart api --update-env  # Restart with new env vars
```

**Important**: Always use `--nostream` flag when reading PM2 logs to get immediate output instead of waiting/tailing.

### PM2 Configuration

**IMPORTANT**: Use the `env_file` option in `ecosystem.config.js` and ensure it's the ONLY source of environment variables:

```javascript
{
  name: 'api',
  script: './scripts/start-api-with-env.sh',  // Wrapper script that loads .env
  env_file: '.env',  // This should be the ONLY env source
  watch: false,
  env: { 
    PORT: 3000,
    NODE_ENV: 'development'
  }
}
```

**Clean Restart Command**: To avoid connection pool issues with abandoned workers:
```bash
pm2 delete api && pm2 start ecosystem.config.js --only api
```

This is necessary because PM2's built-in `env_file` option doesn't reliably load `.env` files in all environments, hence the wrapper script approach.

## UI State Management Best Practices

### Optimistic Updates for Better UX

When dealing with operations where the outcome is predictable (like deletes, status toggles, etc.), update the local state immediately rather than waiting for API responses and cache invalidation.

**Example: Staff Deletion Fix**
```typescript
// ❌ Old approach - relies on cache invalidation
await apiClient.deleteStaff(id);
memoryCache.clear();
loadStaff(); // Refetch from API

// ✅ Better approach - immediate local state update
await apiClient.deleteStaff(id);
setStaff(prevStaff => prevStaff.filter(s => s.id !== id));
```

**Benefits:**
- Instant UI feedback (no loading states)
- Simpler code (no complex cache management)
- Better user experience (feels more responsive)
- Reduces unnecessary API calls

**When to use this pattern:**
- Delete operations
- Status toggles (active/inactive)
- Reordering items
- Any operation where you know the expected outcome

**When NOT to use:**
- Creating new items (need server-generated IDs)
- Complex updates that might fail validation
- Operations that affect multiple related entities

**General Pattern:**
```typescript
// 1. Optimistically update UI
setItems(current => /* update logic */);

// 2. Call API (can be async)
try {
  await apiClient.updateItem(id, data);
} catch (error) {
  // 3. Revert on failure
  setItems(previousState);
  toast.error("Failed to update");
}
```