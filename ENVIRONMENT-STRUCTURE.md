# Environment File Structure

This document outlines the standard environment file structure for the Heya POS project after the cleanup performed on January 31, 2025.

## Standard Pattern

Each app follows this pattern:
- `.env` - Active configuration (git-ignored)
- `.env.example` - Template with all variables documented
- `.env.local` - Local overrides (optional, git-ignored)
- `.env.production` - Production configuration (git-ignored)

## Current Structure

```
heya-pos/
├── .env                          # Root shared configuration (DATABASE_URL for Prisma CLI)
├── .env.example                  # Root template
├── apps/
│   ├── api/
│   │   ├── .env                  # API configuration (DigitalOcean DB, JWT, etc.)
│   │   ├── .env.example          # API template
│   │   └── .env.production       # API production config
│   ├── merchant-app/
│   │   ├── .env.local            # Merchant app local config (optional)
│   │   └── .env.example          # Merchant app template
│   ├── booking-app/
│   │   ├── .env.local            # Booking app local config (optional)
│   │   └── .env.example          # Booking app template
│   └── admin-dashboard/
│       ├── .env.local            # Admin dashboard local config (optional)
│       └── .env.example          # Admin dashboard template
```

## Database Configuration

All database connections now point to DigitalOcean:
- Host: `heyapos-db-do-user-21925728-0.h.db.ondigitalocean.com`
- Port: `25060`
- Database: `defaultdb`
- SSL Mode: `require`

Supabase references have been removed/commented out in all environment files.

## Removed Files

The following redundant files were removed during cleanup:
- `.env.example.upgraded`
- `.env.local` (root level)
- `apps/api/.env.development`
- `apps/api/.env.local`
- `apps/api/.env.postgresql`
- `apps/api/.env.staging`
- `apps/merchant-app/.env.development`
- `apps/merchant-app/.env.production.example`
- `apps/merchant-app/.env.staging`

## Key Variables by App

### Root `.env`
- `DATABASE_URL` - Required for Prisma CLI commands
- `DIRECT_URL` - Direct database connection
- `NODE_ENV` - Environment mode

### API (`apps/api/.env`)
- Database: `DATABASE_URL`, `DIRECT_URL`
- JWT: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- CORS: `FRONTEND_URL`, `FRONTEND_URLS`
- Redis cache: `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- Email: `SENDGRID_*` variables
- SMS: `TWILIO_*` variables
- Payment: `PAYMENT_PROVIDER`, `PAYMENT_MERCHANT_ID`

### Frontend Apps
All frontend apps (merchant-app, booking-app, admin-dashboard) use:
- `NEXT_PUBLIC_API_URL` - API endpoint (typically `http://localhost:3000/api`)
- App-specific feature flags and configurations

## Usage

1. Copy `.env.example` to `.env` (or `.env.local` for Next.js apps)
2. Fill in your specific values
3. Never commit `.env`, `.env.local`, or `.env.production` files
4. Always update `.env.example` when adding new variables

## Migration Notes

- Migrated from Supabase to DigitalOcean on January 31, 2025
- All Supabase environment variables have been removed
- Database connection now uses DigitalOcean's managed PostgreSQL
