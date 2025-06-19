# Persistent Login Implementation Guide

## Overview
This guide explains how the safe persistent login system works in Heya POS after fixing the memory leak issues.

## What Was Implemented

### 1. **Automatic Token Refresh**
- Access tokens expire in 15 minutes (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens expire in 7-30 days depending on "Remember Me" option
- API client automatically refreshes tokens when they expire
- Proactive refresh occurs 5 minutes before token expiry

### 2. **Remember Me Feature**
- Checkbox on login page allows users to stay logged in longer
- When checked: Refresh tokens last 30 days
- When unchecked: Refresh tokens last 7 days
- Preference stored in localStorage

### 3. **Memory Leak Fixes**
- **Session timeout reduced**: From 365 days to 24 hours
- **Session limits added**: 
  - Max 10,000 total sessions
  - Max 10 sessions per user
  - Automatic cleanup of oldest sessions
- **Memory monitoring**: Tracks and limits operation counts

### 4. **How It Works**

#### Login Flow:
1. User logs in with username/password
2. If "Remember Me" is checked, longer refresh token issued
3. Both access and refresh tokens stored in localStorage
4. Proactive refresh scheduled based on token expiry

#### Token Refresh Flow:
1. When API call gets 401 error:
   - Interceptor catches the error
   - Attempts to refresh using refresh token
   - Retries original request with new access token
2. Proactive refresh runs 5 minutes before expiry
3. Failed refresh redirects to login

#### Security Features:
- Short-lived access tokens (15 minutes)
- Refresh token rotation on each refresh
- Automatic session cleanup
- Per-user session limits

## Configuration

### Environment Variables
```env
# Token expiry settings
JWT_EXPIRES_IN=15m                    # Access token expiry
JWT_REFRESH_EXPIRES_IN=7d             # Default refresh token expiry
JWT_REFRESH_EXPIRES_IN_REMEMBER=30d   # Remember Me refresh token expiry

# Session management
SESSION_TIMEOUT_HOURS=24              # In-memory session timeout
MAX_SESSIONS=10000                    # Maximum total sessions
MAX_SESSIONS_PER_USER=10              # Maximum sessions per user
```

### Frontend Usage
```typescript
// Login with Remember Me
const response = await apiClient.login(username, password, rememberMe);

// API calls automatically handle token refresh
const data = await apiClient.getBookings(); // Will refresh if needed
```

## Best Practices

1. **Never store sensitive data in localStorage**
   - Only store tokens and non-sensitive user info
   - Consider using httpOnly cookies in production

2. **Monitor memory usage**
   - Run `npm run start:heap-profile` to monitor memory
   - Check heap snapshots if memory grows

3. **Regular token rotation**
   - Tokens are rotated on each refresh
   - Old tokens become invalid immediately

4. **Session cleanup**
   - Runs every 5 minutes automatically
   - Removes expired sessions
   - Prevents memory bloat

## Testing

### Test persistent login:
```bash
# 1. Start API with memory monitoring
cd heya-pos/apps/api
npm run start:no-watch

# 2. Login with Remember Me checked
# 3. Wait for token to expire (15 minutes)
# 4. Make an API call - should auto-refresh
# 5. Check console for refresh logs
```

### Test memory usage:
```bash
# Run memory test
cd heya-pos/apps/api
./run-memory-test.sh

# In another terminal
NODE_OPTIONS='--expose-gc' ts-node test-memory-leak.ts
```

## Security Considerations

1. **Token Storage**: Currently using localStorage (vulnerable to XSS)
   - Consider httpOnly cookies for production
   - Add CSRF protection if using cookies

2. **Refresh Token Security**: 
   - Not yet stored in database (still using JWT)
   - Consider database storage for ability to revoke

3. **Session Tracking**:
   - No device fingerprinting yet
   - Consider adding for better security

## Future Improvements

1. **Database Storage for Refresh Tokens**
   - Track devices/sessions
   - Allow users to see active sessions
   - Revoke specific sessions

2. **Better Token Storage**
   - Implement secure httpOnly cookies
   - Add CSRF protection
   - Consider encrypted localStorage

3. **Enhanced Security**
   - Add device fingerprinting
   - Implement refresh token families
   - Add suspicious activity detection