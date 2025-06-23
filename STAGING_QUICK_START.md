# Staging Environment Quick Start

## 1. Initial Setup (One Time)

### Create Staging Branch
```bash
git checkout -b staging
git push -u origin staging
```

### Set Up Vercel Projects
1. Go to https://vercel.com/dashboard
2. Import project again (same repo)
3. Name it: `heya-pos-staging-merchant-app`
4. Set Git Branch to `staging`
5. Add environment variables from `.env.staging`

### Create Staging Database
1. Create new Supabase project: `heya-pos-staging`
2. Copy connection strings
3. Run migrations:
```bash
DATABASE_URL=[staging-url] npx prisma migrate deploy
DATABASE_URL=[staging-url] npx prisma db seed
```

## 2. Deployment Flow

### Deploy to Staging
```bash
# From your feature branch
git checkout staging
git merge feature/your-feature
git push origin staging

# Wait for Vercel deployment
# Test staging
npm run test:staging
```

### Test Staging
```bash
# Run staging tests
node scripts/test-staging.js

# Or test specific URLs
STAGING_MERCHANT_URL=https://your-staging-url.vercel.app node scripts/test-staging.js
```

### Promote to Production
```bash
# After staging passes all tests
git checkout main
git merge staging
git push origin main
```

## 3. Environment Variables

### Required Vercel Environment Variables
```
# Database
DATABASE_URL = [staging supabase url]
DIRECT_URL = [staging supabase direct url]

# Auth
JWT_SECRET = [same as production]

# API URL (for merchant app)
NEXT_PUBLIC_API_URL = https://heya-pos-staging-api.vercel.app/api

# Environment
NEXT_PUBLIC_ENVIRONMENT = staging
```

## 4. Testing Checklist

Before promoting staging to production:

- [ ] All staging tests pass: `node scripts/test-staging.js`
- [ ] Login works with email
- [ ] Static files load (no redirect issues)
- [ ] API endpoints respond
- [ ] Database operations work
- [ ] No console errors

## 5. Rollback

If something goes wrong:

### Rollback Staging
```bash
git checkout staging
git revert HEAD --no-edit
git push origin staging
```

### Rollback Production (Vercel)
1. Go to Vercel dashboard
2. Click on production deployment
3. Click "Rollback" button

## 6. Common Commands

```bash
# Test staging environment
npm run test:staging

# Check staging logs
vercel logs heya-pos-staging-merchant-app

# Compare staging vs production
npm run compare:envs

# Sync staging DB with production schema
npm run db:sync-staging
```