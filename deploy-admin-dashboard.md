# Deploy Admin Dashboard to Production

## Prerequisites
- API is already deployed at `https://heya-pos-api.fly.dev/api`
- Admin dashboard is working locally on port 3003
- Vercel account with appropriate permissions

## Step 1: Deploy to Vercel

```bash
# Navigate to admin dashboard
cd apps/admin-dashboard

# Deploy to Vercel
vercel --prod

# When prompted:
# Project name: heya-pos-admin-dashboard (or similar)
# Framework: Next.js
# Directory: . (current directory)
```

## Step 2: Configure Environment Variables

In Vercel dashboard, set these environment variables:

```bash
# Production API URL
NEXT_PUBLIC_API_URL=https://heya-pos-api.fly.dev/api

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production

# Feature flags
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## Step 3: Update API CORS Settings

The API needs to allow requests from the admin dashboard domain:

```bash
# Get current FRONTEND_URLS
/home/nirvana9010/.fly/bin/flyctl secrets list -a heya-pos-api | grep FRONTEND_URLS

# Add admin dashboard URL to FRONTEND_URLS
/home/nirvana9010/.fly/bin/flyctl secrets set FRONTEND_URLS="https://your-booking-app.vercel.app,https://your-merchant-app.vercel.app,https://your-admin-dashboard.vercel.app,http://localhost:3001,http://localhost:3002,http://localhost:3003" -a heya-pos-api

# Restart API to apply changes
/home/nirvana9010/.fly/bin/flyctl apps restart heya-pos-api
```

## Step 4: Test Production Deployment

1. **Access the admin dashboard**: `https://your-admin-dashboard.vercel.app`
2. **Test login**: Use admin credentials
3. **Test merchant editing**: Try editing a merchant's subdomain
4. **Verify API connectivity**: Check browser network tab for successful API calls

## Step 5: Test Subdomain Editing Functionality

1. Log into admin dashboard in production
2. Navigate to a merchant
3. Edit their subdomain
4. Verify the change persists (this will now affect production data!)

## Security Considerations

⚠️ **Important**: The admin dashboard will now have access to production data:
- Only deploy with proper authentication in place
- Consider IP allowlisting for admin access
- Ensure admin user accounts are properly secured
- Monitor admin actions through API logs

## Domain Configuration (Optional)

For a custom domain like `admin.heya-pos.com`:

1. Configure domain in Vercel project settings
2. Update CORS settings to include custom domain
3. Set up DNS records as directed by Vercel

## Rollback Plan

If issues occur:
1. Remove admin dashboard URL from FRONTEND_URLS
2. Delete Vercel deployment
3. Admin functionality returns to local-only access