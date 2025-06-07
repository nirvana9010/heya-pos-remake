# Supabase Setup Guide for HEYA POS

## Pre-Migration Checklist

### 1. Get Your Connection Strings from Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings → Database**
4. You need TWO connection strings:

#### Direct Connection (for migrations)
- Find under **"Connection string"** section
- Usually uses port **5432**
- Example: `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`

#### Transaction Pooler (for runtime)
- Find under **"Transaction pooler"** section
- This is the "Shared Pooler" connection
- Usually uses port **6543**
- Add `?pgbouncer=true` to the end
- Example: `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`

### 2. Database Settings

In Supabase Dashboard → Settings → Database:

1. **Transaction Pooler**: This is automatically configured
2. **Shared Pooler**: This provides transaction-mode pooling by default
3. **Connection Limits**: Managed automatically by Supabase

### 3. Security Considerations

1. **Row Level Security (RLS)**
   - Currently disabled in migration
   - Consider enabling after migration for added security
   - Will require additional policy setup

2. **SSL Mode**
   - Supabase enforces SSL by default
   - No additional configuration needed

## Running the Migration

```bash
cd apps/api

# Run with both connection strings
./scripts/migrate-to-supabase.sh \
  'postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres' \
  'postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true'
```

## Post-Migration Configuration

### 1. Update Your .env Files

After migration, your `.env` should contain:
```env
# Direct connection for Prisma migrations
DIRECT_URL="postgres://..."

# Pooled connection for application runtime
DATABASE_URL="postgres://...?pgbouncer=true"

# Your existing JWT secret
JWT_SECRET="your-secret-key-at-least-32-characters-long"
```

### 2. Connection Pool Optimization

For production, add these to your DATABASE_URL:
```
?pgbouncer=true&connection_limit=1&pool_timeout=20
```

### 3. Monitoring

In Supabase Dashboard:
- Monitor **Database → Reports** for query performance
- Check **Database → Roles** for connection counts
- Watch for connection pool exhaustion warnings

## Troubleshooting

### "Prepared statement does not exist" Error
- You're using transaction pooling for migrations
- Use the direct connection (port 5432) for migrations

### Connection Timeout
- Increase `pool_timeout` parameter
- Check if you're hitting connection limits
- Consider reducing `connection_limit` for serverless

### SSL Connection Failed
- Supabase requires SSL, ensure your client supports it
- Try adding `sslmode=require` to connection string

### Too Many Connections
- Reduce `connection_limit` in your pooled connection string
- Default Prisma uses `num_cpus * 2 + 1` connections
- For serverless, use `connection_limit=1`

## Best Practices

1. **Use Environment Variables**
   - Never commit connection strings to git
   - Use `.env.local` for local development
   - Use secure secret management in production

2. **Connection Management**
   - Always disconnect Prisma client properly
   - Use connection pooling for all runtime queries
   - Monitor active connections regularly

3. **Performance**
   - Add indexes for frequently queried columns
   - Use Supabase's query performance analyzer
   - Consider caching for read-heavy operations

4. **Backup Strategy**
   - Enable Point-in-Time Recovery in Supabase
   - Set up regular backups
   - Test restore procedures

## Next Steps

1. Run the migration script
2. Test all application features
3. Update production deployment configs
4. Set up monitoring and alerts
5. Plan for scaling (connection limits, indexes, etc.)