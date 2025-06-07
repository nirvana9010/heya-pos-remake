# SQLite to Supabase PostgreSQL Migration Guide

## Overview
This guide describes how to migrate your HEYA POS database from SQLite to Supabase PostgreSQL.

## Prerequisites
- Supabase account with a database created
- Supabase database connection string
- Node.js and npm installed
- All data backed up

## Migration Steps

### 1. Automatic Migration (Recommended)
Use the provided migration script:

```bash
cd apps/api
./scripts/migrate-to-supabase.sh 'postgresql://postgres:[password]@[host]:[port]/postgres'
```

Replace the connection string with your actual Supabase connection string.

### 2. Manual Migration
If you prefer to run each step manually:

#### Step 1: Backup SQLite Database
```bash
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d-%H%M%S)
```

#### Step 2: Export Data from SQLite
```bash
npx tsx scripts/export-sqlite-data.ts
```
This creates JSON files in `data-export/` directory.

#### Step 3: Update Prisma Schema
```bash
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

#### Step 4: Update Environment Variables
Create `.env` with your Supabase connection:
```env
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"
```

#### Step 5: Generate Prisma Client
```bash
npx prisma generate
```

#### Step 6: Push Schema to Supabase
```bash
npx prisma db push --force-reset
```
⚠️ WARNING: This will reset the database!

#### Step 7: Import Data
```bash
npx tsx scripts/import-to-postgresql.ts
```

## Post-Migration Tasks

1. **Test Application**
   - Run the application and verify all features work
   - Check data integrity
   - Test authentication and authorization

2. **Update Configuration**
   - Update production environment variables
   - Update deployment scripts
   - Update CI/CD pipelines

3. **Performance Tuning**
   - Add appropriate indexes if needed
   - Configure connection pooling
   - Set up database backups

## Rollback Procedure

If you need to rollback to SQLite:

```bash
# Restore environment file
cp .env.sqlite.backup .env

# Restore schema
cp prisma/schema.prisma.backup prisma/schema.prisma

# Regenerate Prisma client
npx prisma generate
```

## Data Mapping Changes

### ID Fields
- Changed from `@default(cuid())` to `@default(uuid())`
- Existing IDs are preserved during migration

### Decimal Fields
- Changed from `Float` to `Decimal` with proper precision
- Examples: `Decimal @db.Decimal(10, 2)` for currency

### JSON Fields
- Changed from `Json` to `Json @db.JsonB` for better PostgreSQL performance

### Text Fields
- Long text fields now use `@db.Text` annotation

## Troubleshooting

### Connection Issues
- Verify your Supabase connection string
- Check if database is accessible from your network
- Ensure SSL mode is configured correctly

### Import Errors
- Check the console for specific error messages
- Verify foreign key constraints
- Ensure all referenced IDs exist

### Performance Issues
- Add indexes for frequently queried fields
- Use connection pooling
- Consider using Supabase's connection pooler

## Support

For issues specific to:
- Prisma: Check [Prisma Documentation](https://www.prisma.io/docs/)
- Supabase: Check [Supabase Documentation](https://supabase.com/docs)
- HEYA POS: Contact your development team