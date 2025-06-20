# Production Security Checklist

## PIN Protection

### Before Deploying to Production

- [ ] **Remove hardcoded demo PINs**
  - Search for: `pin === "1234"`
  - Remove all demo PIN validation code
  - Ensure only API validation remains

- [ ] **Implement PIN verification endpoint**
  - `POST /api/v1/auth/verify-pin`
  - Validate against hashed PINs in database
  - Implement rate limiting
  - Track failed attempts

- [ ] **Remove development hints**
  - All `process.env.NODE_ENV === 'development'` checks working
  - No PIN hints in production
  - No debug console logs in production

- [ ] **Security headers**
  - No sensitive data in console.log
  - No PIN values in error messages
  - No PIN stored in localStorage

### PIN Storage Requirements

1. **Database Schema**
   ```sql
   user_pins (
     user_id UUID,
     pin_hash VARCHAR(255),
     failed_attempts INT DEFAULT 0,
     locked_until TIMESTAMP,
     last_changed TIMESTAMP,
     created_at TIMESTAMP
   )
   ```

2. **API Implementation**
   ```typescript
   // Verify PIN endpoint
   POST /api/v1/auth/verify-pin
   {
     "pin": "string",
     "feature": "reports|refunds|cancellations"
   }
   
   Response:
   {
     "valid": boolean,
     "attemptsRemaining": number
   }
   ```

3. **Security Rules**
   - PINs must be 4-8 digits
   - Hash using bcrypt or similar
   - Lock after 3 failed attempts
   - 15-minute lockout period
   - Force PIN change every 90 days

### Environment-Specific Code

All development-only code is wrapped in:
```javascript
if (process.env.NODE_ENV === 'development') {
  // Development only code
}
```

This includes:
- Demo PIN validation
- PIN hints in UI
- Debug console logs
- Test endpoints

### Testing Production Build

1. **Build for production**
   ```bash
   NODE_ENV=production npm run build
   ```

2. **Test PIN protection**
   - No demo hints visible
   - Demo PIN (1234) rejected
   - Only API validation works
   - No debug logs in console

3. **Security audit**
   ```bash
   # Search for hardcoded values
   grep -r "1234" --include="*.js" --include="*.tsx" dist/
   
   # Check for console.log
   grep -r "console.log.*[Pp][Ii][Nn]" dist/
   ```

### PIN Management UI (TODO)

- [ ] PIN setup screen for new users
- [ ] PIN change functionality
- [ ] Forgot PIN flow
- [ ] Admin PIN reset capability
- [ ] PIN complexity requirements
- [ ] PIN history (prevent reuse)

### Audit Trail (TODO)

- [ ] Log all PIN verifications
- [ ] Track access to protected features
- [ ] Record failed attempts
- [ ] Alert on suspicious activity

### Additional Security Layers

1. **Two-Factor Authentication**
   - SMS verification for PIN reset
   - Email confirmation for sensitive changes

2. **Biometric Support**
   - Fingerprint as PIN alternative
   - Face ID integration (mobile)

3. **Time-Based Restrictions**
   - Limit access to business hours
   - Require additional auth outside hours

4. **IP Whitelisting**
   - Restrict PIN-protected features to known IPs
   - Require extra verification from new locations

### Compliance Considerations

- [ ] PCI compliance for payment-related PINs
- [ ] GDPR compliance for PIN storage
- [ ] Audit logs retention policy
- [ ] User consent for biometric data
- [ ] Right to deletion includes PIN data

### Emergency Procedures

1. **Compromised PIN**
   - Immediate lockout capability
   - Force PIN reset on next login
   - Notify user of security event

2. **System-Wide Reset**
   - Script to force all users to reset PINs
   - Temporary lockout during security incident
   - Communication plan to users

### Monitoring

- [ ] Alert on multiple failed PIN attempts
- [ ] Monitor for brute force patterns
- [ ] Track unusual access patterns
- [ ] Regular security audits

---

## Final Checklist Before Go-Live

- [ ] All demo code removed/disabled in production
- [ ] PIN verification API fully tested
- [ ] Rate limiting implemented
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] Penetration testing completed
- [ ] User training materials ready
- [ ] Support team briefed on PIN issues
- [ ] Rollback plan prepared