# 🚨 PRODUCTION MIGRATION TODO 🚨

## Current MVP Setup (NOT FOR PRODUCTION)
The Dockerfile currently runs migrations on every startup:
```dockerfile
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:prod"]
```

## Before Going to Production, You MUST:

### 1. Remove Auto-Migration from Dockerfile
```dockerfile
# Change back to:
CMD ["npm", "run", "start:prod"]
```

### 2. Set Up Proper Migration Strategy
- Use `prisma migrate` instead of `prisma db push`
- Create migration files: `npx prisma migrate dev --name init`
- Deploy migrations separately: `npx prisma migrate deploy`
- NEVER use `--accept-data-loss` in production

### 3. Implement Migration Pipeline
Options:
- **Release Phase**: Add migration step in Railway/Vercel release phase
- **CI/CD**: Run migrations in GitHub Actions before deployment
- **Separate Job**: Create a one-off migration job/task

### 4. Database Backup Strategy
- Set up automated backups in Supabase
- Test restore procedures
- Document rollback process

### 5. Connection Pool Configuration
- Use separate URLs for migrations (direct) vs app (pooled)
- Configure connection limits properly
- Monitor connection usage

## Example Production Setup

### Railway.json (Production)
```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "releaseCommand": "cd apps/api && npx prisma migrate deploy"
  }
}
```

### Environment Variables (Production)
```bash
# Pooled for app
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct for migrations only
DIRECT_URL="postgresql://...supabase.co:5432/postgres"
```

## Red Flags That You're Still on MVP Config
- [ ] Dockerfile contains `prisma db push`
- [ ] Using `--accept-data-loss` anywhere
- [ ] No migration files in `prisma/migrations/`
- [ ] No backup strategy documented
- [ ] Same DATABASE_URL for both app and migrations

---

**Created**: 2025-06-08
**Status**: Using MVP configuration
**Priority**: CRITICAL before production launch