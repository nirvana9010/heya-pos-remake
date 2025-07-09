# CORS Configuration Debug Guide for booking.heyapos.com

## Current Issue
The API won't load when accessing from the new domain `booking.heyapos.com`. 

## Root Cause Analysis

### 1. CORS Configuration in API (main.ts)
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(url => url.trim())
  : true;
```

- In **development mode** (`NODE_ENV=development`): CORS allows ALL origins
- In **production mode** (`NODE_ENV=production`): CORS only allows origins listed in `FRONTEND_URLS`

### 2. Current Status
- API is running in **development mode** locally
- On Railway, you need to ensure:
  1. `NODE_ENV=production` 
  2. `FRONTEND_URLS` includes `https://booking.heyapos.com`

## Solution Steps

### For Local Development
If you want to test with specific CORS restrictions locally:

1. Update your `apps/api/.env` file:
```bash
NODE_ENV=production
FRONTEND_URLS=http://localhost:3002,http://localhost:3003,http://localhost:3004,https://booking.heyapos.com
```

2. Restart the API:
```bash
pm2 delete api && pm2 start ecosystem.config.js --only api
```

### For Production (Railway)

1. **Check Current Configuration**
   - Ensure `NODE_ENV=production` is set
   - Ensure `FRONTEND_URLS` includes all your domains

2. **Correct FRONTEND_URLS Format**
   ```
   FRONTEND_URLS=https://heya-pos-merchant.vercel.app,https://heya-pos-booking.vercel.app,https://heya-pos-admin.vercel.app,https://booking.heyapos.com
   ```
   
   **Important**: 
   - No spaces between URLs
   - Include full protocol (https://)
   - Comma-separated list
   - No trailing slashes

3. **Verify the Configuration**
   After updating Railway environment variables, the API should automatically redeploy. You can verify CORS is working by:
   
   a. Check browser console for CORS errors
   b. Use the test script: `node scripts/test-cors.js`
   c. Check response headers in browser DevTools Network tab

## Common Issues and Solutions

### Issue 1: "CORS error" in browser console
**Solution**: 
- Verify `FRONTEND_URLS` includes your domain
- Check for typos in the domain name
- Ensure no trailing slashes in URLs

### Issue 2: API returns 404 or connection refused
**Solution**:
- This is not a CORS issue
- Check if API is running and accessible
- Verify API URL is correct in your frontend app

### Issue 3: Preflight requests failing
**Solution**:
- Check that `X-Merchant-Subdomain` header is allowed (it is in current config)
- Verify OPTIONS method is allowed (it is in current config)

## Testing CORS Configuration

1. **Browser Test**
   - Open DevTools Network tab
   - Look for OPTIONS (preflight) requests
   - Check response headers for `Access-Control-Allow-Origin`

2. **Command Line Test**
   ```bash
   # Test preflight
   curl -X OPTIONS https://your-api-url.railway.app/api/public/merchant-info \
     -H "Origin: https://booking.heyapos.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: content-type,x-merchant-subdomain" \
     -v
   ```

3. **Use Test Script**
   ```bash
   API_URL=https://your-api-url.railway.app node scripts/test-cors.js
   ```

## SSE (Server-Sent Events) Considerations

The SSE endpoint (`/api/merchant/notifications/stream`) has its own CORS headers:
```typescript
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Credentials': 'true',
```

This allows all origins for SSE connections, which is generally fine since authentication is handled via JWT token.

## Recommended Production Configuration

For Railway, set these environment variables:
```
NODE_ENV=production
FRONTEND_URLS=https://heya-pos-merchant.vercel.app,https://heya-pos-booking.vercel.app,https://heya-pos-admin.vercel.app,https://booking.heyapos.com,https://merchant.heyapos.com,https://admin.heyapos.com
```

This allows both your current Vercel deployments and your new custom domains.