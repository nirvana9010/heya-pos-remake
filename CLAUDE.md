# Claude Code Configuration Guide

This file contains important configuration information for Claude Code to help maintain and troubleshoot this project effectively.

## CRITICAL RULES - DO NOT VIOLATE

1. **NEVER DELETE SCRIPTS** - Do not delete any scripts in the `/scripts` directory without explicit user permission
2. **NEVER DELETE CONFIGURATION FILES** - Do not delete `.env`, `ecosystem.config.js`, or any config files without explicit permission
3. **ASK BEFORE REMOVING** - Always ask for confirmation before deleting any existing files

## Working Directory Context

**IMPORTANT**: The current working directory shown in the environment is often `/home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/api` but the PROJECT ROOT is `/home/nirvana9010/projects/heya-pos-remake/heya-pos`. 

When referencing files:
- Scripts are at: `/home/nirvana9010/projects/heya-pos-remake/heya-pos/scripts/`
- NOT at: `./scripts/` (this would look in apps/api/scripts/)
- Always use absolute paths or navigate to the correct directory first

## API Endpoints Quick Reference

### Base URL and Versioning
- **Base URL**: `http://localhost:3000/api`
- **Default version**: v1 (implicit)
- **Format**: `/api/v{version}/{endpoint}` or `/api/{endpoint}` for v1

### Authentication Endpoints (ALL use v1)
- **Login**: `POST /api/v1/auth/merchant/login`
  - Body: `{"email": "user@example.com", "password": "password"}`
  - **IMPORTANT**: Users log in with their merchant EMAIL address, NOT the username stored in MerchantAuth table
  - The auth system accepts EITHER email OR username, but users typically use email
  - Example: Zen Wellness logs in with `lukas.tn90@gmail.com`, not "ZENWELLNESS"
- **Refresh**: `POST /api/v1/auth/refresh`
- **Logout**: `POST /api/v1/auth/logout`
- **Current User**: `GET /api/v1/auth/me`

### Common Test Account Credentials
**ALWAYS provide the EMAIL for login, not the username!**
- Hamilton Beauty Spa: `admin@hamiltonbeauty.com` / `demo123`
- Zen Wellness: `lukas.tn90@gmail.com` / `demo456`

### Authentication Response Format
**CRITICAL**: The login response returns `token`, NOT `accessToken`!
```javascript
// ❌ WRONG - This will fail every time
const { accessToken } = loginResponse.data;

// ✅ CORRECT - The response field is called 'token'
const { token } = loginResponse.data;
```
The login response structure:
```json
{
  "user": {...},
  "merchantId": "...",
  "token": "eyJhbGci...",  // <-- It's 'token', NOT 'accessToken'!
  "refreshToken": "...",
  "expiresAt": "...",
  "merchant": {...}
}
```

### Common V1 Endpoints (default)
- Services: `/api/v1/services`
- Staff: `/api/v1/staff`
- Customers: `/api/v1/customers`
- Payments: `/api/v1/payments`
- Orders: `/api/v1/orders`

### V2 Endpoints (must specify version)
- Bookings: `/api/v2/bookings` (uses CQRS pattern)

### Public Endpoints (no version)
- `/api/public/services`
- `/api/public/availability`

## Important Lessons Learned

### Always Verify Before Assuming
**Issue**: When encountering "Supabase not configured" errors, assumed environment variables were missing without checking first.

**Lesson**: ALWAYS check actual system state before making assumptions:
- If error says "not configured", first verify: `grep SUPABASE .env`
- Look at the actual error line and trace the data flow
- Don't add "missing configuration" fallbacks without confirming configuration is actually missing

**What happened**: The real issue was `apiClient.post()` returns data directly, not `{data: ...}`, causing `response.data` to be undefined. The env vars were present all along.

## React Development Best Practices

