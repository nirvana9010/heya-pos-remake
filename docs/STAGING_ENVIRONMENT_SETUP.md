# Staging Environment Setup Guide

## Overview
This guide sets up a staging environment that exactly mirrors production to catch issues before deployment.

## Architecture

```
Production:
- URL: https://heya-pos-remake-merchant-app.vercel.app
- Branch: main
- Database: Supabase Production
- Environment: production

Staging:
- URL: https://heya-pos-staging-merchant-app.vercel.app
- Branch: staging
- Database: Supabase Staging (separate instance)
- Environment: staging
```

## 1. Database Setup (Supabase)

### Create Staging Database
1. Go to https://supabase.com/dashboard
2. Create new project: "heya-pos-staging"
3. Save the connection details:
   ```
   STAGING_DATABASE_URL=
   STAGING_DIRECT_URL=
   ```

### Sync Schema from Production
```bash
# Export production schema
cd apps/api
npx prisma db pull
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > staging-schema.sql

# Apply to staging
psql $STAGING_DATABASE_URL < staging-schema.sql
```

### Seed Staging Data
```bash
# Use same seed data as production
DATABASE_URL=$STAGING_DATABASE_URL npm run prisma:seed
```

## 2. Vercel Staging Setup

### Create vercel.staging.json
```json
{
  "name": "heya-pos-staging",
  "alias": ["heya-pos-staging.vercel.app"],
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "@staging-api-url",
    "DATABASE_URL": "@staging-database-url",
    "DIRECT_URL": "@staging-direct-url",
    "JWT_SECRET": "@staging-jwt-secret"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  },
  "git": {
    "deploymentEnabled": {
      "main": false,
      "staging": true
    }
  }
}
```

### Set Up Git Branch Protection
1. Create `staging` branch from `main`
2. Set up branch protection rules:
   - Require PR reviews before merging to staging
   - Require status checks to pass
   - Include administrators

### Configure Vercel Projects
1. Clone the production project in Vercel
2. Name it: "heya-pos-staging-[app-name]"
3. Connect to `staging` branch
4. Set environment variables (using staging values)

## 3. Environment Variables

### API Staging (.env.staging)
```env
# Database
DATABASE_URL="postgresql://..."  # Staging Supabase
DIRECT_URL="postgresql://..."    # Staging Supabase Direct

# Same as production for these
JWT_SECRET="same-as-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="same-as-production"
JWT_REFRESH_EXPIRES_IN="30d"

# API
NODE_ENV="production"  # Yes, production for staging
PORT=3000

# Staging-specific
ENVIRONMENT="staging"
```

### Merchant App Staging (.env.staging.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://heya-pos-staging-api.vercel.app/api
NEXT_PUBLIC_ENVIRONMENT=staging

# Same secrets as production
JWT_SECRET="same-as-production"

# Tyro Test Environment
NEXT_PUBLIC_TYRO_ENV=test
NEXT_PUBLIC_TYRO_MERCHANT_ID=test-merchant-id
```

## 4. Deployment Pipeline

### Workflow
```
1. Feature Branch → PR to Staging
2. Staging Tests Pass → PR to Main
3. Main → Auto-deploy to Production
```

### GitHub Actions for Staging
Create `.github/workflows/staging-deploy.yml`:
```yaml
name: Deploy to Staging

on:
  push:
    branches: [staging]
  pull_request:
    branches: [staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run auth middleware tests
        run: |
          cd apps/merchant-app
          node scripts/test-auth-middleware.js
        env:
          TEST_URL: https://heya-pos-staging-merchant-app.vercel.app

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel Staging
        run: |
          npx vercel --prod --scope your-team \
            --env DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }} \
            --env JWT_SECRET=${{ secrets.JWT_SECRET }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 5. Testing Checklist

### Pre-Deployment to Staging
- [ ] All tests pass locally
- [ ] Auth middleware tests pass
- [ ] Build completes without errors
- [ ] No TypeScript errors

### Staging Validation
- [ ] Static assets load correctly (check /js/iclient-with-ui-v1.js)
- [ ] Login flow works with email
- [ ] Protected routes redirect when not authenticated
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Payment integration works (test mode)

### Staging-Specific Tests
Create `scripts/test-staging.js`:
```javascript
const axios = require('axios');
const STAGING_URL = 'https://heya-pos-staging-merchant-app.vercel.app';

async function testStaging() {
  console.log('Testing Staging Environment...\n');
  
  // 1. Test static files
  const staticTest = await axios.get(`${STAGING_URL}/js/iclient-with-ui-v1.js`, {
    validateStatus: () => true
  });
  console.log(`✓ Static files: ${staticTest.status === 200 ? 'PASS' : 'FAIL'}`);
  
  // 2. Test auth redirect
  const authTest = await axios.get(`${STAGING_URL}/calendar`, {
    maxRedirects: 0,
    validateStatus: () => true
  });
  console.log(`✓ Auth redirect: ${authTest.status === 302 ? 'PASS' : 'FAIL'}`);
  
  // 3. Test API health
  const apiTest = await axios.get(`${STAGING_URL}/api/v1/health`, {
    validateStatus: () => true
  });
  console.log(`✓ API health: ${apiTest.status === 200 ? 'PASS' : 'FAIL'}`);
}

testStaging();
```

## 6. Monitoring

### Vercel Analytics
1. Enable Analytics for staging project
2. Set up alerts for:
   - 404 errors on static assets
   - Authentication failures
   - API errors

### Error Tracking (Sentry)
```javascript
// apps/merchant-app/src/lib/sentry.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  beforeSend(event) {
    // Don't send events from development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },
});
```

## 7. Rollback Plan

### Quick Rollback
```bash
# If staging fails, rollback
git revert HEAD --no-edit
git push origin staging

# If production fails, use Vercel instant rollback
vercel rollback
```

## 8. Staging vs Production Differences

| Feature | Staging | Production |
|---------|---------|------------|
| Database | Staging Supabase | Production Supabase |
| Payment Gateway | Test Mode | Live Mode |
| Email Service | Sandbox | Live |
| Error Reporting | Verbose | Standard |
| Debug Mode | Enabled | Disabled |
| Rate Limiting | Relaxed | Enforced |

## 9. Local Development with Staging

### Point Local to Staging API
```bash
# .env.development.local
NEXT_PUBLIC_API_URL=https://heya-pos-staging-api.vercel.app/api
```

### Test Against Staging DB
```bash
# .env.local
DATABASE_URL=$STAGING_DATABASE_URL
```

## 10. Deployment Commands

### Deploy to Staging
```bash
# From feature branch
git checkout staging
git merge feature/your-feature
git push origin staging

# Or via PR
gh pr create --base staging --title "Deploy: Your feature"
```

### Promote Staging to Production
```bash
# After staging validation
git checkout main
git merge staging
git push origin main
```

## Common Issues

### Issue: Staging doesn't match production
**Solution**: Check environment variables match except for URLs/databases

### Issue: Static files work locally but not on staging
**Solution**: Verify middleware.ts matcher pattern

### Issue: Database migrations out of sync
**Solution**: Run migrations on staging first:
```bash
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy
```

## Staging Maintenance

### Weekly Tasks
- [ ] Sync staging database with production schema
- [ ] Clear old test data
- [ ] Review error logs
- [ ] Update dependencies

### Monthly Tasks
- [ ] Full staging rebuild
- [ ] Security audit
- [ ] Performance comparison with production