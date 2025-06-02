# API Testing Learnings - June 2, 2025

## Key Mistakes and Learnings

### 1. Wrong API Port
**Mistake**: Assumed API was on port 3001 (same as booking app)
**Reality**: API runs on port 3000 (check `.env` file!)
```bash
# Wrong
const API_URL = 'http://localhost:3001/api';

# Correct
const API_URL = 'http://localhost:3000/api';
```

### 2. Wrong Login Credentials Format
**Mistake**: Used email-based login format from UI
```javascript
// Wrong - UI format
{
  email: 'sarah@hamiltonbeauty.com',
  password: 'Test1234!',
  merchantIdentifier: 'hamilton-main'
}
```

**Reality**: API expects username-based format
```javascript
// Correct - API format
{
  username: 'HAMILTON',  // Merchant username, NOT email
  password: 'demo123'    // Check seed files for actual password
}
```

### 3. TypeScript Type Errors
**Mistake**: Used untyped axios responses
**Solution**: Always type axios responses
```typescript
interface LoginResponse {
  token: string;
  refreshToken: string;
  user: any;
}

const response = await axios.post<LoginResponse>(...);
```

### 4. Database Schema Assumptions
**Mistake**: Assumed fields exist without checking schema
- Assumed `MerchantAuth` has `isActive` field (it doesn't)
- Assumed `Merchant` has `businessName` and `identifier` (actually `name` and `subdomain`)

**Solution**: Always check schema first:
```bash
grep -n "model ModelName" prisma/schema.prisma
```

### 5. Missing Data Issues
**Finding**: Database was empty because seed hadn't run
**Solution**: Run appropriate seed file
```bash
# Basic seed
npx prisma db seed

# Comprehensive seed with bookings
npx ts-node prisma/seed-hamilton-comprehensive.ts
```

### 6. Timezone Issues
**Finding**: Bookings stored in UTC, displayed in local time
- Australian Eastern Time (UTC+10)
- June 1 12:00 PM local = June 1 02:00 AM UTC
- This affects date filtering

## Correct Testing Approach

1. **Check what's running**:
```bash
ps aux | grep -E "nest|next" | grep -v grep
```

2. **Check ports and config**:
```bash
cat apps/api/.env | grep PORT
```

3. **Check database state**:
```bash
# Create a simple check script
npx ts-node test/check-merchants.ts
```

4. **Find correct credentials**:
```bash
grep -A5 -B5 "merchantAuth" prisma/seed*.ts
```

5. **Test API directly**:
```bash
# Use typed TypeScript test scripts, not curl
npx ts-node test/test-api.ts
```

## For Future Reference

When debugging API issues:
1. ALWAYS check `.env` for ports
2. ALWAYS check seed files for credentials
3. ALWAYS check schema before assuming fields
4. ALWAYS type axios responses
5. ALWAYS verify data exists in database
6. ALWAYS consider timezone differences

The merchant login uses:
- Username: `HAMILTON` (uppercase merchant identifier)
- Password: `demo123` (from seed file)
- Endpoint: `http://localhost:3000/api/auth/merchant/login`