# Heya POS System

A comprehensive point-of-sale system for managing bookings, customers, and payments.

## Architecture

The system consists of multiple applications:
- **API** (Port 3000) - NestJS backend service
- **Merchant App** (Port 3002) - Dashboard for merchants
- **Booking App** (Port 3001) - Customer booking interface
- **Admin Dashboard** (Port 3003) - Administrative interface

## Getting Started

### Prerequisites

- Node.js v20+
- PostgreSQL (via Supabase)
- PM2 for process management

### Installation

```bash
# Install dependencies
npm install

# Start all services with PM2
pm2 start ecosystem.config.js
```

## Database Configuration

This project uses Supabase PostgreSQL with connection pooling. 

### Important: Connection URLs

1. **DIRECT_URL** - Direct connection for migrations (port 5432)
2. **DATABASE_URL** - Pooled connection for runtime queries (port 6543)

⚠️ **Critical**: Always use the pooled connection (port 6543) with `?pgbouncer=true` for the DATABASE_URL to avoid connection issues.

Example `.env` configuration:
```env
# Direct connection for migrations
DIRECT_URL="postgresql://user:pass@host:5432/postgres"

# Pooled connection for runtime (MUST include pgbouncer=true)
DATABASE_URL="postgresql://user:pass@host:6543/postgres?pgbouncer=true"
```

### Troubleshooting Database Connections

If you encounter "Can't reach database server" errors:
1. Verify DATABASE_URL uses port 6543 (not 5432)
2. Ensure `?pgbouncer=true` is included
3. Check that you haven't accidentally switched to the direct connection URL

## Development

### Local Dev Stack

```bash
# Launch API, merchant, booking, and admin dashboards with cleanup guards
./scripts/dev-start.sh

# Stop everything and clear stray nest/next processes
./scripts/dev-stop.sh
```

These scripts call the service managers (`apps/api/dev-service.sh`, `apps/merchant-app/dev-service.sh`) so only a single watcher exists per app. Avoid `npm run api:dev` or `npm run merchant:dev` unless you are actively debugging the scripts; running them directly can leave zombie processes on ports 3000/3002.

### Running Services (PM2)

```bash
# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs [app-name]

# Restart with new environment variables
pm2 restart [app-name] --update-env
```

### Code Quality

Before committing code:
```bash
npm run lint
npm run typecheck
```

### Prisma Schema Changes

Whenever you add or modify database columns:

1. **Back up the dev database (optional but recommended).**
   ```bash
   pg_dump -h localhost -p 5432 -U user heya_pos > backup_dev_$(date +%Y%m%d_%H%M%S).sql
   ```
2. **Edit** `apps/api/prisma/schema.prisma`.
3. **Generate a migration** and apply it locally:
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_feature_flag_column
   ```
4. **Commit both** the schema file and the generated `apps/api/prisma/migrations/<timestamp>_<name>` folder.
5. **Pulling changes on another machine?** Run `cd apps/api && npx prisma migrate dev` to stay in sync.

If Prisma reports drift, don’t reset the database. Instead reconcile the history using `prisma migrate resolve` (see the “Prisma Migration Workflow” section in `AGENTS.md` for the exact steps). Never run `prisma db push` in shared environments.

### Targeted Data Restore Playbook (Fly MPG)

When a migration wipes a specific table (for example `StaffSchedule` or `ScheduleOverride`), follow this checklist to recover production data quickly without nuking the rest of the database.

1. **Spin up a restore cluster from the relevant Fly MPG snapshot.**  
   - `fly pg backup list --app <cluster-name>` to pick the right timestamp.  
   - `fly pg backup restore <new-temp-app> --app <cluster-name> --backup <backup-id>` (initiate in a separate shell).

2. **Proxy into both clusters one at a time.**  
   - Use the sandbox-approved script: `nohup fly mpg proxy --cluster <cluster-id> >/tmp/fly_proxy_<id>.log 2>&1 & echo $! > /tmp/fly_proxy_<id>.pid`  
   - Only run a single proxy per port; kill old ones first (`pkill -f "flyctl mpg proxy"`).

3. **Dump only the affected tables from the restored cluster.**  
   ```bash
   PGPASSWORD=<restored-password> \
     pg_dump -h 127.0.0.1 -p 16380 -U fly-user -d fly-db \
     -t "\"StaffSchedule\"" -t "\"ScheduleOverride\"" \
     --data-only --column-inserts > /tmp/roster_backup.sql
   ```

4. **Wrap the dump in a safe transaction before replaying.**  
   ```bash
   cat <<'SQL' >/tmp/roster_restore.sql
   BEGIN;
   TRUNCATE "ScheduleOverride" RESTART IDENTITY;
   TRUNCATE "StaffSchedule" RESTART IDENTITY;
   SQL
   cat /tmp/roster_backup.sql >> /tmp/roster_restore.sql
   echo 'COMMIT;' >> /tmp/roster_restore.sql
   ```

5. **Load into production via the prod proxy.**  
   ```bash
   PGPASSWORD=<prod-password> \
     psql -h 127.0.0.1 -p 16380 -U fly-user -d fly-db \
     -f /tmp/roster_restore.sql
   ```
   Verify counts (`SELECT COUNT(*) FROM "StaffSchedule";`) match the restored cluster before tearing down proxies.

6. **Extract CSVs for manual entry (optional fallback).**  
   Parse `/tmp/roster_backup.sql` into `/tmp/roster_overrides.csv` and `/tmp/roster_schedules.csv` if the API/UI still needs manual fixes. Remove the CSVs once done (they contain production data).

7. **Patch the API if Prisma throws `P2021`.**  
   Guard `merchantHoliday.findMany` in `apps/api/src/staff/staff.service.ts` so missing holiday tables don’t break roster reads (`P2021` → log + skip).

8. **Clean up.**  
   - `kill $(cat /tmp/fly_proxy_<id>.pid)` for each proxy.  
   - Delete `/tmp/roster_backup.sql`, `/tmp/roster_restore.sql`, and any derived CSVs.  
   - `git stash pop` if you parked local changes while restoring.

Document every restore in `staff-roster-fix.md` (or a merchant-specific log) so we have traceability.

## Environment Variables

Copy `.env.example` to `.env` and configure your values. Never commit `.env` files with real credentials.

## Additional Documentation

See `CLAUDE.md` for detailed configuration notes and troubleshooting guides specifically for AI-assisted development.
