# Authentication Redirect Fix

## Problem
When resuming a session after auth expires (e.g., next day), users were getting stuck on a "Redirecting to login..." screen instead of being properly redirected to the login page.

## Root Cause
The authentication flow had several issues:
1. The `UNAUTHORIZED_REDIRECT` error was thrown to stop execution but wasn't handled properly
2. The redirect logic in `AuthGuard` could fail silently
3. No fallback mechanism if Next.js router failed
4. The global redirect flag could get stuck as `true`

## Solution Implemented

### 1. Enhanced AuthGuard Component
- Added try-catch around `router.replace()` with fallback to `window.location.href`
- Added 3-second timeout fallback if redirect fails
- Added manual "click here" link for users
- Better state management with `showRedirectMessage`

### 2. Clear Redirect Flag on Login Page
- Login page now clears `__AUTH_REDIRECT_IN_PROGRESS__` flag on mount
- Prevents the flag from staying stuck if navigation fails

### 3. Improved Error Handling
- Multiple fallback mechanisms ensure users can always get to login
- Better console logging for debugging redirect issues

## How It Works Now

1. **Session Expires**:
   - API returns 401/403
   - BaseClient dispatches `auth:unauthorized` event
   - AuthProvider clears auth state

2. **Redirect Process**:
   - AuthGuard detects unauthenticated state
   - Shows "Redirecting..." message
   - Attempts redirect via Next.js router
   - If router fails, falls back to `window.location`
   - If still stuck after 3 seconds, forces navigation
   - Shows clickable link as last resort

3. **Cleanup**:
   - Login page clears redirect flag
   - Timeouts are properly cleaned up
   - No more stuck states

## User Experience
- Smooth redirect when session expires
- Multiple fallbacks ensure login page is reached
- Clear messaging if redirect is delayed
- Manual override available if needed

## Testing
1. Clear all auth data: `localStorage.clear()`
2. Visit any protected page
3. Should redirect to login within 3 seconds
4. If not, manual link is available