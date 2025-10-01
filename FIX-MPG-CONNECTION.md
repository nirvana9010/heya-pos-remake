# MPG Database Connection Fix

## Issue Resolved (August 4, 2025)

### Problem
The production API was incorrectly connected to a development database copy (`heya-pos-db`) instead of the production Managed Postgres (MPG) cluster. This caused:
- Admin dashboard showing development data in production
- Data isolation breach between development and production environments
- "Orange Nails Maddingley" test merchant appearing in production

### Root Cause
The API's DATABASE_URL was pointing to `heya-pos-db.flycast` which was actually a copy of the development database, not the production MPG cluster (`gjpkdon1pn60yln4`).

### Solution
Fixed the DATABASE_URL to use the MPG cluster's internal IPv6 address:

```bash
# Correct production DATABASE_URL for MPG cluster
DATABASE_URL='postgresql://fly-user:Q3PtuT5LzerofXvatBTh5Yna@[fdaa:22:d57d:0:1::4]:5432/fly-db?sslmode=disable'
```

### Key Findings
1. **External hostname doesn't work**: `pgbouncer.gjpkdon1pn60yln4.flympg.net` fails from within Fly.io network
2. **Internal IPv6 works**: `[fdaa:22:d57d:0:1::4]` connects successfully
3. **Database isolation restored**: Production now uses MPG (8 merchants), development uses postgres-flex (9 merchants)

### Commands Used
```bash
# Set the correct DATABASE_URL
flyctl secrets set DATABASE_URL='postgresql://fly-user:Q3PtuT5LzerofXvatBTh5Yna@[fdaa:22:d57d:0:1::4]:5432/fly-db?sslmode=disable' -a heya-pos-api

# Verify MPG cluster status
flyctl mpg status gjpkdon1pn60yln4

# Check connection
curl https://heya-pos-api.fly.dev/api/v1/admin/merchants | jq 'length'
# Should return: 8 (production merchant count)
```

### Verification
- Production MPG: 8 merchants ✅
- Development DB: 9 merchants (includes test data) ✅
- Admin dashboard: Shows only production data ✅

## Update (October 1, 2025)
- Production database moved to new MPG cluster `w86750824lj03pk4` (restored snapshot).
- Internal IPv6: `[fdaa:22:d57d:0:1::22]`
- Credentials (as of snapshot): `fly-user / 34jaZjy5m2SpLKPxhp4kt6rX`

### Commands to flip production to the new cluster
```bash
/home/lukas/.fly/bin/flyctl mpg status w86750824lj03pk4 --json

/home/lukas/.fly/bin/flyctl secrets set \
  DATABASE_URL='postgresql://fly-user:34jaZjy5m2SpLKPxhp4kt6rX@[fdaa:22:d57d:0:1::22]:5432/fly-db?sslmode=disable' \
  DIRECT_URL='postgresql://fly-user:34jaZjy5m2SpLKPxhp4kt6rX@[fdaa:22:d57d:0:1::22]:5432/fly-db?sslmode=disable' \
  -a heya-pos-api
```
