# Production Database Migration Checklist

## 🚨 URGENT: Update Production Database URLs

Your production servers need to be updated to use the new DigitalOcean database instead of Supabase.

## 1. Fly.io (API) - CRITICAL UPDATE

### Update Environment Variables
```bash
# Set the new database URLs
fly secrets set DATABASE_URL="postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable" -a your-api-app-name

fly secrets set DIRECT_URL="postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable" -a your-api-app-name
```

### Remove Supabase Variables (if they exist)
```bash
# Unset old Supabase variables
fly secrets unset SUPABASE_URL -a your-api-app-name
fly secrets unset SUPABASE_ANON_KEY -a your-api-app-name
fly secrets unset SUPABASE_SERVICE_KEY -a your-api-app-name
```

### Verify and Deploy
```bash
# Check current secrets
fly secrets list -a your-api-app-name

# Deploy with new configuration
fly deploy -a your-api-app-name

# Check logs after deployment
fly logs -a your-api-app-name
```

## 2. Vercel (Frontend Apps) - NO DATABASE CHANGES NEEDED

Frontend apps don't connect directly to the database, but ensure they're pointing to the correct API:

### Merchant App
- Verify `NEXT_PUBLIC_API_URL` points to your Fly.io API
- No database variables should be set in Vercel

### Booking App  
- Verify `NEXT_PUBLIC_API_URL` points to your Fly.io API
- No database variables should be set in Vercel

### Admin Dashboard
- Verify `NEXT_PUBLIC_API_URL` points to your Fly.io API
- No database variables should be set in Vercel

## 3. GitHub Secrets (if using GitHub Actions)

Update these repository secrets:
- `DATABASE_URL` - Update to DigitalOcean URL
- `DIRECT_URL` - Update to DigitalOcean URL
- Remove/delete any `SUPABASE_*` secrets

### Update via GitHub UI:
1. Go to Settings → Secrets and variables → Actions
2. Update `DATABASE_URL` and `DIRECT_URL` with your Fly.io PostgreSQL connection string
3. Delete any `SUPABASE_*` secrets

### Or via GitHub CLI:
```bash
# Set new secrets (replace with your actual Fly.io database URL)
gh secret set DATABASE_URL --body "postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable"

gh secret set DIRECT_URL --body "postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable"

# Remove old secrets
gh secret delete SUPABASE_URL
gh secret delete SUPABASE_ANON_KEY
gh secret delete SUPABASE_SERVICE_KEY
```

## 4. Verification Steps

### After updating Fly.io:
1. **Check database connection**:
   ```bash
   fly ssh console -a your-api-app-name
   # Inside the container:
   cd app
   npx prisma db pull --print
   # This should connect to DigitalOcean, not Supabase
   ```

2. **Check API health**:
   ```bash
   curl https://your-api.fly.dev/api/v1/auth/health
   ```

3. **Monitor logs for errors**:
   ```bash
   fly logs -a your-api-app-name | grep -i "database\|supabase\|digitalocean"
   ```

### Common Issues to Watch For:

1. **"Can't reach database server at aws-0-ap-southeast-2.pooler.supabase.com"**
   - This means the old Supabase URL is still being used
   - Double-check that DATABASE_URL was updated correctly

2. **SSL/TLS errors**
   - Ensure `?sslmode=require` is included in the connection string

3. **Connection timeouts**
   - DigitalOcean may need your Fly.io IP whitelisted
   - Check DigitalOcean dashboard → Databases → Settings → Trusted Sources

## 5. Rollback Plan

If issues occur, you can temporarily switch back to Supabase:
```bash
# Revert to Supabase (emergency only)
fly secrets set DATABASE_URL="postgresql://postgres.hpvnmqvdgkfeykekosrh:WV3R4JZIF2Htu92k@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true" -a your-api-app-name
```

But remember: You've already migrated all data to DigitalOcean, so Supabase data will be outdated!

## 6. Post-Migration Checklist

- [ ] Fly.io DATABASE_URL updated
- [ ] Fly.io DIRECT_URL updated  
- [ ] Supabase variables removed from Fly.io
- [ ] GitHub secrets updated (if applicable)
- [ ] API health check passing
- [ ] No Supabase connection errors in logs
- [ ] Test user login working
- [ ] Test a booking creation
- [ ] Monitor for 24 hours for stability

## Important Notes

- **Data is now in DigitalOcean**: All your production data has been migrated
- **No dual-write needed**: Supabase is completely replaced
- **Keep credentials secure**: Don't commit database URLs to git
- **Monitor closely**: Watch logs for the first 24-48 hours after migration