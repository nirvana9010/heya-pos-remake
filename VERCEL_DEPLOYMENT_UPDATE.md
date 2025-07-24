# Vercel Deployment Update Guide

## Update Environment Variables

You need to update the following environment variables in Vercel for each app:

### For Merchant App
In Vercel Dashboard > Project Settings > Environment Variables:

```
NEXT_PUBLIC_API_URL=https://heya-pos-api.fly.dev/api
```

**Important**: 
- The URL MUST include `/api` at the end
- The BaseApiClient will automatically add the version prefix (/v1)
- Do NOT include trailing slash
- The full login URL will be: https://heya-pos-api.fly.dev/api/v1/auth/merchant/login

### For Booking App
```
NEXT_PUBLIC_API_URL=https://heya-pos-api.fly.dev/api
```

### For Admin Dashboard
```
NEXT_PUBLIC_API_URL=https://heya-pos-api.fly.dev/api
```

## Verification

After updating, you can verify the API is accessible:

1. Health check: https://heya-pos-api.fly.dev/api/v1/health
2. Auth endpoints will be at: https://heya-pos-api.fly.dev/api/v1/auth/*
3. Other endpoints: https://heya-pos-api.fly.dev/api/v1/[resource]

## Troubleshooting

If you still get network errors:
1. Check browser console for the exact URL being called
2. Ensure no trailing slashes in the environment variable
3. Redeploy the Vercel app after updating environment variables