### Infinite Loop Prevention
1. **Always check useEffect dependencies** - Unstable references (arrays, objects, functions) in dependency arrays cause infinite loops
2. **Default parameters create new references** - Never use `= []` or `= {}` in component parameters
3. **Compare working vs broken components** - When debugging, always check how similar working components handle the same pattern
4. **Use stable references** - Memoize arrays/objects with useMemo, callbacks with useCallback

### Debugging React Issues
- Add console.logs in useEffects to track what's firing
- Check the dependency arrays first when seeing "Maximum update depth exceeded"
- Look for components creating new objects/arrays on every render
- Verify all props are being passed correctly - missing props can cause default values to trigger bugs

### State Management
- Use functional setState `setState(prev => ...)` to avoid dependencies in callbacks
- Prefer disabled state over conditional rendering for form inputs
- Always validate that state updates are actually needed before setting

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
# Lint checking (run from project root)
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format

# Note: The API app was missing ESLint config. A basic .eslintrc.js has been added.
# Frontend apps (merchant-app, booking-app) have ESLint configured.
```

### Important: Commands to Avoid

**NEVER use heredoc syntax (cat > file << 'EOF') in Bash commands** - This can cause system crashes. Instead:
- Use the Write tool to create files
- Use echo commands with proper escaping for simple content
- Use multiple echo commands with >> for multi-line content

## Git Commit and Push Policy

### Automatic Commits
- **You ARE allowed to automatically commit changes after significant work is completed**
- Use descriptive commit messages that clearly explain what was changed and why
- Always include the Claude Code footer in commit messages

### Push Restrictions
- **NEVER automatically push commits to remote repositories**
- Always wait for explicit user permission before pushing
- If push fails due to authentication, help the user set up proper authentication (SSH keys recommended)

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

## Real-time Notifications

The application uses **Supabase Realtime** as the default notification system. 

### Configuration
1. **Add environment variables** to `/apps/api/.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
```

Get these values from: https://app.supabase.com/project/hpvnmqvdgkfeykekosrh/settings/api

2. **Enable Realtime on the MerchantNotification table**:
   - Go to Supabase Dashboard > Table Editor
   - Click on `MerchantNotification` table
   - Enable "Realtime" 
   - OR run the SQL migration in `/apps/api/prisma/migrations/setup_supabase_realtime.sql`

**IMPORTANT**: Without step 2, Supabase will connect but won't receive any events!

### Behavior
- **Default**: Supabase Realtime is the only real-time notification system
- **Polling Fallback**: If Supabase is not configured, falls back to 60-second polling
- **SSE Removed**: Server-Sent Events (SSE) has been removed due to inconsistent delivery issues (July 2025)
- **Configuration**: To use real-time notifications, configure Supabase as described above

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

## Process Management & Clean Restart

### Handling Port Conflicts and Zombie Processes

**Common Issue**: The merchant app and other services frequently fail to start due to port conflicts and zombie processes. This happens "literally every other day" and requires a clean restart of all services.

**Solution**: Use the `/scripts/clean-restart.sh` script that comprehensively cleans up all processes:

```bash
# Run the clean restart script
./scripts/clean-restart.sh
```

### What the Clean Restart Script Does

1. **Stops PM2 processes** - Cleanly stops and deletes all PM2 managed processes
2. **Kills Node.js processes** - Force kills any remaining Next.js/Nest.js processes
3. **Clears ports explicitly** - Ensures ports 3000-3003 are free
4. **Clears PM2 logs** - Optionally flushes PM2 logs
5. **Starts services** - Starts API first, waits for it to be ready, then starts frontend apps
6. **Status check** - Shows running processes and port status

### Manual Clean Restart Steps (if script fails)

```bash
# 1. Stop all PM2 processes
pm2 stop all
pm2 delete all

# 2. Kill all Node.js processes
pkill -9 -f "next"
pkill -9 -f "nest"
pkill -9 -f "node.*3000"
pkill -9 -f "node.*3001"
pkill -9 -f "node.*3002"
pkill -9 -f "node.*3003"

# 3. Clear specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3003 | xargs kill -9

