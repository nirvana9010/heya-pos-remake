# Deployment Troubleshooting Guide

## Common Deployment Failures

### 1. Vercel Deployment Issues

#### Booking App Build Failure
**Issue**: Missing `@heya-pos/shared` package in build command
**Fix**: Already fixed in vercel.json - ensure it includes all packages:
```json
"buildCommand": "cd ../.. && npm run build --workspace=@heya-pos/types && npm run build --workspace=@heya-pos/utils && npm run build --workspace=@heya-pos/ui && npm run build --workspace=@heya-pos/shared && cd apps/booking-app && npm run build"
```

#### Missing Environment Variables
Required for all frontend apps:
- `NEXT_PUBLIC_API_URL` - Must point to your deployed API (e.g., https://your-api.railway.app)

### 2. Railway Deployment Issues

#### API Deployment Failures

**Required Environment Variables**:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
API_KEY_SECRET=your-api-key-secret
NODE_ENV=production
PORT=3000  # Railway will override this
```

**Database Migrations**:
Railway doesn't automatically run migrations. You need to:
1. Add a release command in railway.toml or
2. Run migrations manually after deployment:
```bash
railway run npx prisma migrate deploy
```

#### Memory Issues
The API uses 4GB memory (`--max-old-space-size=4096`). For smaller Railway plans:
1. Edit `apps/api/package.json`
2. Change start:prod script to use less memory:
```json
"start:prod": "NODE_OPTIONS='--max-old-space-size=2048' node dist/main"
```

### 3. Build Order Issues

The monorepo packages must be built in this order:
1. @heya-pos/types
2. @heya-pos/utils
3. @heya-pos/ui
4. @heya-pos/shared
5. Apps (api, merchant-app, booking-app, admin-dashboard)

### 4. Prisma Client Issues

If you see "Cannot find module '.prisma/client'":
1. Ensure `prisma generate` runs during build
2. Add to build scripts if needed:
```json
"build": "npx prisma generate && nest build"
```

### 5. CORS Issues

Frontend apps can't connect to API:
1. Check `FRONTEND_URLS` environment variable in API
2. Should include all deployed frontend URLs:
```env
FRONTEND_URLS=https://booking.vercel.app,https://merchant.vercel.app,https://admin.vercel.app
```

### 6. Node Version Issues

All apps require Node 18+. Ensure deployment platforms use:
- Vercel: Add `engines` in package.json
- Railway: Set `NIXPACKS_NODE_VERSION=18` in environment

### Quick Checklist

#### Before Deploying API (Railway):
- [ ] Set all required environment variables
- [ ] Database is accessible from Railway
- [ ] Migrations are run
- [ ] FRONTEND_URLS includes all frontend apps
- [ ] Memory limits are appropriate for your plan

#### Before Deploying Frontend Apps (Vercel):
- [ ] API is deployed and accessible
- [ ] NEXT_PUBLIC_API_URL points to deployed API
- [ ] All monorepo packages are included in buildCommand
- [ ] Node version is 18+

### Debugging Steps

1. **Check build logs** for missing packages or dependencies
2. **Verify environment variables** are set correctly
3. **Test API health**: `curl https://your-api.railway.app/api/v1/auth/health`
4. **Check CORS**: Browser console for CORS errors
5. **Memory usage**: Railway metrics for OOM kills
6. **Database connection**: Ensure DATABASE_URL is correct

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot find module '@heya-pos/shared'" | Missing package build | Add to vercel.json buildCommand |
| "ECONNREFUSED" | API not accessible | Check NEXT_PUBLIC_API_URL |
| "Invalid prisma.merchant invocation" | Missing migrations | Run prisma migrate deploy |
| "JavaScript heap out of memory" | Memory limit exceeded | Reduce max-old-space-size |
| "CORS error" | Missing origin in API | Update FRONTEND_URLS env var |