# Railway Deployment Guide for HEYA POS API

## Prerequisites
1. Create a Railway account at https://railway.app
2. Install Railway CLI: `npm install -g @railway/cli`

## Step 1: Login to Railway
```bash
railway login
```

## Step 2: Create New Project
```bash
cd apps/api
railway init
```
Choose "Empty Project" when prompted.

## Step 3: Set Environment Variables
Go to your Railway dashboard and add these environment variables:

```env
# Database (from Supabase)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# Auth
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Environment
NODE_ENV=production
PORT=3000

# Timezone
TZ=Australia/Sydney

# Optional: Tyro Payment Integration
TYRO_MERCHANT_ID=your-tyro-merchant-id
TYRO_TERMINAL_ID=your-tyro-terminal-id
TYRO_API_KEY=your-tyro-api-key
```

## Step 4: Deploy
```bash
railway up
```

## Step 5: Get Your API URL
After deployment, get your API URL:
```bash
railway open
```

Your API will be available at something like:
`https://your-app-name.up.railway.app`

## Step 6: Run Database Migrations
Once deployed, run migrations:
```bash
railway run npx prisma migrate deploy
```

## Step 7: Seed Database (Optional)
If you need test data:
```bash
railway run npx prisma db seed
```

## Monitoring
- View logs: `railway logs`
- Open dashboard: `railway open`

## Important Notes
1. Railway will automatically detect it's a Node.js app
2. The nixpacks.toml file configures the build
3. Health check endpoint: `/api/health`
4. WebSocket support is included
5. File uploads will work (persistent storage)

## Troubleshooting
If deployment fails:
1. Check logs: `railway logs`
2. Ensure all environment variables are set
3. Verify DATABASE_URL is using pooled connection
4. Check that build completes locally: `npm run build`

## Next Steps
Save your Railway API URL, you'll need it for:
- `NEXT_PUBLIC_API_URL` in the frontend apps on Vercel