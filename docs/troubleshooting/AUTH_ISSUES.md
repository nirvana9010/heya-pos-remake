# Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. "User not authenticated" (403 Forbidden)

**Symptom**: All API endpoints return 403 with "User not authenticated"

**Root Cause**: Guard execution order problem
- Global guards run BEFORE controller guards
- PermissionsGuard was global and ran before JwtAuthGuard

**Solution**:
```typescript
// ❌ WRONG - Don't use global PermissionsGuard
@Module({
  providers: [{
    provide: APP_GUARD,
    useClass: PermissionsGuard,
  }]
})

// ✅ CORRECT - Use guards in correct order on controllers
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)  // JWT first, then Permissions
```

### 2. "Cannot GET /api/api/customers" (Double API prefix)

**Symptom**: 404 errors with doubled API prefix

**Root Cause**: Controllers had 'api' in their path
```typescript
@Controller('api/customers')  // ❌ Wrong - causes /api/api/customers
```

**Solution**:
```typescript
@Controller('customers')  // ✅ Correct - results in /api/customers
```

### 3. PIN Required After Login

**Symptom**: Redirected to PIN page after merchant login

**Solution**: Remove PIN checks from frontend routing
```typescript
// In page.tsx and dashboard/page.tsx
// Remove: if (!pinVerified) router.push('/pin')
```

## Testing Authentication

### Quick Test Command
```bash
# Get token and test endpoint
curl -H "Authorization: Bearer $(curl -X POST http://localhost:3000/api/auth/merchant/login -H "Content-Type: application/json" -d '{"username": "luxeadmin", "password": "testpassword123"}' -s | jq -r .token)" http://localhost:3000/api/auth/me
```

### Debug Endpoint
Added `/api/debug/auth` to check if user is attached:
```typescript
@Get('debug/auth')
@UseGuards(JwtAuthGuard)
debugAuth(@Req() req: any, @CurrentUser() user: any) {
  return {
    hasUser: !!req.user,
    hasSession: !!req.session,
    user: req.user,
    currentUser: user
  };
}
```

## Prevention

1. Always test guard order with a simple endpoint first
2. Never make PermissionsGuard global
3. Use debug endpoints to verify auth flow
4. Check controller paths don't duplicate the global prefix