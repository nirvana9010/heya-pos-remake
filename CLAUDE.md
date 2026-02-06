# Claude Code Configuration Guide

## Collaboration Guidelines
- **Challenge and question**: Don't immediately agree with suboptimal requests - suggest better alternatives
- **Push back constructively**: If a proposed approach has issues, explain why with clear reasoning
- **Think critically**: Consider edge cases, performance, maintainability before implementing
- **Seek clarification**: Ask follow-up questions when requirements are ambiguous
- **Be a thoughtful collaborator**: Help improve overall quality and direction

## CRITICAL RULES - DO NOT VIOLATE

1. **NEVER DELETE SCRIPTS** - Do not delete any scripts in `/scripts` without explicit permission
2. **NEVER DELETE CONFIGURATION FILES** - Do not delete `.env`, `ecosystem.config.js`, or config files without permission
3. **ASK BEFORE REMOVING** - Always ask for confirmation before deleting existing files
4. **NEVER MANUALLY DEPLOY TO FLY.IO** - Deployment is automatic via GitHub Actions
   - Deploy with: `git push origin main`
   - Do NOT use `flyctl deploy` manually
   - Exception: updating secrets with `flyctl secrets set` is allowed

## Project Structure

| App | Port | Description |
|-----|------|-------------|
| `/apps/api` | 3000 | NestJS backend (only service that connects to DB) |
| `/apps/merchant-app` | 3002 | Next.js merchant dashboard |
| `/apps/booking-app` | 3001 | Next.js customer booking interface |
| `/apps/admin-dashboard` | 3003 | Next.js admin interface |

## API Quick Reference

**Base URL**: `http://localhost:3000/api` | **Default version**: v1

### Key Endpoints
- **Login**: `POST /api/v1/auth/merchant/login` - Body: `{"email": "...", "password": "..."}`
- **Services**: `/api/v1/services`
- **Staff**: `/api/v1/staff`
- **Customers**: `/api/v1/customers`
- **Bookings**: `/api/v2/bookings` (v2 uses CQRS pattern)

### Test Credentials
| Account | Email | Password |
|---------|-------|----------|
| Hamilton Beauty (Owner) | `admin@hamiltonbeauty.com` | `demo123` |
| Hamilton Beauty (Manager) | `manager@hamiltonbeauty.com` | `manager123` |

### Auth Response Format
**CRITICAL**: Login returns `token`, NOT `accessToken`:
```javascript
const { token } = loginResponse.data;  // Correct
const { accessToken } = loginResponse.data;  // WRONG - undefined
```

### Booking Numbers
Format: `ABC123` (6-char airline-style, 3 letters + 3 numbers)

## Database & Environment

**Local dev uses Docker**:
```bash
docker start heya-pos-db heya-pos-redis    # Start local database and Redis
```

**Production uses Fly.io PostgreSQL** (`heya-pos-db.flycast` internally)

**Key config**:
```bash
PRISMA_CLIENT_ENGINE_TYPE=binary  # Keeps connection pool at 1
```

**If "Can't reach database" error**:
1. Check if Fly.io proxy is running (local)
2. Check if PM2 is loading env vars - use wrapper script `/scripts/start-api-with-env.sh`
3. Test directly: `cd apps/api && npm run start:dev`

## Process Management

**Starting the dev server**: Always use PM2 to start all services together:
```bash
pm2 start ecosystem.config.js                 # Start all services (API + all frontends)
```

**Port conflicts / zombie processes**: Run `./scripts/clean-restart.sh`

**PM2 commands**:
```bash
pm2 status                                    # Check processes
pm2 logs api --nostream --lines 50            # View logs (always use --nostream)
pm2 delete api && pm2 start ecosystem.config.js --only api  # Clean restart
```

## Git Policy

- **Commits**: Allowed automatically after significant work
- **Push**: NEVER push automatically - always wait for explicit permission
- **Fly.io**: Never run `flyctl deploy` - push to GitHub triggers auto-deploy

## Commands Before Committing

```bash
npm run lint       # Lint checking
npm run typecheck  # Type checking
npm run format     # Format code
```

**Never use heredoc syntax** (`cat > file << 'EOF'`) - use Write tool instead.

## React Best Practices

### Infinite Loop Prevention
- Never use `= []` or `= {}` as default parameters (creates new references each render)
- Memoize arrays/objects with `useMemo`, callbacks with `useCallback`
- Use functional setState: `setState(prev => ...)` to avoid dependencies

### Optimistic Updates
For predictable operations (deletes, toggles), update local state immediately:
```typescript
await apiClient.deleteStaff(id);
setStaff(prev => prev.filter(s => s.id !== id));  // Instant UI update
```

## Common Gotchas

### Prisma Decimals
Prisma returns Decimal objects - convert to numbers at API boundaries:
```typescript
unitPrice: typeof price === 'object' && price.toNumber
  ? price.toNumber()
  : Number(price || 0)
```

### crypto Error in Next.js
Never use `require('crypto')` in webpack config or client code - causes "crypto is not defined" in production.

### Settings Page Toggles Won't Save
When adding a new boolean toggle to the settings page, you MUST call `queueAutoSave()` directly — do NOT just call the state setter. The `setState → useMemo → useEffect` chain is unreliable for toggles. Follow the pattern used by `handleAllowOnlineBookingsChange`:
```typescript
setMyNewSetting(value);
queueAutoSave({ myNewSetting: value }, { force: true });
```
Also ensure the field name is recognized by `isBooleanField()` in `src/lib/db-transforms.ts` (matches prefixes `is*`, `has*`, `allow*`, `require*`, `enable*`, `disable*`, or suffix `*Enabled`), otherwise `null` from the API won't be coerced to `false`.

## Real-time Updates

Uses **WebSockets with Socket.IO** for notifications:
- Server: `/src/notifications/notifications.gateway.ts`
- Client: `useWebSocket` hook with automatic reconnection
- Events: booking_created, booking_updated, payment_created, etc.
- Debug: `localStorage.setItem('ws_debug', 'true')`

## Testing Guidelines

- Use proper error handling
- Get fresh auth tokens for API tests
- Use real IDs from database, not made-up UUIDs
- Include positive and negative test cases
- Show before/after states to verify changes

## Project Context (for Codex)

Heyapos is a browser-based POS for salons and spas. Laravel backend, React frontend.
Single developer, ~20 paying customers.

Priorities:
- Ship working features fast, don't over-engineer for scale we don't have
- Handle errors that would break core functionality or corrupt data
- Skip: elaborate validation messages, unlikely edge cases (<1% of users), comprehensive logging
- Security: Proper auth, payment handling, input sanitization are non-negotiable