# 4. Start services (from their respective directories)
cd apps/api && npm run start:dev &
cd apps/merchant-app && npm run dev:direct &
cd apps/booking-app && npm run dev &  # optional
```

### Port Assignments

- **3000**: API (NestJS backend)
- **3001**: Booking App (Next.js customer interface)
- **3002**: Merchant App (Next.js merchant dashboard)
- **3003**: Admin Dashboard (Next.js admin interface)

### When to Use Clean Restart

- When you see "port already in use" errors
- When PM2 shows processes as "errored" or in restart loops
- When the merchant app won't boot
- After system crashes or unexpected shutdowns
- When processes become unresponsive

**Note**: The clean restart script is essential for development workflow as PM2 and Node.js processes can leave zombie processes that block ports.

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

### Staff Deletion Behavior

**Important**: Permanent deletion of staff members (hard delete) now works even if they have bookings:

- Inactive staff CAN be permanently deleted regardless of booking history
- When a staff member with bookings is deleted:
  - The staff record is permanently removed
  - All their bookings are preserved but set to `providerId: null` (unassigned)
  - This maintains booking history while removing the staff reference
- The system shows a warning about unassigned bookings before deletion

## TypeScript/API Contract Mismatches - Prevention Guide

### Common Issues That Cause "Invalid argument" Errors

#### 1. Prisma Decimal Objects vs Numbers
**Problem**: Prisma returns Decimal objects, but frontend expects plain numbers.

**Example Error**: `[DecimalError] Invalid argument: undefined`

**Solution**: Always convert Decimal objects to numbers:
```typescript
// ❌ Wrong
unitPrice: service.price

// ✅ Correct
unitPrice: typeof service.price === 'object' && service.price.toNumber 
  ? service.price.toNumber() 
  : Number(service.price || 0)
```

#### 2. Missing Required Fields
**Problem**: API expects fields that frontend doesn't send.

**Example**: Order items need `discount` and `taxRate` even if they default to 0.

**Solution**: Always check the API service implementation, not just TypeScript interfaces:
```typescript
// Check what the Prisma create expects:
// apps/api/src/payments/orders.service.ts
new Decimal(item.discount || 0)  // This means discount is required!
```

#### 3. Frontend/Backend Type Mismatches
**Problem**: TypeScript interfaces don't match actual API expectations.

**Debug Steps**:
1. Check API logs for the actual payload being sent
2. Compare with what the service method expects
3. Look for field name differences (e.g., `price` vs `unitPrice`)

#### 4. User Context Issues
**Problem**: JWT payload structure doesn't match controller expectations.

**Example**: `user.locations[0]` vs `user.merchant.locations[0]`

**Solution**: Check the JWT strategy to understand the user object structure:
```typescript
// apps/api/src/auth/strategies/jwt.strategy.ts shows actual structure
```

### Debugging Checklist for API Errors

1. **Check the exact error line in API logs**
   ```bash
   pm2 logs api --nostream --lines 100 | grep -B 20 "Error"
   ```

2. **Verify the payload structure**
   - What's being sent (check browser Network tab)
   - What the API expects (check service method parameters)
   - What Prisma expects (check schema and service implementation)

3. **Look for data transformations**
   - Decimal conversions
   - Default values
   - Required vs optional fields

4. **Compare with working similar features**
   - How does BookingSlideOut create orders?
   - What's different in the data flow?

### Best Practices to Avoid These Issues

1. **Use shared type definitions** between frontend and backend
2. **Transform Prisma types at API boundaries** (Decimals → numbers)
3. **Add explicit validation** with clear error messages
4. **Test the complete data flow** when copying patterns
5. **Document field requirements** in interfaces

### When Copying Features (e.g., BookingSlideOut → QuickSaleSlideOut)

**ALWAYS verify**:
- Exact API endpoints used
- Data transformations at each layer
- Field naming conventions
- Required vs optional fields
- How Prisma Decimal fields are handled

**Never assume** similar UI means identical API contracts!