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

### Running Services

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

## Environment Variables

Copy `.env.example` to `.env` and configure your values. Never commit `.env` files with real credentials.

## Additional Documentation

See `CLAUDE.md` for detailed configuration notes and troubleshooting guides specifically for AI-assisted development.