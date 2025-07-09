# CORS Debugging Guide for booking.heyapos.com

## Problem
API won't load when accessing from the new domain booking.heyapos.com

## What We Know
1. The domain has been added to Vercel
2. FRONTEND_URLS on Railway has been updated (according to user)
3. The API uses CORS restrictions in production mode

## Quick Checks

### 1. Browser Network Tab
Open booking.heyapos.com and check the Network tab:
- Look for failed API requests (usually red)
- Click on a failed request and check the "Response Headers"
- Look for `access-control-allow-origin` header
- Check the Console for CORS error messages

### 2. Direct API Test
Try accessing the API directly:
```
https://heya-pos-remake-production.up.railway.app/api/health
```
This should return: `{"status":"ok"}`

### 3. Railway Configuration Check
In Railway dashboard:
1. Go to your API service
2. Click on "Variables" tab
3. Verify FRONTEND_URLS includes:
   - The exact URL including https://
   - No trailing slashes
   - Comma-separated with no spaces

### 4. Common Issues

#### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solution**: FRONTEND_URLS is not properly configured on Railway

#### Issue: "CORS policy: The request client is not a secure context"
**Solution**: Make sure you're using https:// not http://

#### Issue: API returns 404 or network error
**Solution**: Check if the API URL is correct in the booking app's production environment

### 5. Manual CORS Test
From your terminal:
```bash
curl -X OPTIONS https://heya-pos-remake-production.up.railway.app/api/health \
  -H "Origin: https://booking.heyapos.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Look for this header in the response:
```
access-control-allow-origin: https://booking.heyapos.com
```

### 6. Temporary Workaround
If you need to test immediately while debugging, you can:
1. Use a browser extension to disable CORS (for testing only!)
2. Access via the original Vercel URL that's already working

### 7. Railway Deployment Check
After updating FRONTEND_URLS:
1. Railway should automatically redeploy
2. Check the deployment logs for any errors
3. Wait 2-3 minutes for the changes to propagate

## If Everything Looks Correct
If FRONTEND_URLS is properly configured but still not working:

1. **Check for typos**: Even a small typo in the URL will cause CORS to fail
2. **Check SSL certificate**: Make sure booking.heyapos.com has a valid SSL certificate
3. **Clear browser cache**: Sometimes old CORS headers are cached
4. **Try incognito mode**: To rule out browser extensions or cache issues

## Need More Help?
Share the following information:
1. Exact error message from browser console
2. Screenshot of failed network request headers
3. The exact value of FRONTEND_URLS from Railway dashboard