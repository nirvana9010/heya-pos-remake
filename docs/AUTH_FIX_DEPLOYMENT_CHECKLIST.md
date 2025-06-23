# Authentication Fix Deployment Checklist

## Why These Changes?
The production auth/redirect issues were caused by:
1. Middleware intercepting static files (like `/js/iclient-with-ui-v1.js`)
2. Inconsistent cookie naming (`authToken` vs `auth-token`)
3. Vercel Edge Runtime compatibility issues
4. No caching of JWT verification results

## What We Fixed
1. **Middleware Matcher**: Now properly excludes ALL static assets
2. **Cookie Naming**: Standardized to use only `authToken`
3. **Performance**: Added request-level caching for JWT verification
4. **Vercel Compatibility**: Used explicit matcher pattern that works with Edge Runtime

## Pre-Deployment Testing

### 1. Local Testing
```bash
cd apps/merchant-app

# Start the dev server
npm run dev

# In another terminal, run the test script
node scripts/test-auth-middleware.js

# Manual tests
curl -I http://localhost:3002/js/iclient-with-ui-v1.js  # Should return 200
curl -I http://localhost:3002/calendar  # Should return 302/307 redirect to /login
```

### 2. Build Testing
```bash
# Build the app
npm run build

# Start production build locally
npm start

# Run tests again
TEST_URL=http://localhost:3002 node scripts/test-auth-middleware.js
```

### 3. Vercel Preview Testing
After pushing to a branch:
```bash
# Test on Vercel preview URL
TEST_URL=https://heya-pos-remake-merchant-app-[branch]-[hash].vercel.app node scripts/test-auth-middleware.js
```

## Deployment Steps

### 1. Pre-Deployment Checks
- [ ] All local tests pass
- [ ] Build completes without errors
- [ ] Preview deployment tests pass
- [ ] Check Vercel build logs for any warnings

### 2. Deploy to Production
```bash
# Commit the changes
git add apps/merchant-app/src/middleware.ts
git add apps/merchant-app/scripts/test-auth-middleware.js
git add docs/AUTH_FIX_DEPLOYMENT_CHECKLIST.md
git commit -m "fix: Comprehensive auth middleware fix for static file serving and Vercel compatibility"

# Push to main (or your production branch)
git push origin main
```

### 3. Post-Deployment Verification
```bash
# Test production
TEST_URL=https://heya-pos-remake-merchant-app.vercel.app node scripts/test-auth-middleware.js

# Manual verification
curl -I https://heya-pos-remake-merchant-app.vercel.app/js/iclient-with-ui-v1.js  # Should return 200
```

### 4. Monitor for Issues
- Check Vercel Functions logs for any errors
- Monitor browser console for any auth-related errors
- Test login flow completely

## If Issues Occur
1. Check Vercel Function logs
2. Verify environment variables are set correctly
3. Check if `JWT_SECRET` matches between API and merchant app
4. Ensure cookies are being set with correct domain/path

## Cookie Cleanup (if needed)
If users have old `auth-token` cookies, they might need to clear cookies:
- Add a notice on login page
- Or add temporary code to clear old cookie names

## Success Criteria
- [ ] `/js/iclient-with-ui-v1.js` loads without redirect (200 status)
- [ ] Login flow works correctly
- [ ] Protected routes redirect to login when not authenticated
- [ ] No "Unexpected token '<'" errors in console
- [ ] Static assets load properly

## Long-term Improvements
1. Add monitoring for 404s on static assets
2. Set up alerts for authentication failures
3. Consider using Edge Config for dynamic route protection
4. Add integration tests for auth flow