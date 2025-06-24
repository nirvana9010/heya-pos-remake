# Prisma Schema & Database Sync Guide

## 🚨 CRITICAL: Always Keep Schema and Database in Sync

When adding new fields or modifying the database schema, follow this workflow to prevent the "column does not exist" errors.

## Development Workflow

### 1. **Make Schema Changes**
Edit `apps/api/prisma/schema.prisma`:
```prisma
model Customer {
  // ... existing fields
  emailNotifications  Boolean  @default(true)  // New field
}
```

### 2. **Create and Apply Migration**
```bash
cd apps/api
npx prisma migrate dev --name add_email_notifications

# This automatically:
# ✅ Creates migration file in prisma/migrations/
# ✅ Applies migration to database
# ✅ Regenerates Prisma Client
# ✅ Updates your TypeScript types
```

### 3. **Verify Changes**
```bash
# Check migration was applied
npx prisma migrate status

# Optional: Open Prisma Studio to visually verify
npm run prisma:studio
```

## Production Deployment Workflow

### Before Deploying to Production:

1. **Ensure all migrations are committed**:
   ```bash
   git add prisma/migrations/
   git commit -m "Add email notifications migration"
   ```

2. **On production server** (Railway/Vercel):
   - Set environment variable: `DATABASE_URL`
   - Run during deployment: `npx prisma migrate deploy`

## Common Scenarios

### Adding a New Field
```bash
# 1. Edit schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_field_name

# 3. If TypeScript complains, restart TS server
# In VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Modifying Existing Field
```bash
# CAREFUL: Can cause data loss
npx prisma migrate dev --name modify_field_name

# Review the generated SQL before confirming!
```

### Quick Development Changes (Use Sparingly)
```bash
# For rapid prototyping only - NOT for production
npx prisma db push

# This syncs schema to DB without creating migration files
# ⚠️ Can cause data loss and doesn't track changes
```

## Troubleshooting

### "Column does not exist" Error
```bash
# You probably forgot to run migrations
cd apps/api
npx prisma migrate dev
```

### "Migration failed to apply"
```bash
# Check migration status
npx prisma migrate status

# Reset if needed (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

### Out of Sync After Git Pull
```bash
# Other devs added migrations
cd apps/api
npx prisma migrate dev
```

## Team Development Best Practices

1. **Always commit migration files**
   - Located in `prisma/migrations/`
   - These track schema history

2. **Communicate schema changes**
   - Notify team when adding migrations
   - Document why changes were made

3. **Use descriptive migration names**
   ```bash
   # Good
   npx prisma migrate dev --name add_customer_email_preferences
   
   # Bad
   npx prisma migrate dev --name update
   ```

4. **Review migrations before applying**
   - Check generated SQL
   - Ensure no unexpected data loss

## Pre-commit Checklist

- [ ] Schema changes made in `schema.prisma`
- [ ] Migration created with `prisma migrate dev`
- [ ] Migration files added to git
- [ ] Tested locally with new schema
- [ ] Deployment scripts updated if needed

## npm Scripts Available

```bash
# In apps/api directory:
npm run prisma:generate  # Regenerate client only
npm run prisma:migrate   # Create and apply migrations
npm run prisma:studio    # Visual database browser
npm run prisma:reset     # ⚠️ Reset database completely
```

## Environment-Specific Notes

### Local Development
- Uses `.env` or `.env.development`
- Migrations applied automatically with `migrate dev`

### Staging/Production
- Uses environment variables from hosting platform
- Run `npx prisma migrate deploy` (not `dev`)
- Never use `db push` in production

## Example: Complete Feature Addition

```bash
# 1. Plan your schema change
# "I need to add SMS preferences to Customer"

# 2. Edit schema
# In schema.prisma, add:
# smsNotifications Boolean @default(true)

# 3. Create migration
cd apps/api
npx prisma migrate dev --name add_customer_sms_preferences

# 4. Update your code to use new field
# TypeScript will now know about customer.smsNotifications

# 5. Test thoroughly
npm run test

# 6. Commit everything
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: Add SMS notification preferences to customers"

# 7. Deploy (migrations run automatically if configured)
git push
```

## Red Flags 🚩

- Manually editing migration files
- Using `db push` in production
- Forgetting to commit migration files
- Not running migrations after git pull
- Schema changes without migrations

Remember: **The schema.prisma file is the source of truth, but it means nothing without migrations to sync the database!**