# Subdomain Deployment Guide

This guide explains how to deploy the Heya POS booking app with subdomain-based merchant detection for production.

## Overview

The booking app supports three merchant detection modes:
- **subdomain**: `hamilton.bookings.example.com` (production)
- **path**: `bookings.example.com/hamilton` (development)
- **query**: `bookings.example.com?merchant=hamilton` (testing)

## Prerequisites

1. A domain name (e.g., `heya-pos.com`)
2. DNS management access
3. A hosting platform that supports wildcard subdomains (Vercel, Netlify, Railway, etc.)

## Configuration Steps

### 1. Environment Variables

Set the following in your production environment:

```env
# Enable subdomain detection mode
NEXT_PUBLIC_MERCHANT_DETECTION_MODE=subdomain

# API configuration
NEXT_PUBLIC_API_URL=https://api.heya-pos.com/api
```

### 2. DNS Configuration

Add the following DNS records:

```
# Main booking app
bookings.heya-pos.com    A    192.0.2.1  # Your hosting IP

# Wildcard subdomain for merchants
*.bookings.heya-pos.com  A    192.0.2.1  # Same IP
```

For Vercel/Netlify, use CNAME records instead:
```
bookings.heya-pos.com     CNAME  your-app.vercel.app
*.bookings.heya-pos.com   CNAME  your-app.vercel.app
```

### 3. Platform-Specific Configuration

#### Vercel

1. Add domain in Vercel dashboard:
   - `bookings.heya-pos.com`
   - `*.bookings.heya-pos.com`

2. In `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/:path*"
    }
  ]
}
```

#### Netlify

1. Add domain in Netlify dashboard
2. Enable wildcard subdomain support
3. No additional configuration needed

#### Railway

1. Add custom domain in Railway dashboard
2. Configure wildcard subdomain support via Railway CLI:
```bash
railway domain add *.bookings.heya-pos.com
```

### 4. SSL/TLS Certificates

Most platforms automatically provision SSL certificates for wildcard domains. Ensure:
- Certificate covers `*.bookings.heya-pos.com`
- Force HTTPS redirect is enabled

### 5. Testing

After deployment, test with different merchants:
- `hamilton.bookings.heya-pos.com`
- `zen-wellness.bookings.heya-pos.com`

## Migration from Path-Based to Subdomain

To migrate existing bookings:

1. Set up redirects from old URLs to new:
   ```
   /hamilton/* → hamilton.bookings.heya-pos.com/*
   ```

2. Update merchant communications with new URLs

3. Keep both modes active during transition:
   - Deploy with path mode first
   - Test thoroughly
   - Switch to subdomain mode
   - Monitor for issues

## Troubleshooting

### Subdomain Not Detected

1. Check middleware logs
2. Verify DNS propagation: `dig hamilton.bookings.heya-pos.com`
3. Ensure environment variable is set correctly

### SSL Certificate Issues

1. Verify wildcard certificate is active
2. Check certificate covers the subdomain
3. Clear browser cache and retry

### Merchant Not Found

1. Verify merchant subdomain exists in database
2. Check merchant status is ACTIVE
3. Review API logs for errors

## Security Considerations

1. **Subdomain Isolation**: Each merchant gets isolated subdomain
2. **CORS Configuration**: Update API CORS to allow wildcard subdomains
3. **Cookie Scope**: Set cookies with proper domain scope
4. **Content Security Policy**: Update CSP headers for subdomains

## API CORS Configuration

Update your API to accept requests from wildcard subdomains:

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: (origin, callback) => {
    // Allow all subdomains of bookings.heya-pos.com
    if (!origin || origin.match(/^https?:\/\/([a-z0-9-]+\.)?bookings\.heya-pos\.com$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
});
```

## Monitoring

Set up monitoring for:
1. Subdomain resolution time
2. SSL certificate expiration
3. 404 errors for invalid subdomains
4. API response times per merchant

## Rollback Plan

If issues arise:
1. Switch `NEXT_PUBLIC_MERCHANT_DETECTION_MODE` back to `path`
2. Deploy immediately (no code changes needed)
3. Users can continue with path-based URLs
4. Fix issues and retry subdomain deployment