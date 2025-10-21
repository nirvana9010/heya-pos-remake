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

## Environment Variables

Copy `.env.example` to `.env` and configure your values. Never commit `.env` files with real credentials.

## Additional Documentation

See `CLAUDE.md` for detailed configuration notes and troubleshooting guides specifically for AI-assisted development.
