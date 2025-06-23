# Production Deployment Fix Guide

## Issue: "Unexpected token '<'" Error for iclient-with-ui-v1.js

This error occurs when the browser requests a JavaScript file but receives HTML (typically a 404 page) instead.

### Root Causes
1. Static files in Next.js `public` folder not being served correctly in production
2. Incorrect path resolution for static assets
3. Missing or misconfigured headers for JavaScript files

### Solutions Applied

#### 1. Updated Layout to Use Next.js Script Component
- Changed from `<script src="/js/iclient-with-ui-v1.js">` to using Next.js `Script` component
- Added error handling for failed script loads
- Made path configurable via environment variable

#### 2. Added Headers Configuration
- Created `public/_headers` file for Vercel/Netlify deployments
- Updated Next.js config to set proper Content-Type headers for JS files
- Added cache headers for better performance

#### 3. Environment Configuration
- Created `.env.production.example` with necessary variables
- `NEXT_PUBLIC_BASE_URL`: Set if app is served from a different domain/subdirectory
- `NEXT_PUBLIC_API_URL`: Must point to your production API

### Deployment Steps

1. **Set Environment Variables**
   ```bash
   # Copy and configure production environment
   cp apps/merchant-app/.env.production.example apps/merchant-app/.env.production.local
   # Edit the file with your production values
   ```

2. **Build the Application**
   ```bash
   cd apps/merchant-app
   npm run build
   ```

3. **For Vercel Deployment**
   - The `_headers` file will be automatically processed
   - Ensure environment variables are set in Vercel dashboard

4. **For Custom Server/Docker**
   - Ensure your web server (nginx/apache) serves the `public` folder correctly
   - Add this nginx configuration:
   ```nginx
   location /js/ {
     alias /path/to/merchant-app/.next/static/;
     add_header Cache-Control "public, max-age=31536000, immutable";
     add_header Content-Type "application/javascript";
   }
   ```

5. **For Subdirectory Deployment**
   If your app is served from a subdirectory (e.g., https://domain.com/merchant/):
   - Set `NEXT_PUBLIC_BASE_URL=/merchant` in production
   - Update nginx/reverse proxy to handle the path correctly

### Testing Production Build Locally

```bash
# Build and start production server
cd apps/merchant-app
npm run build
npm start

# In another terminal, test the file is accessible
curl -I http://localhost:3002/js/iclient-with-ui-v1.js
# Should return 200 OK with Content-Type: application/javascript
```

### Login Issues

The login issues are likely related to:
1. API URL mismatch - ensure `NEXT_PUBLIC_API_URL` points to correct production API
2. CORS configuration - API must allow requests from production domain
3. Missing payment SDK - the iclient-with-ui-v1.js error prevents login if payment processing is required

### Troubleshooting

1. **Check browser console for exact error**
   - Network tab: Is iclient-with-ui-v1.js returning 404?
   - Console: Any CORS or API connection errors?

2. **Verify static file serving**
   ```bash
   # On production server
   curl https://your-domain.com/js/iclient-with-ui-v1.js
   # Should return JavaScript content, not HTML
   ```

3. **Check build output**
   - Ensure `public/js/iclient-with-ui-v1.js` is included in `.next/standalone/apps/merchant-app/public/`

4. **For reverse proxy setups**
   - Ensure proxy passes through `/js/*` requests correctly
   - Check proxy logs for 404 errors