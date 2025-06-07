# Complete Deployment Guide - HEYA POS

## Overview
- **API**: Railway (NestJS + WebSockets)
- **Frontend Apps**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)

## Phase 1: Deploy API to Railway

### 1. Create Railway Account
Go to https://railway.app and sign up

### 2. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 3. Create Project
```bash
cd apps/api
railway init
# Choose "Empty Project"
```

### 4. Configure Environment Variables
In Railway Dashboard, add:

```env
# Supabase Database
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# Security
JWT_SECRET=generate-a-long-random-string-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=production
PORT=3000
TZ=Australia/Sydney
```

### 5. Deploy API
```bash
railway up
```

### 6. Get API URL
```bash
railway open
```
Save this URL (e.g., `https://heya-pos-api.up.railway.app`)

### 7. Run Migrations
```bash
railway run npx prisma migrate deploy
```

## Phase 2: Deploy Frontend Apps to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
vercel login
```

### 2. Create Environment Variable in Vercel
First, create a shared environment variable:
```bash
vercel env add HEYA_POS_API_URL
# Enter your Railway API URL when prompted
```

### 3. Deploy Merchant App
```bash
cd apps/merchant-app
vercel

# Answer prompts:
# - Set up and deploy? Yes
# - Which scope? (Choose your account)
# - Link to existing project? No
# - Project name? heya-pos-merchant
# - Directory? ./
# - Override settings? No
```

### 4. Deploy Booking App
```bash
cd ../booking-app
vercel

# Project name: heya-pos-booking
# Same process as above
```

### 5. Deploy Admin Dashboard
```bash
cd ../admin-dashboard
vercel

# Project name: heya-pos-admin
# Same process as above
```

## Phase 3: Configure Production URLs

### Update CORS in API
Add your Vercel URLs to the API's CORS configuration:

1. In Railway dashboard, add environment variable:
```env
FRONTEND_URLS=https://heya-pos-merchant.vercel.app,https://heya-pos-booking.vercel.app,https://heya-pos-admin.vercel.app
```

2. Update `apps/api/src/main.ts` if needed to use these URLs for CORS.

## URLs Summary
After deployment, you'll have:
- **API**: `https://[your-app].up.railway.app`
- **Merchant App**: `https://heya-pos-merchant.vercel.app`
- **Booking App**: `https://heya-pos-booking.vercel.app`
- **Admin Panel**: `https://heya-pos-admin.vercel.app`

## Custom Domains (Optional)
### Railway:
```bash
railway domain
```

### Vercel:
In each project's settings, add your custom domain.

## Monitoring & Logs
### Railway:
```bash
railway logs    # View API logs
railway open    # Open dashboard
```

### Vercel:
```bash
vercel logs [project-name]    # View frontend logs
vercel --prod                 # Deploy to production
```

## Important Notes
1. **API must be deployed first** - Frontend apps need the API URL
2. **Database migrations** - Run after API deployment
3. **Environment variables** - Double-check all are set correctly
4. **CORS** - Ensure API allows your frontend domains

## Troubleshooting
### API Issues:
- Check Railway logs: `railway logs`
- Verify env vars: `railway variables`
- Test health: `curl https://your-api.up.railway.app/api/health`

### Frontend Issues:
- Check build logs: `vercel logs`
- Verify API URL: Should be in format `https://api.example.com/api`
- Clear cache: `vercel --force`

## Next Steps
1. Set up monitoring (optional)
2. Configure custom domains
3. Set up CI/CD with GitHub Actions
4. Enable preview deployments