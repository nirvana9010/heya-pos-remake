# Fix Production Apps (Booking & Merchant)

## Current Issue
The booking app and merchant app are not working in production because:
1. They're pointing to the wrong API URL (old Railway deployment instead of Fly.io)
2. CORS is not configured on Fly.io to allow the frontend domains

## Steps to Fix

### 1. ✅ Update Frontend Environment Files (Already Done)
```bash
# apps/booking-app/.env.production
NEXT_PUBLIC_API_URL=https://heya-pos-api.fly.dev/api

# apps/merchant-app/.env.production  
NEXT_PUBLIC_API_URL=https://heya-pos-api.fly.dev/api
```

### 2. Deploy Frontend Apps to Vercel
```bash
# Deploy booking app
cd apps/booking-app
vercel --prod

# Deploy merchant app  
cd ../merchant-app
vercel --prod
```

### 3. Get Your Production URLs
After deployment, Vercel will show you the production URLs. They'll look something like:
- Booking App: `https://your-booking-app.vercel.app`
- Merchant App: `https://your-merchant-app.vercel.app`

### 4. Update Fly.io CORS Configuration
```bash
# Set the FRONTEND_URLS environment variable with your actual URLs
fly secrets set FRONTEND_URLS="https://your-booking-app.vercel.app,https://your-merchant-app.vercel.app,http://localhost:3001,http://localhost:3002" -a heya-pos-api

# Or use the provided script (update URLs first!)
./scripts/update-fly-cors.sh
```

### 5. Restart the API
```bash
# Restart to apply the new CORS settings
fly apps restart heya-pos-api
```

### 6. Test the Apps
1. Visit your booking app URL
2. Check browser console for CORS errors
3. Test a booking flow

## Troubleshooting

### Check API Health
```bash
curl https://heya-pos-api.fly.dev/api/v1/auth/health
```

### Check CORS Headers
```bash
# Test CORS preflight
curl -X OPTIONS https://heya-pos-api.fly.dev/api/v1/public/services \
  -H "Origin: https://your-booking-app.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

### View API Logs
```bash
fly logs -a heya-pos-api
```

### Common Issues

1. **CORS Error**: Make sure your frontend URL is in the FRONTEND_URLS environment variable
2. **404 Errors**: Check that you're using `/api/v1/` or `/api/v2/` prefixes correctly
3. **Connection Refused**: Ensure the API is running on Fly.io

## Alternative: Custom Domains

If you have custom domains (e.g., booking.yourcompany.com):
1. Add them to Vercel
2. Update FRONTEND_URLS with the custom domains
3. Update DNS to point to Vercel

## Quick Debug Commands

```bash
# Check current secrets on Fly.io
fly secrets list -a heya-pos-api

# SSH into the API container
fly ssh console -a heya-pos-api

# Check environment inside container
fly ssh console -a heya-pos-api -C "env | grep FRONTEND"
```