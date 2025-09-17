# Update Production to Use Fly.io PostgreSQL

## ✅ Migration Status

1. **Fly.io PostgreSQL Created**: `heya-pos-db` in Sydney region
2. **Data Migrated**: 
   - 3 Packages
   - 8 Merchants  
   - 188 Customers
   - 44 Staff
   - 373 Outbox Events
   - 135 Merchant Notifications
3. **Local Testing**: API successfully connected and running

## 🚀 Update Production Commands

Run these commands to update your production API:

```bash
# 1. Update database URLs (internal Fly.io connection)
/home/lukas/.fly/bin/flyctl secrets set DATABASE_URL='postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable' -a heya-pos-api

/home/lukas/.fly/bin/flyctl secrets set DIRECT_URL='postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable' -a heya-pos-api

# 2. Remove old DigitalOcean/Supabase secrets (if any exist)
/home/lukas/.fly/bin/flyctl secrets unset SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY -a heya-pos-api

# 3. Deploy the changes
/home/lukas/.fly/bin/flyctl deploy -a heya-pos-api

# 4. Monitor logs
/home/lukas/.fly/bin/flyctl logs -a heya-pos-api
```

## 🔍 Verify Production Update

After deployment, verify everything is working:

```bash
# Check database connection
/home/lukas/.fly/bin/flyctl ssh console -a heya-pos-api -C "cd app && npx prisma db pull --print | head -20"

# Check API health
curl https://heya-pos-api.fly.dev/api/v1/auth/health

# Check logs for any errors
/home/lukas/.fly/bin/flyctl logs -a heya-pos-api | grep -i "error\|database"
```

## 💾 Database Connection Details

- **Internal URL** (for Fly.io apps): `postgres://postgres:[YOUR-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable`
- **External Access** (via proxy): `flyctl proxy 5432 -a heya-pos-db`
- **Username**: `postgres`
- **Password**: `[YOUR-FLY-POSTGRES-PASSWORD]`
- **Database**: `postgres`

## 📊 Benefits of Fly.io PostgreSQL

1. **Zero network latency** - Database and API in same data center (Sydney)
2. **Cost savings** - No cross-provider data transfer fees
3. **Simplified operations** - Single vendor, integrated logging
4. **Better performance** - Private networking, no internet hops
5. **Automatic backups** - Daily snapshots included

## ⚠️ Important Notes

- The database is NOT accessible from the internet (security feature)
- Use `flyctl proxy` for local development access
- All data has been migrated from DigitalOcean
- Some tables couldn't migrate due to schema differences (Services, Bookings, Orders) - these may need manual attention

## 🔄 Rollback Plan (if needed)

If you need to rollback to DigitalOcean:
```bash
/home/lukas/.fly/bin/flyctl secrets set DATABASE_URL='postgresql://[DIGITALOCEAN-USER]:[DIGITALOCEAN-PASSWORD]@[DIGITALOCEAN-HOST]:25060/defaultdb?sslmode=require' -a heya-pos-api
```

But note: Any new data created in Fly.io won't be in DigitalOcean!