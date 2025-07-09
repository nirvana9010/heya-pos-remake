# Railway CORS Configuration Checklist

## The Problem
The API is not sending the `access-control-allow-origin` header for requests from `https://booking.heyapos.com`.

## Root Cause
Based on the CORS test, the API is not recognizing `https://booking.heyapos.com` as an allowed origin, which means:

1. The `FRONTEND_URLS` environment variable on Railway either:
   - Doesn't include `https://booking.heyapos.com`
   - Has a typo or formatting issue
   - Hasn't been deployed/restarted after the change

## Action Steps

### 1. Verify Railway Environment Variables

In your Railway dashboard:

1. Go to your API service
2. Click on "Variables" tab
3. Find `FRONTEND_URLS` (note: it's plural, not `FRONTEND_URL`)
4. Verify it contains EXACTLY this (you can copy-paste):

```
https://heya-pos-merchant.vercel.app,https://heya-pos-booking.vercel.app,https://heya-pos-admin.vercel.app,https://booking.heyapos.com,https://merchant.heyapos.com,https://admin.heyapos.com
```

**Important**: 
- No spaces between URLs
- Include `https://` protocol
- No trailing slashes
- Comma-separated

### 2. Check for Multiple Environment Variables

Make sure you don't have both:
- `FRONTEND_URL` (singular)
- `FRONTEND_URLS` (plural)

The code uses `FRONTEND_URLS` first, then falls back to `FRONTEND_URL`. Having both might cause confusion.

### 3. Force Redeployment

After verifying/updating the environment variable:

1. In Railway, go to your API service
2. Click on "Deployments" tab
3. Click on the three dots on the latest deployment
4. Select "Redeploy" to force a fresh deployment

### 4. Alternative: Add Debug Logging

If you want to see what the API is actually receiving, you can temporarily add this to `apps/api/src/main.ts` after line 66:

```typescript
console.log('CORS Debug - NODE_ENV:', process.env.NODE_ENV);
console.log('CORS Debug - FRONTEND_URLS:', process.env.FRONTEND_URLS);
console.log('CORS Debug - Parsed origins:', allowedOrigins);
```

Then check the Railway logs after deployment.

### 5. Quick Workaround

While debugging, you can test if everything else works by:

1. Using the original Vercel URL: https://heya-pos-remake-booking-app.vercel.app/
2. Or temporarily set NODE_ENV to development (NOT recommended for production)

## Verification

After updating and redeploying, test with:

```bash
curl -X GET https://heya-pos-remake-production.up.railway.app/api/v1/public/merchant-info?subdomain=orange-nails-beauty \
  -H "Origin: https://booking.heyapos.com" \
  -v 2>&1 | grep "access-control-allow-origin"
```

You should see:
```
< access-control-allow-origin: https://booking.heyapos.com
```

## Common Issues

1. **Typo in URL**: Even `http://` vs `https://` will cause CORS to fail
2. **Trailing slash**: `https://booking.heyapos.com/` is different from `https://booking.heyapos.com`
3. **Environment variable not saved**: Make sure to click "Save" or "Deploy" after updating
4. **Old deployment still running**: Railway might need a force redeploy
5. **CloudFlare or proxy**: If using CloudFlare, make sure it's not stripping headers